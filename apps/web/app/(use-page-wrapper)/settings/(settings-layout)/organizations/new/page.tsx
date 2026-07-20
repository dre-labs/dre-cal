import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import prisma from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_organization"),
    (t) => t("create_organization_description"),
    undefined,
    undefined,
    "/settings/organizations/new"
  );

const Page = async ({ searchParams }: PageProps) => {
  const t = await getTranslate();
  const params = await searchParams;
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login?callbackUrl=/settings/organizations/new");
  }

  if (session.user.role !== UserPermissionRole.ADMIN) {
    return notFound();
  }

  const existingProfile = await prisma.profile.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });

  if (existingProfile) {
    return redirect("/settings/organizations/profile");
  }

  const error = typeof params.error === "string" ? params.error : null;

  return (
    <SettingsHeader
      title={t("create_organization")}
      description={t("create_organization_description")}
      borderInShellHeader={true}>
      <div className="border-subtle bg-default rounded-b-lg border border-t-0 p-6">
        {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form action="/settings/organizations/new/create" method="post" className="space-y-4">
          <label className="block">
            <span className="text-emphasis text-sm font-medium">{t("organization_name")}</span>
            <input
              name="name"
              required
              maxLength={100}
              className="border-subtle bg-default text-emphasis mt-2 block w-full rounded-md border px-3 py-2 text-sm"
              placeholder="DRE Mortgage"
            />
          </label>
          <label className="block">
            <span className="text-emphasis text-sm font-medium">{t("slug")}</span>
            <input
              name="slug"
              className="border-subtle bg-default text-emphasis mt-2 block w-full rounded-md border px-3 py-2 text-sm"
              placeholder="dre-mortgage"
            />
            <span className="text-subtle mt-1 block text-sm">{t("organization_slug_description")}</span>
          </label>
          <button
            type="submit"
            className="bg-emphasis text-inverted hover:bg-emphasis/90 rounded-md px-4 py-2 text-sm font-semibold">
            {t("create")}
          </button>
        </form>
      </div>
    </SettingsHeader>
  );
};

export default Page;
