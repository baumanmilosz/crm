import { Request, Response, NextFunction } from 'express'
import * as notesService from '../services/notes.service'

/**
 * @swagger
 * /api/notes:
 *   get:
 *     summary: List notes
 *     tags: [Notes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema: { type: string }
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: List of notes }
 */
export async function listNotesController(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'))))
    const result = await notesService.listNotes(
      req.user!.id,
      { clientId: req.query.clientId as string | undefined, projectId: req.query.projectId as string | undefined },
      page,
      limit
    )
    res.json(result)
  } catch (err) { next(err) }
}

export async function getNoteController(req: Request, res: Response, next: NextFunction) {
  try {
    const note = await notesService.getNote(req.params.id as string, req.user!.id)
    res.json({ data: note })
  } catch (err) { next(err) }
}

/**
 * @swagger
 * /api/notes:
 *   post:
 *     summary: Create a note
 *     tags: [Notes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *               clientId: { type: string }
 *               projectId: { type: string }
 *     responses:
 *       201: { description: Note created }
 */
export async function createNoteController(req: Request, res: Response, next: NextFunction) {
  try {
    const note = await notesService.createNote(req.body, req.user!.id)
    res.status(201).json({ data: note })
  } catch (err) { next(err) }
}

export async function updateNoteController(req: Request, res: Response, next: NextFunction) {
  try {
    const note = await notesService.updateNote(req.params.id as string, req.user!.id, req.body)
    res.json({ data: note })
  } catch (err) { next(err) }
}

export async function deleteNoteController(req: Request, res: Response, next: NextFunction) {
  try {
    await notesService.deleteNote(req.params.id as string, req.user!.id)
    res.status(204).send()
  } catch (err) { next(err) }
}
