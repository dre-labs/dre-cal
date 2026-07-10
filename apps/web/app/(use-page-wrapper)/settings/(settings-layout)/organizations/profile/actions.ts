"use server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { z } from "zod";

const organizationProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  logoUrl: z.string().nullable(),
  bio: z.string().trim().max(1000).nullable(),
  bannerUrl: z.string().nullable(),
});

export type OrganizationProfileFormValues = z.infer<typeof organizationProfileSchema>;

export type OrganizationProfileActionResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
    };

const normalizeOptionalText = (value: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export async function updateOrganizationProfile(
  values: OrganizationProfileFormValues
): Promise<OrganizationProfileActionResult> {
  try {
    const input = organizationProfileSchema.parse(values);
    const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

    if (!session?.user?.id) {
      throw new ErrorWithCode(ErrorCode.Unauthorized, "Not signed in");
    }

    const organizationId = session.user.profile?.organizationId ?? session.user.org?.id ?? null;
    if (!organizationId) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Organization not found");
    }

    const membership = await prisma.membership.findFirst({
      where: {
        teamId: organizationId,
        userId: session.user.id,
        accepted: true,
        role: {
          in: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "You do not have permission to update this organization");
    }

    const organization = await prisma.team.update({
      where: {
        id: organizationId,
      },
      data: {
        name: input.name,
        logoUrl: normalizeOptionalText(input.logoUrl),
        bio: normalizeOptionalText(input.bio),
        bannerUrl: normalizeOptionalText(input.bannerUrl),
      },
      select: {
        slug: true,
      },
    });

    revalidatePath("/settings/organizations/profile");
    if (organization.slug) {
      revalidatePath(`/${organization.slug}`);
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, message: "Please check the organization profile fields and try again." };
    }

    if (error instanceof ErrorWithCode) {
      return { ok: false, message: error.message || "Unable to update organization profile." };
    }

    return { ok: false, message: "Unable to update organization profile." };
  }
}
