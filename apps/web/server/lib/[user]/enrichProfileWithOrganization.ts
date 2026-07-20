import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";

type UsersInOrgContextUser = { id: number; profile: { organization: unknown } };

/**
 * On this single-domain deployment the public page always resolves users without an org slug,
 * so the repository builds a personal profile with `organization: null` even for users who
 * belong to one, and the organization's branding never reaches the page.
 *
 * Must only be called after the caller's non-org-user guard: attaching an organization before
 * that guard flips the page to notFound for org members.
 */
export const getOrgProfileForUser = async <T extends UsersInOrgContextUser>(user: T) => {
  if (user.profile.organization) return null;

  const profiles = await ProfileRepository.findManyForUser({ id: user.id });
  // A slugless organization makes the page render as "unpublished", so leave those users
  // unenriched: losing the branding is better than hiding their booking page.
  const orgProfile = profiles.find(
    (profile) => !profile.organization.isPlatform && !!profile.organization.slug
  );

  return orgProfile ?? null;
};
