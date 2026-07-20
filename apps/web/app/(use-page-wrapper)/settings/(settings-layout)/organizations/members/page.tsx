import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { canManageMember } from "../../../../(main-nav)/teams/lib/teamMemberManagement";
import { getCurrentOrganizationId } from "../lib/getCurrentOrganization";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_members_description"),
    undefined,
    undefined,
    "/settings/organizations/members"
  );

const Page = async ({ searchParams }: PageProps) => {
  const t = await getTranslate();
  const params = await searchParams;
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login?callbackUrl=/settings/organizations/members");
  }

  const organizationId = await getCurrentOrganizationId({
    user: session.user,
    userId: session.user.id,
  });
  if (!organizationId) {
    return notFound();
  }

  const organization = await prisma.team.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      members: {
        where: { accepted: true },
        orderBy: { id: "asc" },
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
            },
          },
        },
      },
    },
  });

  const actorMembership = organization?.members.find((member) => member.user.id === session.user.id);
  const isOrgAdmin =
    actorMembership?.role === MembershipRole.ADMIN || actorMembership?.role === MembershipRole.OWNER;

  if (!organization || !actorMembership || !isOrgAdmin) {
    return notFound();
  }

  const ownerCount = organization.members.filter((member) => member.role === MembershipRole.OWNER).length;

  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <SettingsHeader
      title={t("organization_members")}
      description={t("organization_members_description")}
      borderInShellHeader={true}>
      <div className="border-subtle bg-default space-y-6 rounded-b-lg border border-t-0 p-6">
        {success && <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</p>}
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <section>
          <h3 className="text-emphasis text-sm font-semibold">{t("add_organization_member")}</h3>
          <p className="text-subtle mt-1 text-sm">{t("add_organization_member_description")}</p>
          <form
            action="/settings/organizations/members/add"
            method="post"
            className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              name="email"
              required
              placeholder="teammate@example.com"
              className="border-subtle bg-default text-emphasis w-full rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="bg-emphasis text-inverted hover:bg-emphasis/90 shrink-0 rounded-md px-4 py-2 text-sm font-semibold">
              {t("add")}
            </button>
          </form>
        </section>

        <section>
          <h3 className="text-emphasis text-sm font-semibold">{t("members")}</h3>
          <ul className="divide-subtle border-subtle mt-3 divide-y rounded-md border">
            {organization.members.map((member) => {
              const isRemovable = canManageMember({
                actorRole: actorMembership.role,
                actorUserId: session.user.id,
                target: { userId: member.user.id, role: member.role },
                ownerCount,
              });

              return (
                <li key={member.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-emphasis truncate text-sm font-medium">
                      {member.user.name || member.user.username || member.user.email}
                    </p>
                    <p className="text-subtle truncate text-sm">{member.user.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-subtle text-sm">{member.role}</span>
                    {isRemovable && (
                      <form action="/settings/organizations/members/remove" method="post">
                        <input type="hidden" name="membershipId" value={member.id} />
                        <button
                          type="submit"
                          className="border-subtle text-emphasis hover:bg-subtle rounded-md border px-3 py-1.5 text-sm">
                          {t("remove")}
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </SettingsHeader>
  );
};

export default Page;
