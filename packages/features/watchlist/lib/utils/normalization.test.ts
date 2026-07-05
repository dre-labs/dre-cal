import { describe, expect, test } from "vitest";

import {
  normalizeEmail,
  normalizeDomain,
  extractDomainFromEmail,
  normalizeUsername,
  getWildcardPatternsForDomain,
  domainMatchesWatchlistEntry,
} from "./normalization";

describe("normalization", () => {
  describe("normalizeEmail", () => {
    test("should normalize basic email", () => {
      expect(normalizeEmail("Test@Example.COM")).toBe("test@example.com");
      expect(normalizeEmail("  user@domain.org  ")).toBe("user@domain.org");
    });

    test("should throw on invalid emails", () => {
      expect(() => normalizeEmail("invalid")).toThrow("Invalid email format");
      expect(() => normalizeEmail("@domain.com")).toThrow("Invalid email format");
      expect(() => normalizeEmail("user@")).toThrow("Invalid email format");
    });
  });

  describe("normalizeDomain", () => {
    test("should normalize basic domain", () => {
      expect(normalizeDomain("Example.COM")).toBe("example.com");
      expect(normalizeDomain("@Domain.ORG")).toBe("domain.org");
      expect(normalizeDomain("  sub.domain.net  ")).toBe("sub.domain.net");
    });

    test("should preserve full domain including subdomains", () => {
      expect(normalizeDomain("mail.google.com")).toBe("mail.google.com");
      expect(normalizeDomain("sub.domain.example.org")).toBe("sub.domain.example.org");
    });

    test("should handle multi-level TLDs correctly", () => {
      expect(normalizeDomain("example.co.uk")).toBe("example.co.uk");
      expect(normalizeDomain("mail.example.co.uk")).toBe("mail.example.co.uk");
      expect(normalizeDomain("company.com.au")).toBe("company.com.au");
    });

    test("should accept and preserve wildcard prefix", () => {
      expect(normalizeDomain("*.cal.dre.app")).toBe("*.cal.dre.app");
      expect(normalizeDomain("*.EXAMPLE.COM")).toBe("*.example.com");
      expect(normalizeDomain("  *.domain.org  ")).toBe("*.domain.org");
      expect(normalizeDomain("*.sub.domain.co.uk")).toBe("*.sub.domain.co.uk");
    });

    test("should throw on invalid domains", () => {
      expect(() => normalizeDomain("invalid..domain")).toThrow("Invalid domain format");
      expect(() => normalizeDomain(".domain.com")).toThrow("Invalid domain format");
      expect(() => normalizeDomain("domain.")).toThrow("Invalid domain format");
    });

    test("should throw on invalid wildcard domains", () => {
      expect(() => normalizeDomain("*.")).toThrow("Invalid domain format");
      expect(() => normalizeDomain("*..domain.com")).toThrow("Invalid domain format");
      expect(() => normalizeDomain("*.invalid..domain")).toThrow("Invalid domain format");
    });
  });

  describe("extractDomainFromEmail", () => {
    test("should extract and normalize domain from email", () => {
      expect(extractDomainFromEmail("user@Example.COM")).toBe("example.com");
      expect(extractDomainFromEmail("test@sub.domain.org")).toBe("sub.domain.org");
      expect(extractDomainFromEmail("user@mail.google.com")).toBe("mail.google.com");
    });

    test("should handle multi-level TLDs", () => {
      expect(extractDomainFromEmail("user@example.co.uk")).toBe("example.co.uk");
      expect(extractDomainFromEmail("admin@mail.company.com.au")).toBe("mail.company.com.au");
    });

    test("should throw on invalid emails", () => {
      expect(() => extractDomainFromEmail("invalid")).toThrow("Invalid email format");
    });
  });

  describe("normalizeUsername", () => {
    test("should normalize basic username", () => {
      expect(normalizeUsername("TestUser")).toBe("testuser");
      expect(normalizeUsername("  user_name  ")).toBe("user_name");
      expect(normalizeUsername("User.Name-123")).toBe("user.name-123");
    });

    test("should preserve special characters", () => {
      expect(normalizeUsername("user@name!")).toBe("user@name!");
      expect(normalizeUsername("test.user-123")).toBe("test.user-123");
    });

    test("should throw on invalid usernames", () => {
      expect(() => normalizeUsername("")).toThrow("Invalid username: must be a non-empty string");
    });
  });

  describe("Edge cases and consistency", () => {
    test("should handle international domains", () => {
      // Note: In a real implementation, you might want to handle punycode
      expect(normalizeDomain("münchen.de")).toBe("münchen.de");
    });

    test("should be consistent across multiple calls", () => {
      const email = "Test.User+Tag@GMAIL.COM";
      const result1 = normalizeEmail(email);
      const result2 = normalizeEmail(email);
      expect(result1).toBe(result2);
    });

    test("should handle empty strings gracefully", () => {
      expect(() => normalizeEmail("")).toThrow();
      expect(() => normalizeDomain("")).toThrow();
      expect(() => normalizeUsername("")).toThrow();
    });
  });

  describe("getWildcardPatternsForDomain", () => {
    test("should return wildcard pattern for a subdomain", () => {
      expect(getWildcardPatternsForDomain("cal.dre.app")).toEqual(["*.cal.dre.app"]);
    });

    test("should return single wildcard pattern for deeply nested subdomains", () => {
      expect(getWildcardPatternsForDomain("sub.cal.dre.app")).toEqual(["*.cal.dre.app"]);
    });

    test("should return empty array for a simple domain (no subdomains)", () => {
      expect(getWildcardPatternsForDomain("cal.dre.app")).toEqual([]);
    });

    test("should handle multi-level TLDs correctly", () => {
      expect(getWildcardPatternsForDomain("example.co.uk")).toEqual(["*.co.uk"]);
      expect(getWildcardPatternsForDomain("bloody-hell.cal.co.uk")).toEqual(["*.cal.co.uk"]);
    });

    test("should return empty array for single-part domain", () => {
      expect(getWildcardPatternsForDomain("localhost")).toEqual([]);
    });
  });

  describe("domainMatchesWatchlistEntry", () => {
    test("should match exact domain when no wildcard", () => {
      expect(domainMatchesWatchlistEntry("cal.dre.app", "cal.dre.app")).toBe(true);
      expect(domainMatchesWatchlistEntry("cal.dre.app", "cal.dre.app")).toBe(false);
    });

    test("should match subdomain when wildcard is used", () => {
      expect(domainMatchesWatchlistEntry("cal.dre.app", "*.cal.dre.app")).toBe(true);
      expect(domainMatchesWatchlistEntry("sub.cal.dre.app", "*.cal.dre.app")).toBe(true);
    });

    test("should not match exact domain with wildcard pattern", () => {
      expect(domainMatchesWatchlistEntry("cal.dre.app", "*.cal.dre.app")).toBe(false);
    });

    test("should be case insensitive", () => {
      expect(domainMatchesWatchlistEntry("APP.CAL.COM", "*.cal.dre.app")).toBe(true);
      expect(domainMatchesWatchlistEntry("cal.dre.app", "*.CAL.COM")).toBe(true);
    });

    test("should not match unrelated domains", () => {
      expect(domainMatchesWatchlistEntry("app.example.com", "*.cal.dre.app")).toBe(false);
      expect(domainMatchesWatchlistEntry("notcal.dre.app", "cal.dre.app")).toBe(false);
    });
  });
});
