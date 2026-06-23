import { MembershipRole } from "@calcom/prisma/enums";

export type ManageMemberIntent = { type: "setRole"; newRole: MembershipRole } | { type: "remove" };

export interface ManageMemberTarget {
  userId: number;
  role: MembershipRole;
}

export interface AssertCanManageMemberArgs {
  actorRole: MembershipRole;
  actorUserId: number;
  target: ManageMemberTarget;
  ownerCount: number;
  intent: ManageMemberIntent;
}

export interface ManageMemberDecision {
  allowed: boolean;
  reason?: string;
}

const deny = (reason: string): ManageMemberDecision => ({ allowed: false, reason });

// Roles an actor is permitted to assign. Admins can promote/demote between member and
// admin; only owners can grant ownership.
export const getAssignableRoles = (actorRole: MembershipRole): MembershipRole[] =>
  actorRole === MembershipRole.OWNER
    ? [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER]
    : [MembershipRole.MEMBER, MembershipRole.ADMIN];

// Whether the actor can take any management action on this row. Used to decide which
// UI controls to render; the server still authorizes each action via assertCanManageMember.
export const canManageMember = ({
  actorRole,
  actorUserId,
  target,
  ownerCount,
}: Omit<AssertCanManageMemberArgs, "intent">): boolean => {
  if (target.userId === actorUserId) return false;
  // Owners are protected from admins, and the last owner can't be touched at all.
  if (target.role === MembershipRole.OWNER) {
    return actorRole === MembershipRole.OWNER && ownerCount > 1;
  }
  return true;
};

export const assertCanManageMember = ({
  actorRole,
  actorUserId,
  target,
  ownerCount,
  intent,
}: AssertCanManageMemberArgs): ManageMemberDecision => {
  if (actorRole !== MembershipRole.OWNER && actorRole !== MembershipRole.ADMIN) {
    return deny("Only team owners and admins can manage members.");
  }
  if (target.userId === actorUserId) {
    return deny("You can't change your own membership here.");
  }
  // Admins may manage members and other admins, but never owners.
  if (target.role === MembershipRole.OWNER && actorRole !== MembershipRole.OWNER) {
    return deny("Only an owner can modify another owner.");
  }

  if (intent.type === "setRole") {
    if (!getAssignableRoles(actorRole).includes(intent.newRole)) {
      return deny("You can't assign that role.");
    }
    // Never demote the last remaining owner.
    if (target.role === MembershipRole.OWNER && intent.newRole !== MembershipRole.OWNER && ownerCount <= 1) {
      return deny("A team must always have at least one owner.");
    }
    return { allowed: true };
  }

  // remove
  if (target.role === MembershipRole.OWNER && ownerCount <= 1) {
    return deny("You can't remove the last owner of a team.");
  }
  return { allowed: true };
};
