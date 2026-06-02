import { PrismaClient } from '../../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

function createTestPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

export const testPrisma = createTestPrismaClient()

export async function clearDatabase() {
  await testPrisma.task.deleteMany()
  await testPrisma.note.deleteMany()
  await testPrisma.project.deleteMany()
  await testPrisma.client.deleteMany()
  await testPrisma.user.deleteMany()
}
