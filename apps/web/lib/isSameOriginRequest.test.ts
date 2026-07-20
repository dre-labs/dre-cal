import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./isSameOriginRequest";

const APP_URL = "https://cal.dre.app";

const requestWithOrigin = (origin: string | null): Request =>
  ({
    headers: new Headers(origin === null ? {} : { origin }),
  }) as Request;

describe("isSameOriginRequest", () => {
  it("accepts a request from the app's own origin", () => {
    expect(isSameOriginRequest(requestWithOrigin("https://cal.dre.app"), APP_URL)).toBe(true);
  });

  it("ignores path differences on the configured app url", () => {
    expect(isSameOriginRequest(requestWithOrigin("https://cal.dre.app"), `${APP_URL}/settings`)).toBe(true);
  });

  it("rejects another origin", () => {
    expect(isSameOriginRequest(requestWithOrigin("https://evil.example.com"), APP_URL)).toBe(false);
  });

  it("rejects a look-alike host", () => {
    expect(isSameOriginRequest(requestWithOrigin("https://cal.dre.app.evil.com"), APP_URL)).toBe(false);
  });

  it("rejects the same host over a different scheme", () => {
    expect(isSameOriginRequest(requestWithOrigin("http://cal.dre.app"), APP_URL)).toBe(false);
  });

  it("rejects a missing Origin header", () => {
    expect(isSameOriginRequest(requestWithOrigin(null), APP_URL)).toBe(false);
  });

  it("rejects an unparseable Origin header", () => {
    expect(isSameOriginRequest(requestWithOrigin("not-a-url"), APP_URL)).toBe(false);
  });
});
