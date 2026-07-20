import { describe, expect, it } from "vitest";
import {
  deriveOrganizationSlug,
  getOrgAutoAcceptEmailDomain,
  validateOrganizationCreationInput,
} from "./organizationCreation";

describe("deriveOrganizationSlug", () => {
  it("prefers the requested slug", () => {
    expect(deriveOrganizationSlug({ name: "DRE Mortgage", requestedSlug: "dre" })).toBe("dre");
  });

  it("falls back to the name when no slug is requested", () => {
    expect(deriveOrganizationSlug({ name: "DRE Mortgage", requestedSlug: "" })).toBe("dre-mortgage");
  });

  it("slugifies unsafe characters", () => {
    // slugify keeps dots so domain-like slugs survive; everything else is stripped or hyphenated
    expect(deriveOrganizationSlug({ name: "DRE & Co. Mortgage!", requestedSlug: "" })).toBe(
      "dre-co.-mortgage"
    );
  });
});

describe("validateOrganizationCreationInput", () => {
  it("accepts a valid name", () => {
    const result = validateOrganizationCreationInput({ name: "  DRE Mortgage ", requestedSlug: "" });
    expect(result).toEqual({ ok: true, name: "DRE Mortgage", slug: "dre-mortgage" });
  });

  it("rejects an empty name", () => {
    const result = validateOrganizationCreationInput({ name: "   ", requestedSlug: "" });
    expect(result).toEqual({ ok: false, message: "Organization name is required." });
  });

  it("rejects a name that slugifies to nothing", () => {
    const result = validateOrganizationCreationInput({ name: "!!!", requestedSlug: "" });
    expect(result.ok).toBe(false);
  });
});

describe("getOrgAutoAcceptEmailDomain", () => {
  it("extracts and lowercases the domain", () => {
    expect(getOrgAutoAcceptEmailDomain("Shawn@DRE.Mortgage")).toBe("dre.mortgage");
  });

  it("returns an empty string when there is no domain", () => {
    expect(getOrgAutoAcceptEmailDomain("not-an-email")).toBe("");
  });
});
