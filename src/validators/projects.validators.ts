import { z } from 'zod'

export const createProjectSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().min(1),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  value: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  value: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
})
