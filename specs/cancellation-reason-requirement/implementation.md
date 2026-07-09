# Cancellation Reason Requirement Implementation

## Status: in progress

## Completed

- Legacy implementation added `CancellationReasonRequirement` enum and `EventType.requiresCancellationReason`
- Legacy implementation added Advanced-tab dropdown and frontend/backend validation
- Server queries already select `eventType.bookingFields`
- Added focused backend tests for bookingFields-required and bookingFields-hidden cancellation reason behavior
- Added `CancelBooking` component tests for required, hidden, and custom label/placeholder bookingFields behavior

## In Progress

- Align runtime behavior with the M2 Booking Questions spec
- Add `cancellationReason` as a bookingFields system field
- Pass `bookingFields` into cancellation UI
- Validate cancellation reason from `bookingFields` first, with legacy enum fallback

## Blocked

- Removing the legacy enum/column requires a schema change and should be handled as a separate approved cleanup

## Next Steps

1. Add end-to-end coverage for configuring cancellation reason in Booking Questions
2. Manually verify the Booking Questions editor in the browser
3. Plan legacy enum/column cleanup as a separate schema-change PR

## Session Notes

- 2026-07-07: M2 spec reviewed from `origin/feat/cancel-booking-required`; local enum/dropdown plan is stale for runtime behavior.
