import { buildCalendarEvent, buildPerson } from "@calcom/lib/test/builder";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { describe, expect } from "vitest";
import generateIcsFile, { GenerateIcsRole } from "./generateIcsFile";

describe("generateIcsFile", () => {
  test("uses REQUEST for confirmed attendee calendar invites", () => {
    const calEvent = buildCalendarEvent({
      attendees: [buildPerson()],
      iCalSequence: 0,
    });

    const icsFile = generateIcsFile({
      calEvent,
      role: GenerateIcsRole.ATTENDEE,
      status: "CONFIRMED",
    });

    expect(icsFile).toEqual(
      expect.objectContaining({
        filename: "event.ics",
        method: "REQUEST",
      })
    );
    expect(icsFile?.content).toEqual(expect.stringContaining("METHOD:REQUEST"));
    expect(icsFile?.content).toEqual(expect.stringContaining("STATUS:CONFIRMED"));
  });

  test("uses CANCEL for cancelled attendee calendar invites", () => {
    const calEvent = buildCalendarEvent({
      attendees: [buildPerson()],
      iCalSequence: 1,
    });

    const icsFile = generateIcsFile({
      calEvent,
      role: GenerateIcsRole.ATTENDEE,
      status: "CANCELLED",
    });

    expect(icsFile).toEqual(
      expect.objectContaining({
        filename: "event.ics",
        method: "CANCEL",
      })
    );
    expect(icsFile?.content).toEqual(expect.stringContaining("METHOD:CANCEL"));
    expect(icsFile?.content).toEqual(expect.stringContaining("STATUS:CANCELLED"));
  });
});
