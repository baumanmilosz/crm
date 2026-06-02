import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { createNoteSchema, updateNoteSchema } from '../validators/notes.validators'
import {
  listNotesController,
  getNoteController,
  createNoteController,
  updateNoteController,
  deleteNoteController,
} from '../controllers/notes.controller'

export const notesRouter = Router()

notesRouter.use(authMiddleware)
notesRouter.get('/', listNotesController)
notesRouter.post('/', validate(createNoteSchema), createNoteController)
notesRouter.get('/:id', getNoteController)
notesRouter.put('/:id', validate(updateNoteSchema), updateNoteController)
notesRouter.delete('/:id', deleteNoteController)
