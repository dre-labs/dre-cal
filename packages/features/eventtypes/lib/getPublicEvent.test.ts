import { describe, expect, it } from "vitest";
import { buildEventOwnerWhere } from "./getPublicEvent";

describe("buildEventOwnerWhere", () => {
  it("matches the user by username when there is no organization domain", () => {
    expect(buildEventOwnerWhere({ username: "shawn", orgQuery: null })).toEqual({
      username: "shawn",
      organization: null,
    });
  });

  it("does not exclude users who belong to an organization", () => {
    // Requiring `profiles: { none: {} }` here 404s the booking pages of every organization
    // member, because this deployment serves them from the same domain as everyone else.
    const where = buildEventOwnerWhere({ username: "shawn", orgQuery: null });

    expect(where).not.toHaveProperty("profiles");
  });

  it("scopes the username to the organization's profiles on an organization domain", () => {
    const orgQuery = { slug: "dre" };

    expect(buildEventOwnerWhere({ username: "shawn", orgQuery })).toEqual({
      profiles: {
        some: {
          organization: orgQuery,
          username: "shawn",
        },
      },
    });
  });
});
