import { randomBytes } from "node:crypto";
import { DailyLocationType } from "@calcom/app-store/constants";
import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getTranslation } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

const DEFAULT_EVENT_LOCATIONS: Prisma.InputJsonValue = [{ type: DailyLocationType }];

const TEAM_INVITE_EXPIRATION_MS = 1000 * 60 * 60 * 24 * 7;

type TeamAdminMembership = {
  id: number;
  role: MembershipRole;
  team: {
    id: number;
    slug: string | null;
    name: string;
  };
} | null;

const getCurrentUserId = async (): Promise<number | null> => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  return session?.user?.id ?? null;
};

const formValue = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim();
};

const formNumber = (formData: FormData, key: string): number | null => {
  const value = Number(formValue(formData, key));
  if (!Number.isFinite(value)) return null;
  return value;
};

const redirectTo = (request: Request, path: string): NextResponse => {
  return NextResponse.redirect(new URL(path, request.url), 303);
};

const redirectWithMessage = (
  request: Request,
  path: string,
  type: "error" | "success",
  message: string
): NextResponse => {
  const params = new URLSearchParams({ [type]: message });
  return redirectTo(request, `${path}?${params.toString()}`);
};

const requireTeamAdmin = async (teamId: number, userId: number): Promise<TeamAdminMembership> => {
  return await prisma.membership.findFirst({
    where: {
      teamId,
      userId,
      accepted: true,
      role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
    },
    select: {
      id: true,
      role: true,
      team: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });
};

// Emails a signup link carrying a team-scoped verification token to someone who
// doesn't have an account yet. We pre-create an invite stub user (no password,
// unverified) plus a pending membership holding the chosen role, so signing up
// through the link auto-joins the team with that role (createOrUpdateMemberships
// flips the membership to accepted and preserves the role). The invitee skips
// the team-creation onboarding step instead of being prompted to create a team.
// `invitedTo` must be set or the token-based signup handler rejects the stub.
const inviteNewTeamMemberByEmail = async ({
  email,
  teamId,
  teamName,
  role,
  inviterId,
}: {
  email: string;
  teamId: number;
  teamName: string;
  role: MembershipRole;
  inviterId: number;
}): Promise<void> => {
  const token = randomBytes(32).toString("hex");
  const [localPart] = email.split("@");
  const fallbackUsername = `${slugify(localPart) || "member"}-${randomBytes(4).toString("hex")}`;

  await prisma.$transaction(async (tx) => {
    const invitedUser = await tx.user.upsert({
      where: { email },
      update: { invitedTo: teamId },
      create: { email, username: fallbackUsername, invitedTo: teamId },
      select: { id: true },
    });

    await tx.membership.upsert({
      where: { userId_teamId: { userId: invitedUser.id, teamId } },
      update: { role },
      create: { userId: invitedUser.id, teamId, role, accepted: false },
      select: { id: true },
    });

    // Drop any prior invite tokens for this email + team so only the newest link works.
    await tx.verificationToken.deleteMany({ where: { identifier: email, teamId } });
    await tx.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + TEAM_INVITE_EXPIRATION_MS),
        team: {
          connect: { id: teamId },
        },
      },
      select: {
        id: true,
      },
    });
  });

  const inviter = await prisma.user.findUnique({
    where: { id: inviterId },
    select: {
      name: true,
      email: true,
    },
  });

  const translation = await getTranslation("en", "common");

  await sendTeamInviteEmail({
    language: translation,
    from: inviter?.name || inviter?.email || teamName,
    to: email,
    teamName,
    joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=teams`,
    isCalcomMember: false,
    isAutoJoin: false,
    isOrg: false,
    parentTeamName: undefined,
    isExistingUserMovedToOrg: false,
    prevLink: null,
    newLink: null,
  });
};

export const createTeamAction = async (request: Request): Promise<NextResponse> => {
  const formData = await request.formData();
  const userId = await getCurrentUserId();
  if (!userId) return redirectTo(request, "/auth/login");

  const name = formValue(formData, "name");
  const requestedSlug = formValue(formData, "slug");
  const slug = slugify(requestedSlug || name);

  if (!name || !slug) {
    return redirectWithMessage(request, "/teams", "error", "Team name and slug are required.");
  }

  const existingTeam = await prisma.team.findFirst({
    where: {
      slug,
      parentId: null,
    },
    select: {
      id: true,
    },
  });

  if (existingTeam) {
    return redirectWithMessage(request, "/teams", "error", "That team slug is already taken.");
  }

  const team = await prisma.team.create({
    data: {
      name,
      slug,
      isOrganization: false,
      metadata: {},
      members: {
        create: {
          userId,
          accepted: true,
          role: MembershipRole.OWNER,
        },
      },
    },
    select: {
      id: true,
    },
  });

  revalidatePath("/teams");
  revalidatePath("/event-types");
  return redirectTo(request, `/teams/${team.id}?success=${encodeURIComponent("Team created.")}`);
};

export const addTeamMemberAction = async (request: Request): Promise<NextResponse> => {
  const formData = await request.formData();
  const userId = await getCurrentUserId();
  if (!userId) return redirectTo(request, "/auth/login");

  const teamId = formNumber(formData, "teamId");
  if (!teamId) return redirectTo(request, "/teams");

  const path = `/teams/${teamId}`;
  const membership = await requireTeamAdmin(teamId, userId);
  if (!membership) {
    return redirectWithMessage(request, path, "error", "Only team owners and admins can add members.");
  }

  const email = formValue(formData, "email").toLowerCase();
  if (!email) {
    return redirectWithMessage(request, path, "error", "An email address is required.");
  }

  const roleValue = formValue(formData, "role");
  let role: MembershipRole = MembershipRole.MEMBER;
  if (roleValue === MembershipRole.ADMIN) {
    role = MembershipRole.ADMIN;
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      emailVerified: true,
      password: {
        select: {
          userId: true,
        },
      },
    },
  });

  // A "real" account has signed up (verified email or a password). Anyone else —
  // no account, or a prior invite stub that hasn't completed signup — gets an
  // email invite carrying the selected role. Real users are added immediately.
  const hasAccount = !!user && (!!user.emailVerified || !!user.password);
  if (!user || !hasAccount) {
    await inviteNewTeamMemberByEmail({
      email,
      teamId,
      teamName: membership.team.name,
      role,
      inviterId: userId,
    });
    return redirectWithMessage(request, path, "success", `Invitation sent to ${email}.`);
  }

  await prisma.membership.upsert({
    where: {
      userId_teamId: {
        userId: user.id,
        teamId,
      },
    },
    update: {
      accepted: true,
      role,
    },
    create: {
      userId: user.id,
      teamId,
      accepted: true,
      role,
    },
    select: {
      id: true,
    },
  });

  revalidatePath(path);
  revalidatePath("/event-types");
  return redirectWithMessage(request, path, "success", "Team member added.");
};

export const createTeamEventAction = async (request: Request): Promise<NextResponse> => {
  const formData = await request.formData();
  const userId = await getCurrentUserId();
  if (!userId) return redirectTo(request, "/auth/login");

  const teamId = formNumber(formData, "teamId");
  if (!teamId) return redirectTo(request, "/teams");

  const path = `/teams/${teamId}`;
  const membership = await requireTeamAdmin(teamId, userId);
  if (!membership) {
    return redirectWithMessage(request, path, "error", "Only team owners and admins can create team events.");
  }

  if (!membership.team.slug) {
    return redirectWithMessage(
      request,
      path,
      "error",
      "Team must have a public slug before events can be created."
    );
  }

  const title = formValue(formData, "title");
  const slug = slugify(formValue(formData, "slug") || title);
  const description = formValue(formData, "description");
  const length = formNumber(formData, "length") ?? 30;
  const hostIds = formData
    .getAll("hostUserIds")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (!title || !slug) {
    return redirectWithMessage(request, path, "error", "Event title and slug are required.");
  }

  if (length < 5 || length > 720) {
    return redirectWithMessage(request, path, "error", "Event duration must be between 5 and 720 minutes.");
  }

  if (hostIds.length === 0) {
    return redirectWithMessage(request, path, "error", "Choose at least one host.");
  }

  const existingEvent = await prisma.eventType.findFirst({
    where: {
      teamId,
      slug,
    },
    select: {
      id: true,
    },
  });

  if (existingEvent) {
    return redirectWithMessage(request, path, "error", "That event slug is already used by this team.");
  }

  const acceptedMembers = await prisma.membership.findMany({
    where: {
      teamId,
      userId: {
        in: hostIds,
      },
      accepted: true,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (acceptedMembers.length !== hostIds.length) {
    return redirectWithMessage(request, path, "error", "All selected hosts must be accepted team members.");
  }

  const memberIdByUserId = new Map(acceptedMembers.map((member) => [member.userId, member.id]));
  const eventType = await prisma.eventType.create({
    data: {
      title,
      slug,
      description,
      length,
      teamId,
      schedulingType: SchedulingType.COLLECTIVE,
      locations: DEFAULT_EVENT_LOCATIONS,
      hosts: {
        create: hostIds.map((hostUserId) => ({
          userId: hostUserId,
          memberId: memberIdByUserId.get(hostUserId),
          isFixed: true,
          priority: 2,
          weight: 100,
        })),
      },
      users: {
        connect: hostIds.map((hostUserId) => ({ id: hostUserId })),
      },
    },
    select: {
      id: true,
    },
  });

  revalidatePath(path);
  revalidatePath("/event-types");
  revalidatePath(`/team/${membership.team.slug}/${slug}`);
  return redirectTo(request, `/event-types/${eventType.id}?tabName=setup`);
};
