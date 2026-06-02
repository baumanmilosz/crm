import { Request, Response, NextFunction } from 'express'
import { ProjectStatus } from '../generated/prisma'
import * as projectsService from '../services/projects.service'

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List projects
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, COMPLETED, CANCELLED] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: List of projects }
 */
export async function listProjectsController(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'))))
    const filters = {
      clientId: req.query.clientId as string | undefined,
      status: req.query.status as ProjectStatus | undefined,
    }
    const result = await projectsService.listProjects(filters, page, limit)
    res.json(result)
  } catch (err) { next(err) }
}

export async function getProjectController(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectsService.getProject(req.params.id as string)
    res.json({ data: project })
  } catch (err) { next(err) }
}

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, clientId]
 *             properties:
 *               name: { type: string }
 *               clientId: { type: string }
 *               status: { type: string, enum: [ACTIVE, COMPLETED, CANCELLED] }
 *               value: { type: string, example: "5000.00" }
 *     responses:
 *       201: { description: Project created }
 */
export async function createProjectController(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectsService.createProject(req.body)
    res.status(201).json({ data: project })
  } catch (err) { next(err) }
}

export async function updateProjectController(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectsService.updateProject(req.params.id as string, req.body)
    res.json({ data: project })
  } catch (err) { next(err) }
}

export async function deleteProjectController(req: Request, res: Response, next: NextFunction) {
  try {
    await projectsService.deleteProject(req.params.id as string)
    res.status(204).send()
  } catch (err) { next(err) }
}
