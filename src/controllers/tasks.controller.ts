import { Request, Response, NextFunction } from 'express'
import { TaskStatus } from '../generated/prisma'
import * as tasksService from '../services/tasks.service'

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: List tasks
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema: { type: string }
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, IN_PROGRESS, DONE] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: List of tasks }
 */
export async function listTasksController(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'))))
    const result = await tasksService.listTasks(
      req.user!.id,
      {
        clientId: req.query.clientId as string | undefined,
        projectId: req.query.projectId as string | undefined,
        status: req.query.status as TaskStatus | undefined,
      },
      page,
      limit
    )
    res.json(result)
  } catch (err) { next(err) }
}

export async function getTaskController(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.getTask(req.params.id as string, req.user!.id)
    res.json({ data: task })
  } catch (err) { next(err) }
}

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a task
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               dueDate: { type: string, format: date-time }
 *               clientId: { type: string }
 *               projectId: { type: string }
 *     responses:
 *       201: { description: Task created }
 */
export async function createTaskController(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.createTask(req.body, req.user!.id)
    res.status(201).json({ data: task })
  } catch (err) { next(err) }
}

export async function updateTaskController(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.updateTask(req.params.id as string, req.user!.id, req.body)
    res.json({ data: task })
  } catch (err) { next(err) }
}

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Update task status
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [PENDING, IN_PROGRESS, DONE] }
 *     responses:
 *       200: { description: Task status updated }
 */
export async function patchTaskStatusController(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.patchTaskStatus(req.params.id as string, req.user!.id, req.body.status)
    res.json({ data: task })
  } catch (err) { next(err) }
}

export async function deleteTaskController(req: Request, res: Response, next: NextFunction) {
  try {
    await tasksService.deleteTask(req.params.id as string, req.user!.id)
    res.status(204).send()
  } catch (err) { next(err) }
}
