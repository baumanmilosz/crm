import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { authRouter } from './routes/auth.routes'
import { clientsRouter } from './routes/clients.routes'
import { projectsRouter } from './routes/projects.routes'
import { notesRouter } from './routes/notes.routes'
import { errorMiddleware } from './middleware/error.middleware'

export const app = express()

app.use(helmet())
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))

app.get('/health', (_req, res) => { res.json({ status: 'ok' }) })

app.use('/api/auth', authRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/notes', notesRouter)

app.use(errorMiddleware)
