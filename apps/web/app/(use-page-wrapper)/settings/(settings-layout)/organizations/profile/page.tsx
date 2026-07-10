import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { OrganizationProfileForm } from "./OrganizationProfileForm";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_profile"),
    (t) => t("organization_profile_description"),
    undefined,
    undefined,
    "/settings/organizations/profile"
  );

const Page = async () => {
  const t = await getTranslate();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login?callbackUrl=/settings/organizations/profile");
  }

  const organizationId = session.user.profile?.organizationId ?? session.user.org?.id ?? null;
  if (!organizationId) {
    return notFound();
  }

  const organization = await prisma.team.findUnique({
    where: {
      id: organizationId,
    },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      bio: true,
      bannerUrl: true,
      members: {
        where: {
          userId: session.user.id,
          accepted: true,
          role: {
            in: [MembershipRole.ADMIN, MembershipRole.OWNER],
          },
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!organization?.members.length) {
    return notFound();
  }

  return (
    <SettingsHeader
      title={t("organization_profile")}
      description={t("organization_profile_description")}
      borderInShellHeader={true}>
      <OrganizationProfileForm
        organization={{
          id: organization.id,
          name: organization.name,
          logoUrl: organization.logoUrl,
          bio: organization.bio,
          bannerUrl: organization.bannerUrl,
        }}
      />
    </SettingsHeader>
  );
};

export default Page;
