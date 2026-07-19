const SENSITIVE_KEYS = /^(authorization|password|client_secret|refresh_token|access_token|api[-_]?key|apikey)$/i;

function redactSensitiveValues(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.test(key)) return "[REDACTED]";
  // Catch tokens living under non-obvious keys (e.g. raw header dumps from third-party API clients)
  if (typeof value === "string" && (value.startsWith("Bearer ") || value.startsWith("ya29."))) {
    return "[REDACTED]";
  }
  return value;
}

/**
 * It stringifies the object which is necessary to ensure that in a logging system(like Axiom) we see the object in context in a single log event
 */
export function safeStringify(obj: unknown) {
  try {
    if (obj instanceof Error) {
      // Errors don't serialize well, so we extract what we want
      // We stringify so that we can log the error message and stack trace in a single log event
      return JSON.stringify(obj.stack ?? obj.message);
    }
    // Third-party API errors (e.g. gaxios) embed request configs containing auth headers;
    // redact them so credentials never reach the logging system
    return JSON.stringify(obj, redactSensitiveValues);
  } catch {
    return obj;
  }
}
