import type { PrismaClient } from "@calcom/prisma";
import { type DeepMockProxy, mockDeep, mockReset } from "vitest-mock-extended";

// Prisma mock instance (singleton)
export const prismaMock: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();

export function resetPrismaMock(): void {
  mockReset(prismaMock);
}

type MockPrismaErrorMeta = {
  target?: string[];
  driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
};

// Custom P2002 error class for testing unique constraint violations
export class MockPrismaClientKnownRequestError extends Error {
  code: string;
  meta?: MockPrismaErrorMeta;

  constructor(message: string, { code, meta }: { code: string; meta?: MockPrismaErrorMeta }) {
    super(message);
    this.name = "PrismaClientKnownRequestError";
    this.code = code;
    this.meta = meta;
  }
}

export function createPrismaMock(): {
  default: DeepMockProxy<PrismaClient>;
  prisma: DeepMockProxy<PrismaClient>;
  Prisma: { PrismaClientKnownRequestError: typeof MockPrismaClientKnownRequestError };
} {
  return {
    default: prismaMock,
    prisma: prismaMock,
    Prisma: { PrismaClientKnownRequestError: MockPrismaClientKnownRequestError },
  };
}

// P2002 error factories
export function createP2002Error(target: string[]): MockPrismaClientKnownRequestError {
  return new MockPrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    meta: { target },
  });
}

/**
 * The shape Prisma actually throws when running through a driver adapter: `meta.target` is absent
 * and the offending columns are nested under the adapter error instead.
 */
export function createP2002DriverAdapterError(fields: string[]): MockPrismaClientKnownRequestError {
  return new MockPrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    meta: { driverAdapterError: { cause: { constraint: { fields } } } },
  });
}

export function createP2002ErrorWithoutTarget(): MockPrismaClientKnownRequestError {
  return new MockPrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    meta: {},
  });
}

export function createGenericPrismaError(): MockPrismaClientKnownRequestError {
  return new MockPrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    meta: {},
  });
}
