import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShellMainAppDir } from "../../ShellMainAppDir";

const Page = async ({ params, searchParams }: PageProps) => {
  const t = await getTranslate();
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const teamId = Number(resolvedParams.id);

  if (!Number.isInteger(teamId)) {
    return notFound();
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const membership = await prisma.membership.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      accepted: true,
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    return notFound();
  }

  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      members: {
        where: {
          accepted: true,
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
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
      eventTypes: {
        orderBy: {
          title: "asc",
        },
        select: {
          id: true,
          title: true,
          slug: true,
          length: true,
          hosts: {
            select: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!team?.slug) {
    return notFound();
  }

  const canAdmin = membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER;
  const success = typeof resolvedSearchParams.success === "string" ? resolvedSearchParams.success : null;
  const error = typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const teamUrl = `${WEBAPP_URL}/team/${team.slug}`;

  return (
    <ShellMainAppDir
      heading={team.name}
      subtitle={teamUrl}
      backPath="/teams"
      actions={
        <Link className="text-emphasis text-sm font-medium underline" href="/event-types">
          {t("event_types")}
        </Link>
      }>
      <div className="space-y-6">
        {success && <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</p>}
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <section className="border-subtle bg-default rounded-md border p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-emphasis text-base font-semibold">{t("dre_team_booking_links")}</h2>
              <p className="text-subtle mt-1 text-sm">{t("dre_team_booking_links_description")}</p>
            </div>
            <Link className="text-emphasis text-sm font-medium underline" href={`/team/${team.slug}`}>
              /team/{team.slug}
            </Link>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="border-subtle bg-default rounded-md border">
            <div className="border-subtle border-b p-5">
              <h2 className="text-emphasis text-base font-semibold">{t("dre_collective_events")}</h2>
            </div>
            <div className="divide-subtle divide-y">
              {team.eventTypes.length ? (
                team.eventTypes.map((eventType) => (
                  <div key={eventType.id} className="flex items-center justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <Link
                        href={`/team/${team.slug}/${eventType.slug}`}
                        className="text-emphasis truncate text-sm font-semibold underline">
                        {eventType.title}
                      </Link>
                      <p className="text-subtle truncate text-sm">
                        {eventType.length} {t("minutes").toLowerCase()} ·{" "}
                        {eventType.hosts.map((host) => host.user.name || host.user.email).join(", ")}
                      </p>
                    </div>
                    <Link
                      href={`/event-types/${eventType.id}?tabName=setup`}
                      className="text-emphasis shrink-0 text-sm font-medium underline">
                      {t("edit")}
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-5">
                  <p className="text-default text-sm">{t("dre_no_collective_events")}</p>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            {canAdmin && (
              <section className="border-subtle bg-default rounded-md border p-5">
                <h2 className="text-emphasis text-base font-semibold">{t("dre_create_collective_event")}</h2>
                <p className="text-subtle mt-1 text-sm">{t("dre_collective_event_description")}</p>
                <form action={`/teams/${team.id}/events`} method="post" className="mt-5 space-y-4">
                  <input type="hidden" name="teamId" value={team.id} />
                  <label className="block">
                    <span className="text-emphasis text-sm font-medium">{t("title")}</span>
                    <input
                      name="title"
                      required
                      className="border-subtle bg-default text-emphasis mt-2 block w-full rounded-md border px-3 py-2 text-sm"
                      placeholder={t("quick_chat")}
                    />
                  </label>
                  <label className="block">
                    <span className="text-emphasis text-sm font-medium">{t("slug")}</span>
                    <input
                      name="slug"
                      className="border-subtle bg-default text-emphasis mt-2 block w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="co-founder-sync"
                    />
                  </label>
                  <label className="block">
                    <span className="text-emphasis text-sm font-medium">{t("description")}</span>
                    <textarea
                      name="description"
                      className="border-subtle bg-default text-emphasis mt-2 block w-full rounded-md border px-3 py-2 text-sm"
                      rows={3}
                    />
                  </label>
                  <label className="block">
                    <span className="text-emphasis text-sm font-medium">{t("duration")}</span>
                    <input
                      name="length"
                      type="number"
                      min={5}
                      max={720}
                      defaultValue={30}
                      required
                      className="border-subtle bg-default text-emphasis mt-2 block w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </label>
                  <fieldset>
                    <legend className="text-emphasis text-sm font-medium">{t("hosts")}</legend>
                    <div className="mt-2 space-y-2">
                      {team.members.map((member) => (
                        <label key={member.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="hostUserIds"
                            value={member.user.id}
                            defaultChecked
                            className="h-4 w-4"
                          />
                          <span className="text-emphasis">
                            {member.user.name || member.user.email}
                            {member.user.username ? ` (@${member.user.username})` : ""}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <button
                    type="submit"
                    className="bg-emphasis text-inverted hover:bg-emphasis/90 w-full rounded-md px-4 py-2 text-sm font-semibold">
                    {t("create")}
                  </button>
                </form>
              </section>
            )}

            <section className="border-subtle bg-default rounded-md border p-5">
              <h2 className="text-emphasis text-base font-semibold">{t("members")}</h2>
              <div className="mt-4 space-y-3">
                {team.members.map((member) => (
                  <div key={member.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-emphasis truncate font-medium">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-subtle truncate">{member.user.email}</p>
                    </div>
                    <span className="text-subtle shrink-0">{member.role}</span>
                  </div>
                ))}
              </div>
              {canAdmin && (
                <form
                  action={`/teams/${team.id}/members`}
                  method="post"
                  className="border-subtle mt-5 border-t pt-5">
                  <input type="hidden" name="teamId" value={team.id} />
                  <label className="block">
                    <span className="text-emphasis text-sm font-medium">{t("email")}</span>
                    <input
                      name="email"
                      type="email"
                      required
                      className="border-subtle bg-default text-emphasis mt-2 block w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="support@dre.app"
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="text-emphasis text-sm font-medium">{t("role")}</span>
                    <select
                      name="role"
                      className="border-subtle bg-default text-emphasis mt-2 block w-full rounded-md border px-3 py-2 text-sm"
                      defaultValue={MembershipRole.MEMBER}>
                      <option value={MembershipRole.MEMBER}>{MembershipRole.MEMBER}</option>
                      <option value={MembershipRole.ADMIN}>{MembershipRole.ADMIN}</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="border-subtle text-emphasis hover:bg-subtle mt-4 w-full rounded-md border px-4 py-2 text-sm font-semibold">
                    {t("add")}
                  </button>
                </form>
              )}
            </section>
          </aside>
        </div>
      </div>
    </ShellMainAppDir>
  );
};

export const generateMetadata = async (): Promise<ReturnType<typeof _generateMetadata>> =>
  await _generateMetadata(
    (t) => t("dre_team"),
    (t) => t("dre_team_description")
  );

export default Page;
