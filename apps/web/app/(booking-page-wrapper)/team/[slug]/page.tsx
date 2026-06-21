import { WEBAPP_URL } from "@calcom/lib/constants";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

const getTeam = async (slug: string) => {
  return await prisma.team.findFirst({
    where: {
      slug,
      parentId: null,
      isOrganization: false,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      eventTypes: {
        where: {
          hidden: false,
        },
        orderBy: {
          title: "asc",
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          length: true,
        },
      },
    },
  });
};

const Page = async ({ params }: PageProps): Promise<ReactElement> => {
  const t = await getTranslate();
  const resolvedParams = await params;
  const slug = typeof resolvedParams.slug === "string" ? slugify(resolvedParams.slug) : "";
  const team = await getTeam(slug);

  if (!team?.slug) {
    notFound();
  }

  return (
    <main className="bg-default min-h-screen px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="font-cal text-emphasis text-3xl font-semibold">{team.name}</h1>
          {team.bio && <p className="text-subtle mt-3 text-sm">{team.bio}</p>}
        </div>

        <div className="border-subtle bg-muted divide-subtle overflow-hidden rounded-md border divide-y">
          {team.eventTypes.length ? (
            team.eventTypes.map((eventType) => (
              <Link
                key={eventType.id}
                href={`/team/${team.slug}/${eventType.slug}`}
                className="bg-default hover:bg-subtle block p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-emphasis truncate text-base font-semibold">{eventType.title}</h2>
                    {eventType.description && (
                      <p className="text-subtle mt-1 line-clamp-2 text-sm">{eventType.description}</p>
                    )}
                  </div>
                  <span className="text-subtle shrink-0 text-sm">
                    {eventType.length} {t("minutes").toLowerCase()}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="bg-default p-5">
              <p className="text-default text-sm">{t("dre_public_team_no_events")}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const resolvedParams = await params;
  const slug = typeof resolvedParams.slug === "string" ? slugify(resolvedParams.slug) : "";
  const team = await getTeam(slug);

  if (!team) {
    return {};
  }

  return await _generateMetadata(
    () => team.name,
    () => team.bio ?? team.name,
    undefined,
    WEBAPP_URL,
    `/team/${team.slug}`
  );
};

export default Page;
