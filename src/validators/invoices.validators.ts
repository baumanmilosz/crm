import { z } from 'zod'

const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
  vatRate: z.enum(['VAT_23', 'VAT_8', 'VAT_5', 'VAT_0', 'ZW', 'NP']),
})

export const createInvoiceSchema = z.object({
  number: z.string().min(1),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  clientId: z.string().min(1),
  projectId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
})

export const updateInvoiceSchema = createInvoiceSchema

export const patchInvoiceStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ISSUED', 'PAID']),
})
