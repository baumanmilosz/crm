import { z } from 'zod'

export const createNoteSchema = z.object({
  content: z.string().min(1),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
})

export const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
  clientId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
})
