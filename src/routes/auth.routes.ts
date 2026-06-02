import { Router } from 'express'
import { validate } from '../middleware/validate.middleware'
import { authMiddleware } from '../middleware/auth.middleware'
import { registerSchema, loginSchema } from '../validators/auth.validators'
import { registerController, loginController, refreshController, logoutController } from '../controllers/auth.controller'

export const authRouter = Router()

authRouter.post('/register', validate(registerSchema), registerController)
authRouter.post('/login', validate(loginSchema), loginController)
authRouter.post('/refresh', refreshController)
authRouter.post('/logout', authMiddleware, logoutController)
