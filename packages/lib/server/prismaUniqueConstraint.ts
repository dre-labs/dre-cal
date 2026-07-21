import type { Prisma } from "@calcom/prisma/client";

/**
 * Prisma reports the offending columns of a P2002 in two different shapes depending on how the
 * client talks to the database. The classic engine sets `meta.target`, but a driver adapter
 * (which is what we run in production) leaves `meta.target` undefined and instead nests the
 * columns under `meta.driverAdapterError.cause.constraint.fields`. Reading only `meta.target`
 * makes every "is this a duplicate email?" guard silently fall through and surface as a 500.
 */
export function getUniqueConstraintFields(error: Prisma.PrismaClientKnownRequestError): string[] {
  if (error.code !== "P2002") return [];

  const meta = error.meta as
    | {
        target?: unknown;
        driverAdapterError?: { cause?: { constraint?: { fields?: unknown; index?: unknown } } };
      }
    | undefined;

  if (Array.isArray(meta?.target)) return meta.target.map(String);
  if (typeof meta?.target === "string") return [meta.target];

  const constraint = meta?.driverAdapterError?.cause?.constraint;
  if (Array.isArray(constraint?.fields)) return constraint.fields.map(String);

  // Postgres unique indexes that aren't backed by named columns report an index name instead,
  // e.g. "users_email_key" — callers still match on substrings so the name is useful.
  if (typeof constraint?.index === "string") return [constraint.index];

  return [];
}

/**
 * True when a P2002 was caused by any of `fields`. Matches on substrings so a raw Postgres
 * constraint name like "users_email_key" still matches "email".
 */
export function isUniqueConstraintOn(error: Prisma.PrismaClientKnownRequestError, fields: string[]): boolean {
  const violated = getUniqueConstraintFields(error);
  return violated.some((violatedField) =>
    fields.some((field) => violatedField.toLowerCase().includes(field.toLowerCase()))
  );
}
