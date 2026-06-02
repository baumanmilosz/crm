import { Request, Response, NextFunction } from 'express'
import * as authService from '../services/auth.service'

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string }
 *     responses:
 *       201: { description: User created }
 *       400: { description: Validation error }
 *       409: { description: Email already exists }
 */
export async function registerController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.register(req.body.email, req.body.password, req.body.name)
    res.status(201).json({ data: user })
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and receive access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful, returns accessToken }
 *       401: { description: Invalid credentials }
 */
export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body.email, req.body.password)
    res
      .cookie('refreshToken', result.refreshToken, { httpOnly: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({ data: { accessToken: result.accessToken, user: result.user } })
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Get a new access token using refresh token cookie
 *     tags: [Auth]
 *     responses:
 *       200: { description: New accessToken returned }
 *       401: { description: Invalid or missing refresh token }
 */
export async function refreshController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.refresh(req.cookies.refreshToken)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and invalidate refresh token
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
export async function logoutController(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.logout(req.user!.id)
    res.clearCookie('refreshToken').json({ data: { message: 'Logged out' } })
  } catch (err) {
    next(err)
  }
}
