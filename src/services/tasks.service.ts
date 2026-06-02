import { TaskStatus } from '../generated/prisma'
import { prisma } from '../lib/prisma'

export async function listTasks(
  userId: string,
  filters: { clientId?: string; projectId?: string; status?: TaskStatus },
  page: number,
  limit: number
) {
  const where = {
    userId,
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  }
  const [data, total] = await Promise.all([
    prisma.task.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.task.count({ where }),
  ])
  return { data, meta: { page, limit, total } }
}

export async function getTask(id: string, userId: string) {
  return prisma.task.findFirstOrThrow({ where: { id, userId } })
}

export async function createTask(
  data: { title: string; dueDate?: string; clientId?: string; projectId?: string },
  userId: string
) {
  return prisma.task.create({
    data: {
      title: data.title,
      userId,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      clientId: data.clientId,
      projectId: data.projectId,
    },
  })
}

export async function updateTask(
  id: string,
  userId: string,
  data: { title?: string; dueDate?: string | null; clientId?: string | null; projectId?: string | null }
) {
  await prisma.task.findFirstOrThrow({ where: { id, userId } })
  return prisma.task.update({
    where: { id },
    data: {
      ...data,
      dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
    },
  })
}

export async function patchTaskStatus(id: string, userId: string, status: TaskStatus) {
  await prisma.task.findFirstOrThrow({ where: { id, userId } })
  return prisma.task.update({ where: { id }, data: { status } })
}

export async function deleteTask(id: string, userId: string) {
  await prisma.task.findFirstOrThrow({ where: { id, userId } })
  return prisma.task.delete({ where: { id } })
}
