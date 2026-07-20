"use server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { uploadLogo } from "@calcom/lib/server/avatar";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { getCurrentOrganizationId } from "../lib/getCurrentOrganization";

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

const storeImageIfUploaded = async ({
  teamId,
  value,
  isBanner,
}: {
  teamId: number;
  value: string | null;
  isBanner: boolean;
}): Promise<string | null> => {
  const image = normalizeOptionalText(value);
  if (!image) return null;
  // Anything that isn't a fresh upload is already a stored URL.
  if (!image.startsWith("data:image/")) return image;

  return await uploadLogo({ teamId, logo: image, isBanner });
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

    const organizationId = await getCurrentOrganizationId({
      user: session.user,
      userId: session.user.id,
    });
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

    // The form sends freshly picked images as base64 data URLs. Storing those directly would
    // put megabytes in the Team row and ship them again on every page that reads the branding,
    // so hand them to the avatar store and keep only its short URL.
    const [logoUrl, bannerUrl] = await Promise.all([
      storeImageIfUploaded({ teamId: organizationId, value: input.logoUrl, isBanner: false }),
      storeImageIfUploaded({ teamId: organizationId, value: input.bannerUrl, isBanner: true }),
    ]);

    const organization = await prisma.team.update({
      where: {
        id: organizationId,
      },
      data: {
        name: input.name,
        logoUrl,
        bio: normalizeOptionalText(input.bio),
        bannerUrl,
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
