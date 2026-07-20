import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOrgProfileForUser } from "./enrichProfileWithOrganization";

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    findManyForUser: vi.fn(),
  },
}));

const findManyForUser = vi.mocked(ProfileRepository.findManyForUser);

const orgProfile = {
  id: 5,
  uid: "profile-uid",
  upId: "prof-profile-uid",
  userId: 42,
  username: "shawn",
  organizationId: 3,
  organization: {
    id: 3,
    name: "DRE Mortgage",
    slug: "dre-mortgage",
    logoUrl: "https://example.com/logo.png",
    bannerUrl: "https://example.com/banner.png",
    bio: "We do mortgages.",
    isPlatform: false,
    organizationSettings: { allowSEOIndexing: true },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOrgProfileForUser", () => {
  it("returns the organization profile for a user who belongs to one", async () => {
    findManyForUser.mockResolvedValue([orgProfile] as never);

    const result = await getOrgProfileForUser({ id: 42, profile: { organization: null } });

    expect(result?.organization.name).toBe("DRE Mortgage");
    expect(result?.organization.bannerUrl).toBe("https://example.com/banner.png");
    // Read by the page to decide SEO indexing; losing it would silently disable indexing
    expect(result?.organization.organizationSettings?.allowSEOIndexing).toBe(true);
  });

  it("returns null when the user has no profile in any organization", async () => {
    findManyForUser.mockResolvedValue([] as never);

    const result = await getOrgProfileForUser({ id: 42, profile: { organization: null } });

    expect(result).toBeNull();
  });

  it("ignores platform organizations", async () => {
    findManyForUser.mockResolvedValue([
      { ...orgProfile, organization: { ...orgProfile.organization, isPlatform: true } },
    ] as never);

    const result = await getOrgProfileForUser({ id: 42, profile: { organization: null } });

    expect(result).toBeNull();
  });

  it("skips the lookup when the profile already carries an organization", async () => {
    const result = await getOrgProfileForUser({ id: 42, profile: { organization: { id: 3 } } });

    expect(result).toBeNull();
    expect(findManyForUser).not.toHaveBeenCalled();
  });
});
