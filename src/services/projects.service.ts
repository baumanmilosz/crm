import { ProjectStatus } from '../generated/prisma'
import { prisma } from '../lib/prisma'

export async function listProjects(
  filters: { clientId?: string; status?: ProjectStatus },
  page: number,
  limit: number
) {
  const where = {
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  }
  const [data, total] = await Promise.all([
    prisma.project.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.project.count({ where }),
  ])
  return { data, meta: { page, limit, total } }
}

export async function getProject(id: string) {
  return prisma.project.findUniqueOrThrow({ where: { id }, include: { client: true } })
}

export async function createProject(data: { name: string; clientId: string; status?: ProjectStatus; value?: string }) {
  return prisma.project.create({ data })
}

export async function updateProject(id: string, data: { name?: string; status?: ProjectStatus; value?: string }) {
  return prisma.project.update({ where: { id }, data })
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } })
}
