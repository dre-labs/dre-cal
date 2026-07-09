# Cancellation Reason Requirement Design

## Overview

M2 changes cancellation reason configuration from a dedicated Event Type Advanced dropdown to a Booking Questions system field. The field should behave like `rescheduleReason`: event organizers can configure whether `cancellationReason` is required or hidden from Booking Questions, and cancellation flows read that booking field configuration.

## Problem Statement

Cancellation reason behavior was previously hardcoded for hosts and then implemented locally as an EventType enum/column. The M2 spec supersedes that plan because it keeps cancellation reason configuration in the existing `bookingFields` system and avoids another schema dependency.

## User Stories

- As an event organizer, I want to require cancellation reasons from guests so that I understand why bookings are cancelled
- As an event organizer, I want to configure cancellation reason from Booking Questions next to other system fields
- As a guest, I want clear validation when a cancellation reason is required

## Technical Design

### Database Changes

No new schema is required for M2. `Booking.cancellationReason` already stores the submitted reason, and `EventType.bookingFields` stores the field configuration.

The earlier `requiresCancellationReason` enum/column implementation remains as a legacy fallback until a separate schema cleanup is approved.

### Booking Fields

Add `cancellationReason` to `SystemField` and add a system field in `getBookingFieldsWithSystemFields`:

- `name: "cancellationReason"`
- `type: "textarea"`
- `editable: "system-but-optional"`
- `defaultLabel: "reason_for_cancellation"`
- `defaultPlaceholder: "cancellation_reason_placeholder"`
- `required: false`
- `views: [{ id: "cancel", label: "Cancel View" }]`

### Cancel Booking UI

`CancelBooking` receives `bookingFields` and reads the `cancellationReason` field:

- If the field is hidden, do not render or require the textarea
- If the field is required, require a reason from guests and hosts
- Hosts continue to require a reason by default for backward compatibility
- Use custom field label/placeholder when present

### Backend Validation

`handleCancelBooking` validates against `eventType.bookingFields` first:

- Hidden field: reason not required
- Required field: reason required for guests and hosts
- Missing field: fall back to the legacy `requiresCancellationReason` setting

### Form Builder

Booking Questions should show cancellation reason as a view-specific system field, similar to reschedule reason.

## Data Flow

1. `getBookingFieldsWithSystemFields` ensures `cancellationReason` exists in event type booking fields
2. Booking Questions stores any required/hidden customization in `EventType.bookingFields`
3. Booking detail and cancel dialog pages pass `eventType.bookingFields` to `CancelBooking`
4. `handleCancelBooking` reads `eventType.bookingFields` for server-side validation

## Edge Cases

- Existing event types without the field use the legacy fallback until they are saved with generated system fields
- Platform users still respect `skipCancellationReasonValidation`
- Hidden field should not be required
- Default event types should get the default optional field from `getBookingFieldsWithSystemFields`

## Out of Scope

- Custom reason dropdown options
- Reason analytics/reporting
