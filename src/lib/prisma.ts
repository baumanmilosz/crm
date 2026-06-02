import { PrismaClient, Prisma } from '../generated/prisma'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma = globalForPrisma.prisma ?? new PrismaClient({} as any)
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
