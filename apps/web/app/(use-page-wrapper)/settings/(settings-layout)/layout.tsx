import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentOrganizationId } from "./organizations/lib/getCurrentOrganization";
import type { SettingsLayoutProps } from "./SettingsLayoutAppDirClient";
import SettingsLayoutAppDirClient from "./SettingsLayoutAppDirClient";

export default async function SettingsLayoutAppDir(props: SettingsLayoutProps) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  if (!userId) {
    return redirect("/auth/login");
  }

  const organizationId = await getCurrentOrganizationId({ user: session.user, userId });
  const organization = organizationId
    ? await prisma.team.findUnique({
        where: {
          id: organizationId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          members: {
            where: {
              userId,
              accepted: true,
            },
            select: {
              role: true,
            },
            take: 1,
          },
        },
      })
    : null;
  const membershipRole = organization?.members[0]?.role;
  const canUpdateOrganization =
    membershipRole === MembershipRole.ADMIN || membershipRole === MembershipRole.OWNER;

  return (
    <SettingsLayoutAppDirClient
      {...props}
      teamFeatures={{}}
      orgBranding={
        organization
          ? {
              id: organization.id,
              name: organization.name,
              slug: organization.slug ?? undefined,
              logoUrl: organization.logoUrl,
            }
          : null
      }
      permissions={{
        canViewRoles: false,
        canViewOrganizationBilling: false,
        canUpdateOrganization,
      }}
    />
  );
}
