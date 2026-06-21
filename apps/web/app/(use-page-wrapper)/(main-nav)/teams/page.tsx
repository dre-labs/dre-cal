import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { prisma } from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShellMainAppDir } from "../ShellMainAppDir";

const Page = async ({ searchParams }: PageProps) => {
  const t = await getTranslate();
  const params = await searchParams;
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const memberships = await prisma.membership.findMany({
    where: {
      userId: session.user.id,
      accepted: true,
      team: {
        isOrganization: false,
      },
    },
    orderBy: {
      team: {
        name: "asc",
      },
    },
    select: {
      role: true,
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          eventTypes: {
            select: {
              id: true,
            },
          },
          members: {
            where: {
              accepted: true,
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <ShellMainAppDir heading={t("dre_teams")} subtitle={t("dre_teams_subtitle")}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="border-subtle bg-default rounded-md border">
          <div className="border-subtle border-b p-5">
            <h2 className="text-emphasis text-base font-semibold">{t("dre_existing_teams")}</h2>
          </div>
          <div className="divide-subtle divide-y">
            {memberships.length ? (
              memberships.map((membership) => (
                <Link
                  key={membership.team.id}
                  href={`/teams/${membership.team.id}`}
                  className="hover:bg-subtle flex items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <h3 className="text-emphasis truncate text-sm font-semibold">{membership.team.name}</h3>
                    <p className="text-subtle truncate text-sm">/team/{membership.team.slug}</p>
                  </div>
                  <div className="text-subtle shrink-0 text-right text-sm">
                    <div>{membership.role}</div>
                    <div>
                      {membership.team.members.length} {t("members").toLowerCase()} ·{" "}
                      {membership.team.eventTypes.length} {t("event_types").toLowerCase()}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-5">
                <p className="text-default text-sm">{t("dre_no_teams")}</p>
              </div>
            )}
          </div>
        </section>

        <aside className="border-subtle bg-default rounded-md border p-5">
          <h2 className="text-emphasis text-base font-semibold">{t("dre_create_team")}</h2>
          <p className="text-subtle mt-1 text-sm">{t("dre_create_team_description")}</p>
          {success && <p className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</p>}
          {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <form action="/teams/create" method="post" className="mt-5 space-y-4">
            <label className="block">
              <span className="text-emphasis text-sm font-medium">{t("team_name")}</span>
              <input
                name="name"
                required
                className="border-subtle bg-default text-emphasis mt-2 block w-full rounded-md border px-3 py-2 text-sm"
                placeholder="DRE Labs"
              />
            </label>
            <label className="block">
              <span className="text-emphasis text-sm font-medium">{t("slug")}</span>
              <input
                name="slug"
                className="border-subtle bg-default text-emphasis mt-2 block w-full rounded-md border px-3 py-2 text-sm"
                placeholder="dre-labs"
              />
            </label>
            <button
              type="submit"
              className="bg-emphasis text-inverted hover:bg-emphasis/90 w-full rounded-md px-4 py-2 text-sm font-semibold">
              {t("create")}
            </button>
          </form>
        </aside>
      </div>
    </ShellMainAppDir>
  );
};

export const generateMetadata = async (): Promise<ReturnType<typeof _generateMetadata>> =>
  await _generateMetadata(
    (t) => t("dre_teams"),
    (t) => t("dre_teams_subtitle"),
    undefined,
    undefined,
    "/teams"
  );

export default Page;
