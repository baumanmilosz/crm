import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

const SALT_ROUNDS = 12

export async function register(email: string, password: string, name: string) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await prisma.user.create({ data: { email, passwordHash, name } })
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 })

  const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' })
  const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' })

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } }
}

export async function refresh(token: string | undefined) {
  if (!token) throw Object.assign(new Error('No refresh token'), { status: 401 })

  const user = await prisma.user.findFirst({ where: { refreshToken: token } })
  if (!user) throw Object.assign(new Error('Invalid refresh token'), { status: 401 })

  try {
    jwt.verify(token, process.env.JWT_REFRESH_SECRET!)
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 })
  }

  const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' })
  return { accessToken }
}

export async function logout(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } })
}
