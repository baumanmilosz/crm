import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

export const app = express()

app.use(helmet())
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Routes and error middleware will be added in later tasks
