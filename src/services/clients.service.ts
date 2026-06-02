import { prisma } from '../lib/prisma'

export async function listClients(page: number, limit: number) {
  const [data, total] = await Promise.all([
    prisma.client.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.count(),
  ])
  return { data, meta: { page, limit, total } }
}

export async function getClient(id: string) {
  return prisma.client.findUniqueOrThrow({ where: { id } })
}

export async function createClient(data: { name: string; email?: string; phone?: string; company?: string }) {
  return prisma.client.create({ data })
}

export async function updateClient(
  id: string,
  data: { name?: string; email?: string; phone?: string; company?: string }
) {
  return prisma.client.update({ where: { id }, data })
}

export async function deleteClient(id: string) {
  return prisma.client.delete({ where: { id } })
}
