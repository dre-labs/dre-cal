import { getRichDescription, getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { ORGANIZER_EMAIL_EXEMPT_DOMAINS } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import type { TFunction } from "i18next";
import type { DateArray, EventStatus, ParticipationRole, ParticipationStatus } from "ics";
import { createEvent } from "ics";
import { RRule } from "rrule";

enum BookingAction {
  Create = "create",
  Cancel = "cancel",
  Reschedule = "reschedule",
  RequestReschedule = "request_reschedule",
  LocationChange = "location_change",
}

type ICSCalendarEvent = Pick<
  CalendarEvent,
  | "uid"
  | "iCalUID"
  | "iCalSequence"
  | "startTime"
  | "endTime"
  | "title"
  | "organizer"
  | "attendees"
  | "location"
  | "recurringEvent"
  | "team"
  | "type"
  | "hideCalendarEventDetails"
  | "hideOrganizerEmail"
>;

type IcsMethod = "REQUEST" | "CANCEL";

const getIcsMethod = (status: EventStatus): IcsMethod => {
  if (status === "CANCELLED") return "CANCEL";

  return "REQUEST";
};

const toICalDateArray = (date: string): DateArray => {
  const d = new Date(date);
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1, // Convert 0-based month to 1-based
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ] satisfies DateArray;
};

const generateIcsString = ({
  event,
  status,
  method,
  partstat = "ACCEPTED",
  t,
}: {
  event: ICSCalendarEvent;
  status: EventStatus;
  method?: IcsMethod;
  partstat?: ParticipationStatus;
  t?: TFunction;
}): string | undefined => {
  const icsMethod = method ?? getIcsMethod(status);
  const location = getVideoCallUrlFromCalEvent(event) || event.location;
  const uid = event.iCalUID || event.uid;

  if (!uid) {
    throw new ErrorWithCode(ErrorCode.BadRequest, "Missing UID for ICS event");
  }

  // Taking care of recurrence rule
  let recurrenceRule: string | undefined;
  const icsRole: ParticipationRole = "REQ-PARTICIPANT";
  if (event.recurringEvent?.count) {
    // ics appends "RRULE:" already, so removing it from RRule generated string
    recurrenceRule = new RRule(event.recurringEvent).toString().replace("RRULE:", "");
  }

  const isOrganizerExempt = ORGANIZER_EMAIL_EXEMPT_DOMAINS?.split(",")
    .filter((domain) => domain.trim() !== "")
    .some((domain) => event.organizer.email.toLowerCase().endsWith(domain.toLowerCase()));

  const organizer = {
    name: event.organizer.name,
    email: event.organizer.email,
  };

  if (event.hideOrganizerEmail && !isOrganizerExempt) {
    organizer.email = "no-reply@cal.dre.app";
  }

  const teamAttendees =
    event.team?.members?.map((member: Person) => ({
      name: member.name,
      email: member.email,
      partstat,
      role: icsRole,
      rsvp: true,
    })) ?? [];

  const optionalEventProperties: { classification?: "PRIVATE" } = {};

  if (event.hideCalendarEventDetails) {
    optionalEventProperties.classification = "PRIVATE";
  }

  const icsEvent = createEvent({
    uid,
    sequence: event.iCalSequence || 0,
    start: toICalDateArray(event.startTime),
    end: toICalDateArray(event.endTime),
    startInputType: "utc",
    productId: "calcom/ics",
    title: event.title,
    description: getRichDescription(event, t),
    organizer,
    ...{ recurrenceRule },
    attendees: [
      ...event.attendees.map((attendee: Person) => ({
        name: attendee.name,
        email: attendee.email,
        partstat,
        role: icsRole,
        rsvp: true,
      })),
      ...teamAttendees,
    ],
    location: location ?? undefined,
    method: icsMethod,
    status,
    ...optionalEventProperties,
    busyStatus: "BUSY",
  });
  if (icsEvent.error) {
    // The ics library throws Yup ValidationError objects (not Error instances) for invalid data like invalid email formats.
    // Convert these to ErrorWithCode.BadRequest so they return 400 instead of falling through to a generic 500.
    if (icsEvent.error.name === "ValidationError") {
      throw new ErrorWithCode(ErrorCode.BadRequest, icsEvent.error.message);
    }
    throw icsEvent.error;
  }
  return icsEvent.value;
};

export { BookingAction };
export type { ICSCalendarEvent };
export default generateIcsString;
