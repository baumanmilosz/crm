import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '../generated/prisma'

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.issues })
    return
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Resource already exists' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Resource not found' })
      return
    }
  }
  if (err instanceof Error && 'status' in err) {
    res.status((err as Error & { status: number }).status).json({ error: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
