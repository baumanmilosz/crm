import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  clientId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
})

export const patchStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE']),
})
