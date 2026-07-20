import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addOrganizationMemberAction, removeOrganizationMemberAction } from "./actions";

vi.mock("@calcom/features/auth/lib/getServerSession", () => ({ getServerSession: vi.fn() }));
vi.mock("@lib/buildLegacyCtx", () => ({ buildLegacyRequest: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: { generateProfileUid: () => "generated-uid" },
}));
vi.mock("@calcom/prisma", () => ({
  prisma: {
    membership: { findFirst: vi.fn(), count: vi.fn(), delete: vi.fn(), upsert: vi.fn() },
    profile: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const mockedSession = vi.mocked(getServerSession);
const mockedPrisma = vi.mocked(prisma, true);

const ORG_ID = 3;
const ACTOR_ID = 1;

const asSession = (overrides: Record<string, unknown> = {}) =>
  ({
    user: { id: ACTOR_ID, profile: { organizationId: ORG_ID }, org: { id: ORG_ID }, ...overrides },
  }) as never;

// The actions redirect on every outcome; the flash message carries the result.
const messageFrom = (response: { headers: Headers }) => {
  const location = new URL(response.headers.get("location") ?? "", "http://localhost");
  return location.searchParams.get("error") ?? location.searchParams.get("success") ?? "";
};

const formRequest = (fields: Record<string, string>, origin = "http://app.cal.local:3000"): Request => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return {
    formData: async () => formData,
    headers: new Headers(origin ? { origin } : {}),
  } as unknown as Request;
};

const asOrgAdmin = (role: MembershipRole = MembershipRole.OWNER) => {
  mockedSession.mockResolvedValue(asSession());
  mockedPrisma.membership.findFirst.mockResolvedValueOnce({
    role,
    team: { id: ORG_ID, name: "DRE Mortgage" },
  } as never);
};

// Runs the callback against the mocked prisma client so transaction bodies execute inline.
const transactionMock = mockedPrisma.$transaction as unknown as {
  mockImplementation: (fn: (callback: (tx: typeof prisma) => Promise<unknown>) => Promise<unknown>) => void;
};

const runTransactionInline = () => {
  transactionMock.mockImplementation(async (callback) => callback(mockedPrisma));
};

beforeEach(() => {
  vi.clearAllMocks();
  runTransactionInline();
});

describe("addOrganizationMemberAction", () => {
  it("adds an existing account as a member with a profile", async () => {
    asOrgAdmin();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 9, username: "teammate" } as never);
    mockedPrisma.profile.findFirst.mockResolvedValue(null as never);

    const response = await addOrganizationMemberAction(formRequest({ email: "teammate@example.com" }));

    expect(mockedPrisma.membership.upsert).toHaveBeenCalled();
    expect(mockedPrisma.profile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 9, organizationId: ORG_ID, username: "teammate" }),
      })
    );
    expect(messageFrom(response)).toContain("added to DRE Mortgage");
  });

  it("never writes the deprecated User.organizationId column", async () => {
    asOrgAdmin();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 9, username: "teammate" } as never);
    mockedPrisma.profile.findFirst.mockResolvedValue(null as never);

    await addOrganizationMemberAction(formRequest({ email: "teammate@example.com" }));

    // Writing that column would make the member's public booking page 404
    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });

  it("explains how to proceed when the person has no account", async () => {
    asOrgAdmin();
    mockedPrisma.user.findUnique.mockResolvedValue(null as never);

    const response = await addOrganizationMemberAction(formRequest({ email: "nobody@example.com" }));

    expect(messageFrom(response)).toContain("Invite them to a team first");
    expect(mockedPrisma.profile.create).not.toHaveBeenCalled();
  });

  it("rejects someone who already belongs to another organization", async () => {
    asOrgAdmin();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 9, username: "teammate" } as never);
    mockedPrisma.profile.findFirst.mockResolvedValue({ organizationId: 99 } as never);

    const response = await addOrganizationMemberAction(formRequest({ email: "teammate@example.com" }));

    expect(messageFrom(response)).toContain("already belongs to another organization");
    expect(mockedPrisma.profile.create).not.toHaveBeenCalled();
  });

  it("redirects away when the actor is not an organization admin", async () => {
    mockedSession.mockResolvedValue(asSession());
    mockedPrisma.membership.findFirst.mockResolvedValueOnce(null as never);

    const response = await addOrganizationMemberAction(formRequest({ email: "teammate@example.com" }));

    expect(response.headers.get("location")).toContain("/settings/organizations/profile");
    expect(mockedPrisma.profile.create).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin submission before touching the session", async () => {
    const response = await addOrganizationMemberAction(
      formRequest({ email: "attacker@evil.example.com" }, "https://evil.example.com")
    );

    expect(messageFrom(response)).toContain("could not be verified");
    expect(mockedSession).not.toHaveBeenCalled();
    expect(mockedPrisma.profile.create).not.toHaveBeenCalled();
  });
});

describe("removeOrganizationMemberAction", () => {
  it("removes the member's profile and membership", async () => {
    asOrgAdmin();
    mockedPrisma.membership.findFirst.mockResolvedValueOnce({
      id: 12,
      userId: 9,
      role: MembershipRole.MEMBER,
    } as never);
    mockedPrisma.membership.count.mockResolvedValue(1 as never);

    const response = await removeOrganizationMemberAction(formRequest({ membershipId: "12" }));

    expect(mockedPrisma.profile.deleteMany).toHaveBeenCalledWith({
      where: { userId: 9, organizationId: ORG_ID },
    });
    expect(mockedPrisma.membership.delete).toHaveBeenCalledWith({ where: { id: 12 } });
    expect(messageFrom(response)).toContain("removed");
  });

  it("refuses to remove the last owner", async () => {
    asOrgAdmin();
    mockedPrisma.membership.findFirst.mockResolvedValueOnce({
      id: 12,
      userId: 9,
      role: MembershipRole.OWNER,
    } as never);
    mockedPrisma.membership.count.mockResolvedValue(1 as never);

    const response = await removeOrganizationMemberAction(formRequest({ membershipId: "12" }));

    expect(messageFrom(response)).toContain("last owner");
    expect(mockedPrisma.membership.delete).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin submission before touching the session", async () => {
    const response = await removeOrganizationMemberAction(
      formRequest({ membershipId: "12" }, "https://evil.example.com")
    );

    expect(messageFrom(response)).toContain("could not be verified");
    expect(mockedSession).not.toHaveBeenCalled();
    expect(mockedPrisma.membership.delete).not.toHaveBeenCalled();
  });
});
