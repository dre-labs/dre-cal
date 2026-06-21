import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingForReschedule, getBookingForSeatedEvent } from "@calcom/features/bookings/lib/get-booking";
import { EventRepository } from "@calcom/features/eventtypes/repositories/EventRepository";
import { shouldHideBrandingForTeamEvent } from "@calcom/features/profile/lib/hideBranding";
import { loadTranslations } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { BookingStatus } from "@calcom/prisma/enums";
import { buildLegacyCtx, buildLegacyRequest, decodeParams } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { CustomI18nProvider } from "app/CustomI18nProvider";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactElement } from "react";
import type { PageProps as LegacyPageProps } from "~/users/views/users-type-public-view";
import LegacyPage from "~/users/views/users-type-public-view";

type TeamPageProps = LegacyPageProps & {
  isTeamEvent: true;
};

type TeamEventDataResult =
  | null
  | {
      redirect: string;
    }
  | {
      props: TeamPageProps;
    };

const getFirstParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const getOptionalString = (value: string | string[] | undefined): string | null => {
  if (typeof value !== "string") return null;
  return value;
};

const getTeamEventData = async ({ params, searchParams }: PageProps): Promise<TeamEventDataResult> => {
  const resolvedParams = decodeParams(await params);
  const resolvedSearchParams = await searchParams;
  const _headers = await headers();
  const _cookies = await cookies();
  const session = await getServerSession({ req: buildLegacyRequest(_headers, _cookies) });

  const teamSlug = getFirstParam(resolvedParams.slug);
  const eventSlug = getFirstParam(resolvedParams.type);

  if (!teamSlug || !eventSlug) {
    return null;
  }

  const eventData = await EventRepository.getPublicEvent(
    {
      username: teamSlug,
      eventSlug,
      isTeamEvent: true,
      org: null,
      fromRedirectOfNonOrgLink: resolvedSearchParams.orgRedirection === "true",
    },
    session?.user?.id
  );

  if (!eventData?.teamId || !eventData.team) {
    return null;
  }

  let booking: GetBookingType | undefined;
  const rescheduleUid = getOptionalString(resolvedSearchParams.rescheduleUid);
  const bookingUid = getOptionalString(resolvedSearchParams.bookingUid);
  const allowRescheduleForCancelledBooking =
    resolvedSearchParams.allowRescheduleForCancelledBooking === "true";

  if (rescheduleUid) {
    booking = await getBookingForReschedule(rescheduleUid, session?.user?.id);
    if (booking?.eventType?.disableRescheduling) {
      return { redirect: `/booking/${rescheduleUid}` } as const;
    }
    if (
      booking?.status === BookingStatus.CANCELLED &&
      !allowRescheduleForCancelledBooking &&
      !eventData.allowReschedulingCancelledBookings
    ) {
      return { redirect: `/team/${teamSlug}/${eventSlug}` } as const;
    }
  } else if (bookingUid) {
    booking = await getBookingForSeatedEvent(bookingUid);
    if (booking?.status === BookingStatus.CANCELLED && !allowRescheduleForCancelledBooking) {
      return { redirect: `/team/${teamSlug}/${eventSlug}` } as const;
    }
  }

  return {
    props: {
      eventData,
      booking,
      user: teamSlug,
      slug: eventSlug,
      rescheduleUid,
      bookingUid,
      isTeamEvent: true,
      isBrandingHidden: shouldHideBrandingForTeamEvent({
        eventTypeId: eventData.id,
        team: eventData.team,
      }),
      isSEOIndexable: true,
      themeBasis: null,
      orgBannerUrl: null,
    },
  };
};

const ServerPage = async ({ params, searchParams }: PageProps): Promise<ReactElement> => {
  const result = await getTeamEventData({ params, searchParams });
  if (!result) {
    notFound();
  }

  if ("redirect" in result) {
    redirect(result.redirect);
  }

  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = { ...result.props, isEmbed: legacyCtx.query.isEmbed === "true" };

  const locale = props.eventData?.interfaceLanguage;
  if (locale) {
    const ns = "common";
    const translations = await loadTranslations(locale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={locale} ns={ns}>
        <LegacyPage {...props} />
      </CustomI18nProvider>
    );
  }

  return <LegacyPage {...props} />;
};

export const generateMetadata = async ({ params, searchParams }: PageProps): Promise<Metadata> => {
  const result = await getTeamEventData({ params, searchParams });
  if (!result || "redirect" in result) return {};

  const { booking, eventData, isBrandingHidden } = result.props;
  const profileName = eventData.profile?.name ?? "";
  const title = eventData.title ?? "";
  const rescheduleLabel = booking?.uid ? "reschedule" : null;
  const meeting = {
    title,
    profile: { name: profileName, image: eventData.profile.image },
    users:
      eventData.subsetOfUsers.map((user) => ({
        name: `${user.name}`,
        username: `${user.username}`,
      })) || [],
  };
  const decodedParams = decodeParams(await params);
  const metadata = await generateMeetingMetadata(
    meeting,
    (t) => `${rescheduleLabel ? t(rescheduleLabel) : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleLabel ? t(rescheduleLabel) : ""} ${title}`,
    isBrandingHidden,
    WEBAPP_URL,
    `/team/${decodedParams.slug}/${decodedParams.type}`
  );

  return {
    ...metadata,
    robots: {
      follow: !eventData.hidden,
      index: !eventData.hidden,
    },
  };
};

export default ServerPage;
