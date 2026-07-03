import type { CalendarEvent } from "@calcom/types/Calendar";
import type { TFunction } from "i18next";
import type { EventStatus } from "ics";
import generateIcsString from "./generateIcsString";

type IcsMethod = "REQUEST" | "CANCEL";

type IcsFile = {
  filename: "event.ics";
  content: string | undefined;
  method: IcsMethod;
};

const getIcsMethod = (status: EventStatus): IcsMethod => {
  if (status === "CANCELLED") return "CANCEL";

  return "REQUEST";
};

export enum GenerateIcsRole {
  ATTENDEE = "attendee",
  ORGANIZER = "organizer",
}

export default function generateIcsFile({
  calEvent,
  role,
  status,
  t,
}: {
  calEvent: CalendarEvent;
  role: GenerateIcsRole;
  status: EventStatus;
  t?: TFunction;
}): IcsFile | null {
  // O365 deletes emails if the calendar event is selected. Currently no option to disable this on the web
  if (
    role !== GenerateIcsRole.ATTENDEE &&
    calEvent.destinationCalendar &&
    calEvent.destinationCalendar[0]?.integration === "office365_calendar"
  )
    return null;

  const method = getIcsMethod(status);

  return {
    filename: "event.ics",
    content: generateIcsString({
      event: calEvent,
      status,
      method,
      t,
    }),
    method,
  };
}
