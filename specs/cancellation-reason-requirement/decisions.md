# Cancellation Reason Requirement Decisions

## ADR-001: Store in bookingFields vs EventType column

### Context

Need to store the cancellation reason requirement setting on EventType.

### Options Considered

1. **New database column with enum** - Already implemented locally, but creates a separate configuration surface
2. **BookingFields system field** - Matches M2 and the existing `rescheduleReason` pattern

### Decision

Use `EventType.bookingFields` with a `cancellationReason` system field for runtime behavior.

Rationale:

- Consistent with `rescheduleReason`
- Lets Booking Questions own label, placeholder, required, and hidden configuration
- Avoids new schema work for M2

### Consequences

- Existing enum/column is a legacy fallback until schema cleanup is approved
- UI/backend must parse the cancellation reason field from `bookingFields`
