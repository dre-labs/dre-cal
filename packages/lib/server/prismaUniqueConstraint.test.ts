import type { Prisma } from "@calcom/prisma/client";
import { describe, expect, it } from "vitest";
import { getUniqueConstraintFields, isUniqueConstraintOn } from "./prismaUniqueConstraint";

const buildError = (code: string, meta: unknown) =>
  ({ code, meta }) as unknown as Prisma.PrismaClientKnownRequestError;

describe("getUniqueConstraintFields", () => {
  it("reads the classic engine's meta.target array", () => {
    expect(getUniqueConstraintFields(buildError("P2002", { target: ["email"] }))).toEqual(["email"]);
  });

  it("reads meta.target when it is a bare string", () => {
    expect(getUniqueConstraintFields(buildError("P2002", { target: "email" }))).toEqual(["email"]);
  });

  // Regression: the shape production actually throws under the driver adapter (Prisma 6.16.1).
  it("reads the driver adapter's nested constraint fields", () => {
    const error = buildError("P2002", {
      modelName: "User",
      driverAdapterError: {
        name: "DriverAdapterError",
        cause: {
          originalCode: "23505",
          originalMessage: 'duplicate key value violates unique constraint "users_email_key"',
          kind: "UniqueConstraintViolation",
          constraint: { fields: ["email"] },
        },
      },
    });

    expect(getUniqueConstraintFields(error)).toEqual(["email"]);
  });

  it("falls back to the raw index name when no columns are reported", () => {
    const error = buildError("P2002", {
      driverAdapterError: { cause: { constraint: { index: "users_email_key" } } },
    });

    expect(getUniqueConstraintFields(error)).toEqual(["users_email_key"]);
  });

  it("returns nothing for a non-P2002 error", () => {
    expect(getUniqueConstraintFields(buildError("P2025", { target: ["email"] }))).toEqual([]);
  });

  it("returns nothing when meta is absent", () => {
    expect(getUniqueConstraintFields(buildError("P2002", undefined))).toEqual([]);
  });
});

describe("isUniqueConstraintOn", () => {
  it("matches a field reported by the driver adapter", () => {
    const error = buildError("P2002", {
      driverAdapterError: { cause: { constraint: { fields: ["email"] } } },
    });

    expect(isUniqueConstraintOn(error, ["email", "username"])).toBe(true);
  });

  it("matches a field inside a raw constraint name", () => {
    const error = buildError("P2002", {
      driverAdapterError: { cause: { constraint: { index: "users_email_key" } } },
    });

    expect(isUniqueConstraintOn(error, ["email"])).toBe(true);
  });

  it("does not match an unrelated constraint", () => {
    const error = buildError("P2002", { target: ["slug"] });

    expect(isUniqueConstraintOn(error, ["email", "username"])).toBe(false);
  });
});
