import { describe, expect, it } from "vitest";

import { safeStringify } from "./safeStringify";

describe("safeStringify", () => {
  it("stringifies plain objects", () => {
    expect(safeStringify({ a: 1, b: "two" })).toBe('{"a":1,"b":"two"}');
  });

  it("extracts stack or message from Error instances", () => {
    const error = new Error("boom");
    error.stack = "stack-trace";
    expect(safeStringify(error)).toBe('"stack-trace"');
  });

  it("redacts Authorization headers regardless of casing", () => {
    const result = safeStringify({
      config: { headers: { Authorization: "Bearer ya29.secret-token" } },
    });
    expect(result).not.toContain("secret-token");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts credential-like keys", () => {
    const result = safeStringify({
      password: "hunter2",
      client_secret: "cs-123",
      refresh_token: "rt-456",
      access_token: "at-789",
      api_key: "ak-000",
    });
    expect(result).not.toContain("hunter2");
    expect(result).not.toContain("cs-123");
    expect(result).not.toContain("rt-456");
    expect(result).not.toContain("at-789");
    expect(result).not.toContain("ak-000");
  });

  it("redacts bearer-token-shaped string values under arbitrary keys", () => {
    const result = safeStringify({ someHeader: "Bearer abc123", raw: "ya29.a0AbCdEf" });
    expect(result).not.toContain("abc123");
    expect(result).not.toContain("a0AbCdEf");
  });

  it("keeps non-sensitive values untouched", () => {
    const result = safeStringify({ selectedCalendar: "user@example.com", credentialId: 1 });
    expect(result).toBe('{"selectedCalendar":"user@example.com","credentialId":1}');
  });

  it("returns the object itself when stringification fails", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(safeStringify(circular)).toBe(circular);
  });
});
