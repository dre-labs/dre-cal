import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole, UserPermissionRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { isSameOriginRequest } from "@lib/isSameOriginRequest";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { getOrgAutoAcceptEmailDomain, validateOrganizationCreationInput } from "../lib/organizationCreation";

const NEW_ORG_PATH = "/settings/organizations/new";

// See teams/actions.ts: request.url can resolve to https behind proxies, producing an
// https://localhost link the dev server can't serve. WEBAPP_URL fully determines the target.
const redirectTo = (path: string): NextResponse => NextResponse.redirect(new URL(path, WEBAPP_URL), 303);

const redirectWithMessage = (path: string, type: "error" | "success", message: string): NextResponse =>
  redirectTo(`${path}?${new URLSearchParams({ [type]: message }).toString()}`);

const formValue = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export const createOrganizationAction = async (request: Request): Promise<NextResponse> => {
  if (!isSameOriginRequest(request)) {
    return redirectWithMessage(NEW_ORG_PATH, "error", "That request could not be verified. Try again.");
  }

  const formData = await request.formData();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const user = session?.user;

  if (!user?.id) return redirectTo("/auth/login");

  // Re-checked here because the page-level gate does not protect the action itself.
  if (user.role !== UserPermissionRole.ADMIN) {
    return redirectWithMessage(
      "/settings/my-account/profile",
      "error",
      "Only instance admins can create an organization."
    );
  }

  const validation = validateOrganizationCreationInput({
    name: formValue(formData, "name"),
    requestedSlug: formValue(formData, "slug"),
  });

  if (!validation.ok) {
    return redirectWithMessage(NEW_ORG_PATH, "error", validation.message);
  }

  const { name, slug } = validation;

  try {
    await prisma.$transaction(async (tx) => {
      // Checked inside the transaction: a user may legitimately hold profiles in multiple
      // orgs upstream, so no DB constraint enforces our one-org-per-user rule.
      const existingProfile = await tx.profile.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });

      if (existingProfile) {
        throw new Error("ALREADY_IN_ORG");
      }

      const slugTaken = await tx.team.findFirst({
        where: { slug, parentId: null },
        select: { id: true },
      });

      if (slugTaken) {
        throw new Error("SLUG_TAKEN");
      }

      const creator = await tx.user.findUnique({
        where: { id: user.id },
        select: { username: true, email: true },
      });

      if (!creator?.username) {
        throw new Error("NO_USERNAME");
      }

      const organization = await tx.team.create({
        data: {
          name,
          slug,
          isOrganization: true,
          metadata: {},
          members: {
            create: {
              userId: user.id,
              accepted: true,
              role: MembershipRole.OWNER,
            },
          },
          organizationSettings: {
            create: {
              // isOrganizationVerified stays false so no one is auto-joined by email domain.
              orgAutoAcceptEmail: getOrgAutoAcceptEmailDomain(creator.email),
              isOrganizationConfigured: true,
              isOrganizationVerified: false,
            },
          },
        },
        select: { id: true },
      });

      // The Profile row is what makes the user "belong to" the org for session and page
      // lookups. User.organizationId is deprecated and must stay null: the public booking
      // page filters on `organization: null` and would 404 members whose column is set.
      await tx.profile.create({
        data: {
          uid: ProfileRepository.generateProfileUid(),
          userId: user.id,
          organizationId: organization.id,
          username: creator.username,
        },
      });
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    if (code === "ALREADY_IN_ORG") {
      return redirectWithMessage(NEW_ORG_PATH, "error", "You already belong to an organization.");
    }
    if (code === "SLUG_TAKEN") {
      return redirectWithMessage(NEW_ORG_PATH, "error", "That organization slug is already taken.");
    }
    if (code === "NO_USERNAME") {
      return redirectWithMessage(
        NEW_ORG_PATH,
        "error",
        "Set a username on your account before creating an organization."
      );
    }

    return redirectWithMessage(NEW_ORG_PATH, "error", "Unable to create the organization.");
  }

  revalidatePath("/settings/organizations/profile");

  // A full navigation re-runs the jwt callback, which resolves the newly created profile
  // and populates session.user.org, so the organization settings pages resolve immediately.
  // (Only true while NEXT_PUBLIC_ENABLE_PROFILE_SWITCHER is off, which is the default: when
  // enabled, the stale token upId wins and the user would need to sign in again.)
  return redirectWithMessage("/settings/organizations/profile", "success", "Organization created.");
};
