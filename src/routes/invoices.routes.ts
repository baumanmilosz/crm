import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { createInvoiceSchema, updateInvoiceSchema, patchInvoiceStatusSchema } from '../validators/invoices.validators'
import {
  listInvoicesController,
  getInvoiceController,
  createInvoiceController,
  updateInvoiceController,
  patchInvoiceStatusController,
  deleteInvoiceController,
} from '../controllers/invoices.controller'

export const invoicesRouter = Router()

invoicesRouter.use(authMiddleware)
invoicesRouter.get('/', listInvoicesController)
invoicesRouter.post('/', validate(createInvoiceSchema), createInvoiceController)
invoicesRouter.get('/:id', getInvoiceController)
invoicesRouter.put('/:id', validate(updateInvoiceSchema), updateInvoiceController)
invoicesRouter.patch('/:id/status', validate(patchInvoiceStatusSchema), patchInvoiceStatusController)
invoicesRouter.delete('/:id', deleteInvoiceController)
