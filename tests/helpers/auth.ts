import request from 'supertest'
import { app } from '../../src/app'
import { testPrisma } from './db'
import bcrypt from 'bcrypt'

export async function createUserAndGetToken(
  email = 'test@example.com',
  password = 'password123'
): Promise<{ token: string; userId: string }> {
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await testPrisma.user.create({
    data: { email, passwordHash, name: 'Test User' },
  })
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
  return { token: res.body.data.accessToken, userId: user.id }
}
