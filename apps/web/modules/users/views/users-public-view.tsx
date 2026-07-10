"use client";

import {
  sdkActionManager,
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import useTheme from "@calcom/lib/hooks/useTheme";
import { UserAvatar } from "@calcom/ui/components/avatar";
import { Icon } from "@calcom/ui/components/icon";
import { OrgBanner } from "@calcom/ui/components/organization-banner";
import { UnpublishedEntity } from "@calcom/ui/components/unpublished-entity";
import { EventTypeDescriptionLazy as EventTypeDescription } from "@calcom/web/modules/event-types/components";
import EmptyPage from "@calcom/web/modules/event-types/components/EmptyPage";
import type { getServerSideProps } from "@server/lib/[user]/getServerSideProps";
import classNames from "classnames";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { Toaster } from "sonner";

export type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;
export function UserPage(props: PageProps) {
  const { users, profile, eventTypes, entity } = props;
  const { t } = useLocale();

  const [user] = users; //To be used when we only have a single user, not dynamic group
  useTheme(profile.theme);

  const isBioEmpty = !user.bio || !user.bio.replace("<p><br></p>", "").length;

  const isEmbed = useIsEmbed(props.isEmbed);
  const eventTypeListItemEmbedStyles = useEmbedStyles("eventTypeListItem");
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const {
    // So it doesn't display in the Link (and make tests fail)
    user: _user,
    orgSlug: _orgSlug,
    redirect: _redirect,
    ...query
  } = useRouterQuery();

  if (entity.considerUnpublished) {
    return (
      <div className="flex h-full min-h-[calc(100dvh)] items-center justify-center">
        <UnpublishedEntity {...entity} />
      </div>
    );
  }

  const isEventListEmpty = eventTypes.length === 0;
  const isOrg = !!user?.profile?.organization;
  const organizationName = entity.name || user.profile.organization?.name;
  const organizationLogo = entity.logoUrl || user.profile.organization?.logoUrl;
  const organizationBio = entity.bio;
  const profileBioFallback = `Book a meeting with ${profile.name || user.username || "this profile"}.`;

  return (
    <>
      <div className={classNames(shouldAlignCentrally ? "mx-auto" : "", isEmbed ? "max-w-3xl" : "")}>
        <main
          className={classNames(
            shouldAlignCentrally ? "mx-auto" : "",
            isEmbed ? "border-booker border-booker-width  bg-default rounded-md" : "",
            "max-w-3xl px-4 py-12"
          )}>
          <div className="border-subtle bg-default text-default mb-8 overflow-hidden rounded-xl border">
            {isOrg && user.profile.organization?.bannerUrl && (
              <OrgBanner
                alt={user.profile.organization.name ?? "Organization banner"}
                imageSrc={user.profile.organization.bannerUrl}
                className="p-1 border border-subtle rounded-xl w-full object-cover"
              />
            )}
            <div className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <UserAvatar
                    size="lg"
                    user={{
                      avatarUrl: user.avatarUrl,
                      profile: user.profile,
                      name: profile.name,
                      username: profile.username,
                    }}
                    className={isOrg && user.profile.organization?.bannerUrl ? "-mt-14" : ""}
                  />
                  <h1
                    className={classNames(
                      "font-cal text-emphasis mb-1 text-xl",
                      isOrg && user.profile.organization?.bannerUrl ? "" : "mt-4"
                    )}
                    data-testid="name-title">
                    {profile.name}
                    {!isOrg && user.verified && (
                      <Icon
                        name="badge-check"
                        className="mx-1 -mt-1 inline h-6 w-6 fill-blue-500 text-white dark:text-black"
                      />
                    )}
                    {isOrg && (
                      <Icon
                        name="badge-check"
                        className="mx-1 -mt-1 inline h-6 w-6 fill-yellow-500 text-white dark:text-black"
                      />
                    )}
                  </h1>
                </div>

                {organizationName && (
                  <div className="max-w-full sm:max-w-xs sm:text-right">
                    <div className="border-subtle bg-subtle ml-auto flex w-fit max-w-full items-center gap-2 rounded-md border px-3 py-2 sm:mt-1">
                      {organizationLogo ? (
                        <span
                          aria-hidden
                          className="h-6 w-6 shrink-0 rounded-full bg-cover bg-center bg-no-repeat"
                          style={{ backgroundImage: `url("${organizationLogo}")` }}
                        />
                      ) : (
                        <span className="bg-emphasis text-inverted flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                          {organizationName.slice(0, 1)}
                        </span>
                      )}
                      <span className="text-emphasis truncate text-sm font-medium">{organizationName}</span>
                    </div>
                    {organizationBio && (
                      <p className="mt-2 line-clamp-2 text-sm text-subtle">{organizationBio}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4">
                {!isBioEmpty ? (
                  <>
                    {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via safeBio */}
                    <div
                      className="text-default wrap-break-word text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                      dangerouslySetInnerHTML={{ __html: props.safeBio }}
                    />
                  </>
                ) : (
                  <p className="text-default text-sm">{profileBioFallback}</p>
                )}
              </div>
            </div>
          </div>

          <div
            className={classNames("rounded-md ", !isEventListEmpty && "border-subtle border")}
            data-testid="event-types">
            {eventTypes.map((type) => (
              <Link
                key={type.id}
                style={{ display: "flex", ...eventTypeListItemEmbedStyles }}
                prefetch={false}
                href={{
                  pathname: `/${user.profile.username}/${type.slug}`,
                  query,
                }}
                passHref
                onClick={async () => {
                  sdkActionManager?.fire("eventTypeSelected", {
                    eventType: type,
                  });
                }}
                className="bg-default border-subtle dark:bg-cal-muted dark:hover:bg-subtle hover:bg-cal-muted group relative border-b transition first:rounded-t-md last:rounded-b-md last:border-b-0"
                data-testid="event-type-link">
                {/* Don't prefetch till the time we drop the amount of javascript in [user][type] page which is impacting score for [user] page */}
                <div className="flex w-full items-start justify-between gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-emphasis pr-2 text-sm font-semibold">{type.title}</h2>
                      <span className="border-subtle bg-subtle text-default inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                        <Icon name="clock" className="h-3.5 w-3.5" />
                        {type.length} min
                      </span>
                    </div>
                    <EventTypeDescription eventType={type} isPublic={true} shortenDescription />
                  </div>
                  <div className="text-emphasis hidden shrink-0 items-center gap-2 text-sm font-medium sm:flex">
                    <span>{t("book_now")}</span>
                    <Icon
                      name="arrow-right"
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {isEventListEmpty && <EmptyPage name={profile.name || "User"} />}
          <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-subtle">
            <span>DRE Cal</span>
            <Link href="/privacy" className="hover:text-emphasis">
              {t("privacy")}
            </Link>
            <Link href="/terms" className="hover:text-emphasis">
              {t("terms")}
            </Link>
          </footer>
        </main>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}

export default UserPage;
