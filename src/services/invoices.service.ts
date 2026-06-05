import { InvoiceStatus } from '../generated/prisma'
import { prisma } from '../lib/prisma'

type ItemInput = {
  description: string
  quantity: string
  unitPrice: string
  vatRate: 'VAT_23' | 'VAT_8' | 'VAT_5' | 'VAT_0' | 'ZW' | 'NP'
}

type InvoiceInput = {
  number: string
  issueDate: string
  dueDate: string
  clientId: string
  projectId?: string
  notes?: string
  items: ItemInput[]
}

const includeRelations = {
  client: true,
  project: true,
  items: { orderBy: { createdAt: 'asc' as const } },
}

export async function listInvoices(userId: string) {
  return prisma.invoice.findMany({
    where: { userId },
    include: includeRelations,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getInvoice(id: string, userId: string) {
  return prisma.invoice.findFirstOrThrow({
    where: { id, userId },
    include: includeRelations,
  })
}

export async function createInvoice(data: InvoiceInput, userId: string) {
  return prisma.invoice.create({
    data: {
      number: data.number,
      issueDate: new Date(data.issueDate),
      dueDate: new Date(data.dueDate),
      clientId: data.clientId,
      projectId: data.projectId,
      notes: data.notes,
      userId,
      items: { create: data.items },
    },
    include: includeRelations,
  })
}

export async function updateInvoice(id: string, userId: string, data: InvoiceInput) {
  await prisma.invoice.findFirstOrThrow({ where: { id, userId } })
  return prisma.$transaction(async tx => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })
    return tx.invoice.update({
      where: { id },
      data: {
        number: data.number,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        clientId: data.clientId,
        projectId: data.projectId,
        notes: data.notes,
        items: { create: data.items },
      },
      include: includeRelations,
    })
  })
}

export async function patchInvoiceStatus(id: string, userId: string, status: InvoiceStatus) {
  await prisma.invoice.findFirstOrThrow({ where: { id, userId } })
  return prisma.invoice.update({ where: { id }, data: { status } })
}

export async function deleteInvoice(id: string, userId: string) {
  await prisma.invoice.findFirstOrThrow({ where: { id, userId } })
  return prisma.invoice.delete({ where: { id } })
}
