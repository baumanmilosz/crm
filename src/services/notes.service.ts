import { prisma } from '../lib/prisma'

export async function listNotes(
  userId: string,
  filters: { clientId?: string; projectId?: string },
  page: number,
  limit: number
) {
  const where = {
    userId,
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
  }
  const [data, total] = await Promise.all([
    prisma.note.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.note.count({ where }),
  ])
  return { data, meta: { page, limit, total } }
}

export async function getNote(id: string, userId: string) {
  return prisma.note.findFirstOrThrow({ where: { id, userId } })
}

export async function createNote(data: { content: string; clientId?: string; projectId?: string }, userId: string) {
  return prisma.note.create({ data: { ...data, userId } })
}

export async function updateNote(
  id: string,
  userId: string,
  data: { content?: string; clientId?: string | null; projectId?: string | null }
) {
  await prisma.note.findFirstOrThrow({ where: { id, userId } })
  return prisma.note.update({ where: { id }, data })
}

export async function deleteNote(id: string, userId: string) {
  await prisma.note.findFirstOrThrow({ where: { id, userId } })
  return prisma.note.delete({ where: { id } })
}
