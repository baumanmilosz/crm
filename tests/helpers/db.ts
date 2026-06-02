import { PrismaClient } from '../../src/generated/prisma'

export const testPrisma = new PrismaClient({} as any)

export async function clearDatabase() {
  await testPrisma.task.deleteMany()
  await testPrisma.note.deleteMany()
  await testPrisma.project.deleteMany()
  await testPrisma.client.deleteMany()
  await testPrisma.user.deleteMany()
}
