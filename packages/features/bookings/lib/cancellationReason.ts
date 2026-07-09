import { CancellationReasonRequirement } from "@calcom/prisma/enums";

type CancellationReasonField = {
  name: string;
  required?: boolean;
  hidden?: boolean;
  label?: string;
  defaultLabel?: string;
  placeholder?: string;
  defaultPlaceholder?: string;
};

export function getCancellationReasonField(bookingFields: unknown): CancellationReasonField | undefined {
  if (!Array.isArray(bookingFields)) return undefined;

  return bookingFields.find((field): field is CancellationReasonField => {
    if (!field || typeof field !== "object") return false;
    if (!("name" in field)) return false;
    return field.name === "cancellationReason";
  });
}

function isCancellationReasonRequiredForLegacySetting(
  setting: CancellationReasonRequirement | null | undefined,
  isHost: boolean
): boolean {
  const requirement = setting ?? CancellationReasonRequirement.MANDATORY_HOST_ONLY;

  switch (requirement) {
    case CancellationReasonRequirement.OPTIONAL_BOTH:
      return false;
    case CancellationReasonRequirement.MANDATORY_BOTH:
      return true;
    case CancellationReasonRequirement.MANDATORY_HOST_ONLY:
      return isHost;
    case CancellationReasonRequirement.MANDATORY_ATTENDEE_ONLY:
      return !isHost;
    default:
      return false;
  }
}

export function isCancellationReasonRequired(
  setting: CancellationReasonRequirement | null | undefined,
  isHost: boolean,
  bookingFields?: unknown
): boolean {
  const cancellationReasonField = getCancellationReasonField(bookingFields);
  if (cancellationReasonField?.hidden) return false;

  if (cancellationReasonField) return isHost || !!cancellationReasonField.required;

  return isCancellationReasonRequiredForLegacySetting(setting, isHost);
}
