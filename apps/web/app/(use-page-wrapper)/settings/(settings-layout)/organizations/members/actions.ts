import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { isSameOriginRequest } from "@lib/isSameOriginRequest";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { assertCanManageMember } from "../../../../(main-nav)/teams/lib/teamMemberManagement";
import { getCurrentOrganizationId } from "../lib/getCurrentOrganization";

const MEMBERS_PATH = "/settings/organizations/members";

// See teams/actions.ts: request.url can resolve to https behind proxies, producing an
// https://localhost link the dev server can't serve. WEBAPP_URL fully determines the target.
const redirectTo = (path: string): NextResponse => NextResponse.redirect(new URL(path, WEBAPP_URL), 303);

const redirectWithMessage = (type: "error" | "success", message: string): NextResponse =>
  redirectTo(`${MEMBERS_PATH}?${new URLSearchParams({ [type]: message }).toString()}`);

const formValue = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const formNumber = (formData: FormData, key: string): number | null => {
  const value = Number(formValue(formData, key));
  return Number.isFinite(value) && value > 0 ? value : null;
};

const countOrgOwners = (organizationId: number, client: typeof prisma | Prisma.TransactionClient = prisma) =>
  client.membership.count({
    where: { teamId: organizationId, role: MembershipRole.OWNER, accepted: true },
  });

type OrgAdminContext = {
  userId: number;
  organizationId: number;
  organizationName: string;
  role: MembershipRole;
};

// Every action re-resolves and re-authorizes the actor: the page-level gate does not
// protect the action endpoints.
const requireOrgAdmin = async (): Promise<OrgAdminContext | null> => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  if (!userId) return null;

  const organizationId = await getCurrentOrganizationId({ user: session.user, userId });
  if (!organizationId) return null;

  const membership = await prisma.membership.findFirst({
    where: {
      teamId: organizationId,
      userId,
      accepted: true,
      role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
    },
    select: {
      role: true,
      team: { select: { id: true, name: true } },
    },
  });

  if (!membership) return null;

  return {
    userId,
    organizationId: membership.team.id,
    organizationName: membership.team.name,
    role: membership.role,
  };
};

export const addOrganizationMemberAction = async (request: Request): Promise<NextResponse> => {
  if (!isSameOriginRequest(request)) {
    return redirectWithMessage("error", "That request could not be verified. Try again.");
  }

  const formData = await request.formData();
  const actor = await requireOrgAdmin();
  if (!actor) {
    return redirectTo("/settings/organizations/profile");
  }

  const email = formValue(formData, "email").toLowerCase();
  if (!email) {
    return redirectWithMessage("error", "Enter the email address of the person to add.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const invitee = await tx.user.findUnique({
        where: { email },
        select: { id: true, username: true },
      });

      if (!invitee) {
        throw new Error("NO_ACCOUNT");
      }
      if (!invitee.username) {
        throw new Error("NO_USERNAME");
      }

      // Checked inside the transaction: no DB constraint enforces our one-org-per-user rule.
      const existingProfile = await tx.profile.findFirst({
        where: { userId: invitee.id },
        select: { organizationId: true },
      });

      if (existingProfile) {
        throw new Error(
          existingProfile.organizationId === actor.organizationId ? "ALREADY_MEMBER" : "OTHER_ORG"
        );
      }

      await tx.membership.upsert({
        where: { userId_teamId: { userId: invitee.id, teamId: actor.organizationId } },
        update: { accepted: true, role: MembershipRole.MEMBER },
        create: {
          userId: invitee.id,
          teamId: actor.organizationId,
          accepted: true,
          role: MembershipRole.MEMBER,
        },
        select: { id: true },
      });

      // The Profile row is what attaches the user to the org. User.organizationId stays null:
      // the public booking page filters on it and would 404 this member's page.
      await tx.profile.create({
        data: {
          uid: ProfileRepository.generateProfileUid(),
          userId: invitee.id,
          organizationId: actor.organizationId,
          username: invitee.username,
        },
      });
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    if (code === "NO_ACCOUNT") {
      return redirectWithMessage(
        "error",
        `No account exists for ${email}. Invite them to a team first, then add them here.`
      );
    }
    if (code === "NO_USERNAME") {
      return redirectWithMessage("error", `${email} needs a username before joining the organization.`);
    }
    if (code === "ALREADY_MEMBER") {
      return redirectWithMessage("error", `${email} is already in this organization.`);
    }
    if (code === "OTHER_ORG") {
      return redirectWithMessage(
        "error",
        `${email} already belongs to another organization. Remove them there first.`
      );
    }

    return redirectWithMessage("error", "Unable to add that person to the organization.");
  }

  revalidatePath(MEMBERS_PATH);
  return redirectWithMessage("success", `${email} added to ${actor.organizationName}.`);
};

export const removeOrganizationMemberAction = async (request: Request): Promise<NextResponse> => {
  if (!isSameOriginRequest(request)) {
    return redirectWithMessage("error", "That request could not be verified. Try again.");
  }

  const formData = await request.formData();
  const actor = await requireOrgAdmin();
  if (!actor) {
    return redirectTo("/settings/organizations/profile");
  }

  const membershipId = formNumber(formData, "membershipId");
  if (!membershipId) {
    return redirectWithMessage("error", "Missing member.");
  }

  const target = await prisma.membership.findFirst({
    where: { id: membershipId, teamId: actor.organizationId },
    select: { id: true, userId: true, role: true },
  });

  if (!target) {
    return redirectWithMessage("error", "Member not found.");
  }

  const decision = assertCanManageMember({
    actorRole: actor.role,
    actorUserId: actor.userId,
    target,
    ownerCount: await countOrgOwners(actor.organizationId),
    intent: { type: "remove" },
  });

  if (!decision.allowed) {
    return redirectWithMessage("error", decision.reason ?? "You can't remove this member.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction so a race can't drop the last owner.
      if (target.role === MembershipRole.OWNER && (await countOrgOwners(actor.organizationId, tx)) <= 1) {
        throw new Error("LAST_OWNER");
      }

      // Deleting the Profile is safe for the member's event types: EventType.profileId is
      // ON DELETE SET NULL, so their events revert to personal rather than being deleted.
      await tx.profile.deleteMany({
        where: { userId: target.userId, organizationId: actor.organizationId },
      });
      await tx.membership.delete({ where: { id: target.id } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_OWNER") {
      return redirectWithMessage("error", "You can't remove the last owner of an organization.");
    }
    return redirectWithMessage("error", "Unable to remove that member.");
  }

  revalidatePath(MEMBERS_PATH);
  return redirectWithMessage("success", "Member removed from the organization.");
};
