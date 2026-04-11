import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getMissingEnvErrorMessage, hasDatabaseUrl } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

function createMissingPrismaClient(): PrismaClient {
  const message = getMissingEnvErrorMessage();

  return new Proxy(
    {},
    {
      get() {
        throw new Error(message);
      },
    },
  ) as PrismaClient;
}

const prismaClient =
  globalForPrisma.prisma ??
  (hasDatabaseUrl() ? createPrismaClient() : createMissingPrismaClient());

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production" && hasDatabaseUrl()) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
