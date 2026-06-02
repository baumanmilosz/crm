import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { createClientSchema, updateClientSchema } from '../validators/clients.validators'
import {
  listClientsController,
  getClientController,
  createClientController,
  updateClientController,
  deleteClientController,
} from '../controllers/clients.controller'

export const clientsRouter = Router()

clientsRouter.use(authMiddleware)
clientsRouter.get('/', listClientsController)
clientsRouter.post('/', validate(createClientSchema), createClientController)
clientsRouter.get('/:id', getClientController)
clientsRouter.put('/:id', validate(updateClientSchema), updateClientController)
clientsRouter.delete('/:id', deleteClientController)
