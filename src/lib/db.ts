import { PrismaClient } from '@prisma/client'

// Force rebuild for notification model - v3
const globalForPrisma = globalThis as unknown as {
  prismaV3: PrismaClient | undefined
}

export const db =
  globalForPrisma.prismaV3 ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaV3 = db
