import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { createProjectSchema, updateProjectSchema } from '../validators/projects.validators'
import {
  listProjectsController,
  getProjectController,
  createProjectController,
  updateProjectController,
  deleteProjectController,
} from '../controllers/projects.controller'

export const projectsRouter = Router()

projectsRouter.use(authMiddleware)
projectsRouter.get('/', listProjectsController)
projectsRouter.post('/', validate(createProjectSchema), createProjectController)
projectsRouter.get('/:id', getProjectController)
projectsRouter.put('/:id', validate(updateProjectSchema), updateProjectController)
projectsRouter.delete('/:id', deleteProjectController)
