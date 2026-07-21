import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[acceptPendingMemberships]"] });

/**
 * Flips a user's outstanding team invites to accepted, preserving the role the inviter chose.
 *
 * Signing up through the emailed invite link accepts the membership inline, because the token
 * itself proves the person controls the invited address. Someone who signs up without the link
 * has proved nothing yet, so their memberships stay pending until they click the verification
 * email — which is the point at which this runs.
 *
 * `invitedTo` is deliberately left set: onboarding reads it to skip the create-a-team step for
 * people who were invited to one.
 */
export async function acceptPendingMemberships({ userId }: { userId: number }) {
  const { count } = await prisma.membership.updateMany({
    where: { userId, accepted: false },
    data: { accepted: true },
  });

  if (count > 0) {
    log.info("Accepted pending team invites on email verification", { userId, count });
  }

  return count;
}
