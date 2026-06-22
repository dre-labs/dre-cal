"use server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import type {
  CreateOnboardingTeamInput,
  CreateOnboardingTeamResult,
} from "~/onboarding/teams/details/team-details.types";

export const createOnboardingTeam = async (
  input: CreateOnboardingTeamInput
): Promise<CreateOnboardingTeamResult> => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  if (!userId) {
    return { status: "error", code: "unauthorized" };
  }

  const name = input.name.trim();
  const slug = slugify(input.slug?.trim() || name);
  if (!name || !slug) {
    return { status: "error", code: "missing_fields" };
  }

  try {
    const existingTeam = await prisma.team.findFirst({
      where: { slug, parentId: null },
      select: { id: true },
    });
    if (existingTeam) {
      return { status: "error", code: "slug_taken" };
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
      select: { id: true, slug: true },
    });

    revalidatePath("/teams");
    revalidatePath("/event-types");

    return { status: "success", teamId: team.id, slug: team.slug ?? slug };
  } catch (error) {
    console.error("Failed to create team during onboarding", error);
    return { status: "error", code: "unknown" };
  }
};
