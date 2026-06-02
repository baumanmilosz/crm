import { Request, Response, NextFunction } from 'express'
import * as clientsService from '../services/clients.service'

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: List all clients
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: List of clients with pagination meta }
 */
export async function listClientsController(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'))))
    const result = await clientsService.listClients(page, limit)
    res.json(result)
  } catch (err) { next(err) }
}

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Get a client by ID
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Client found }
 *       404: { description: Client not found }
 */
export async function getClientController(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientsService.getClient(req.params.id as string)
    res.json({ data: client })
  } catch (err) { next(err) }
}

/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Create a new client
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               company: { type: string }
 *     responses:
 *       201: { description: Client created }
 */
export async function createClientController(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientsService.createClient(req.body)
    res.status(201).json({ data: client })
  } catch (err) { next(err) }
}

/**
 * @swagger
 * /api/clients/{id}:
 *   put:
 *     summary: Update a client
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Client updated }
 *       404: { description: Client not found }
 */
export async function updateClientController(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientsService.updateClient(req.params.id as string, req.body)
    res.json({ data: client })
  } catch (err) { next(err) }
}

/**
 * @swagger
 * /api/clients/{id}:
 *   delete:
 *     summary: Delete a client
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Client deleted }
 *       404: { description: Client not found }
 */
export async function deleteClientController(req: Request, res: Response, next: NextFunction) {
  try {
    await clientsService.deleteClient(req.params.id as string)
    res.status(204).send()
  } catch (err) { next(err) }
}
