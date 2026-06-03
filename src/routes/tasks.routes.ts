import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { createTaskSchema, updateTaskSchema, patchStatusSchema, patchTimeSchema } from '../validators/tasks.validators'
import {
  listTasksController,
  getTaskController,
  createTaskController,
  updateTaskController,
  patchTaskStatusController,
  patchTaskTimeController,
  deleteTaskController,
} from '../controllers/tasks.controller'

export const tasksRouter = Router()

tasksRouter.use(authMiddleware)
tasksRouter.get('/', listTasksController)
tasksRouter.post('/', validate(createTaskSchema), createTaskController)
tasksRouter.get('/:id', getTaskController)
tasksRouter.put('/:id', validate(updateTaskSchema), updateTaskController)
tasksRouter.patch('/:id/status', validate(patchStatusSchema), patchTaskStatusController)
tasksRouter.patch('/:id/time', validate(patchTimeSchema), patchTaskTimeController)
tasksRouter.delete('/:id', deleteTaskController)
