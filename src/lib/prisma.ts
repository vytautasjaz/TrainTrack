import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  /** Bump when the Prisma schema gains/removes fields so a stale global client is dropped. */
  prismaClientEpoch?: number
}

/** Increment when Race (or other) model fields change during local development. */
const PRISMA_CLIENT_EPOCH = 9

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  const isNeon = Boolean(connectionString?.includes('neon.tech'))

  if (isNeon && connectionString) {
    const adapter = new PrismaNeon({ connectionString })
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

function getPrismaClient(): PrismaClient {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaClientEpoch === PRISMA_CLIENT_EPOCH
  ) {
    return globalForPrisma.prisma
  }

  const previous = globalForPrisma.prisma
  if (previous) {
    void previous.$disconnect().catch(() => {})
  }

  const client = createPrismaClient()
  globalForPrisma.prisma = client
  globalForPrisma.prismaClientEpoch = PRISMA_CLIENT_EPOCH
  return client
}

export const prisma = getPrismaClient()
