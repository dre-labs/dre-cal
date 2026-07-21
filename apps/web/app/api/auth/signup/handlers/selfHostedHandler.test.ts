import {
  prismaMock,
  resetPrismaMock,
} from "@calcom/features/auth/signup/handlers/__tests__/mocks/prisma.mocks";
import type { SignupBody } from "@calcom/features/auth/signup/handlers/__tests__/mocks/signup.factories";
import {
  createMockFoundToken,
  createMockTeam,
  createSignupBody,
} from "@calcom/features/auth/signup/handlers/__tests__/mocks/signup.factories";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindTokenByToken: Mock = vi.fn();
const mockValidateAndGetCorrectedUsernameForTeam: Mock = vi.fn();

vi.mock("next/server", async () => {
  const { createNextServerMock } = await import(
    "@calcom/features/auth/signup/handlers/__tests__/mocks/next.mocks"
  );
  return createNextServerMock();
});
vi.mock("@calcom/prisma", async () => {
  const { createPrismaMock } = await import(
    "@calcom/features/auth/signup/handlers/__tests__/mocks/prisma.mocks"
  );
  return createPrismaMock();
});
vi.mock("@calcom/prisma/client", async () => {
  const { createPrismaMock } = await import(
    "@calcom/features/auth/signup/handlers/__tests__/mocks/prisma.mocks"
  );
  return createPrismaMock();
});
vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() }) },
}));
vi.mock("@calcom/lib/auth/hashPassword", () => ({ hashPassword: vi.fn().mockResolvedValue("hashed") }));
vi.mock("@calcom/lib/slugify", () => ({ default: vi.fn((s: string) => s.toLowerCase()) }));
vi.mock("@calcom/lib/constants", () => ({ IS_PREMIUM_USERNAME_ENABLED: false }));
vi.mock("@calcom/lib/server/username", () => ({
  isUsernameReservedDueToMigration: vi.fn().mockResolvedValue(false),
}));
vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({ sendEmailVerification: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/createOrUpdateMemberships", () => ({
  createOrUpdateMemberships: vi.fn(),
}));
vi.mock("@calcom/features/auth/signup/utils/validateUsername", () => ({
  validateAndGetCorrectedUsernameAndEmail: vi.fn().mockResolvedValue({ isValid: true, username: "testuser" }),
}));
vi.mock("@calcom/features/auth/signup/utils/organization", () => ({ joinAnyChildTeamOnOrgInvite: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/prefillAvatar", () => ({ prefillAvatar: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/token", () => ({
  findTokenByToken: (...args: unknown[]) => mockFindTokenByToken(...args),
  throwIfTokenExpired: vi.fn(),
  validateAndGetCorrectedUsernameForTeam: (...args: unknown[]) =>
    mockValidateAndGetCorrectedUsernameForTeam(...args),
}));

// Import after mocks
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { runP2002TestSuite } from "@calcom/features/auth/signup/handlers/__tests__/p2002.test-suite";
import handler from "./selfHostedHandler";

function callHandler(body: SignupBody): ReturnType<typeof handler> {
  return handler(body as unknown as Record<string, string>);
}

runP2002TestSuite("selfHostedHandler", callHandler, () => {
  vi.clearAllMocks();
  resetPrismaMock();
  mockFindTokenByToken.mockResolvedValue(createMockFoundToken());
  mockValidateAndGetCorrectedUsernameForTeam.mockResolvedValue("testuser");
  prismaMock.team.findUnique.mockResolvedValue(createMockTeam() as never);
  prismaMock.verificationToken.delete.mockResolvedValue({} as never);
});

describe("selfHostedHandler – tokenless signup for an invited email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPrismaMock();
  });

  it("claims the invite stub instead of colliding on the email", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 7, invitedTo: 1 } as never);
    prismaMock.user.update.mockResolvedValue({ id: 7 } as never);

    const response = await callHandler(createSignupBody({ email: "invited@example.com" }));

    expect(response.status).toBe(201);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
  });

  it("provisions the default availability the stub never got", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 7, invitedTo: 1 } as never);
    prismaMock.user.update.mockResolvedValue({ id: 7 } as never);
    prismaMock.schedule.findFirst.mockResolvedValue(null as never);

    await callHandler(createSignupBody({ email: "invited@example.com" }));

    expect(prismaMock.schedule.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 7 }) })
    );
  });

  it("leaves the membership pending — it is accepted on email verification", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 7, invitedTo: 1 } as never);
    prismaMock.user.update.mockResolvedValue({ id: 7 } as never);

    await callHandler(createSignupBody({ email: "invited@example.com" }));

    expect(prismaMock.membership.updateMany).not.toHaveBeenCalled();
    expect(sendEmailVerification).toHaveBeenCalledWith(
      expect.objectContaining({ email: "invited@example.com" })
    );
  });

  it("still creates a fresh user when no invite exists", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null as never);
    prismaMock.user.create.mockResolvedValue({ id: 9 } as never);

    const response = await callHandler(createSignupBody());

    expect(response.status).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
