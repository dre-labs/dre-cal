import prisma from "@calcom/prisma";

type SessionOrganizationSource = {
  profile?: { organizationId?: number | null } | null;
  org?: { id?: number | null } | null;
};

/**
 * Resolves the organization the signed-in user belongs to.
 *
 * The session is only a fast path. The JWT does not carry the organization on the first
 * request after the user creates one or is added to one, so pages that trusted the session
 * alone returned a 404 on exactly the navigation that follows those actions. The Profile
 * row is the source of truth, so fall back to it whenever the session has nothing.
 */
export const getCurrentOrganizationId = async ({
  user,
  userId,
}: {
  user: SessionOrganizationSource;
  userId: number;
}): Promise<number | null> => {
  const fromSession = user.profile?.organizationId ?? user.org?.id ?? null;
  if (fromSession) return fromSession;

  const profile = await prisma.profile.findFirst({
    where: {
      userId,
      organization: { isOrganization: true },
    },
    select: { organizationId: true },
  });

  return profile?.organizationId ?? null;
};
