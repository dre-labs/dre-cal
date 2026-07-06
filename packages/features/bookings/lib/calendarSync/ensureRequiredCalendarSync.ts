import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { EventResult } from "@calcom/types/EventManager";

type CalendarSyncOperation = "cancel" | "reschedule";

function isRequiredCalendarResult(result: Pick<EventResult<unknown>, "type">): boolean {
  return result.type.includes("_calendar") && !result.type.includes("other_calendar");
}

function summarizeFailedCalendarResults(results: EventResult<unknown>[]): EventResult<unknown>[] {
  return results.filter((result) => isRequiredCalendarResult(result) && !result.success);
}

export function ensureRequiredCalendarSyncSucceeded({
  operation,
  results,
}: {
  operation: CalendarSyncOperation;
  results: EventResult<unknown>[];
}): void {
  const failedResults = summarizeFailedCalendarResults(results);
  if (!failedResults.length) return;

  throw new ErrorWithCode(
    ErrorCode.InternalServerError,
    `Unable to ${operation} booking because one or more required calendar updates failed.`,
    {
      operation,
      failedCalendars: failedResults.map((result) => ({
        type: result.type,
        credentialId: result.credentialId,
        uid: result.uid,
        calError: result.calError,
      })),
    }
  );
}
