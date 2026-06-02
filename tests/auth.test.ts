import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { clearDatabase, testPrisma } from './helpers/db'

describe('Auth', () => {
  beforeEach(async () => { await clearDatabase() })
  afterAll(async () => { await testPrisma.$disconnect() })

  describe('POST /api/auth/register', () => {
    it('creates a user and returns 201', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: 'password123', name: 'Jane' })
      expect(res.status).toBe(201)
      expect(res.body.data).toMatchObject({ email: 'user@example.com', name: 'Jane' })
      expect(res.body.data.passwordHash).toBeUndefined()
    })

    it('returns 409 on duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: 'password123', name: 'Jane' })
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: 'password123', name: 'Jane' })
      expect(res.status).toBe(409)
    })

    it('returns 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123', name: 'Jane' })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: 'password123', name: 'Jane' })
    })

    it('returns accessToken on valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'password123' })
      expect(res.status).toBe(200)
      expect(res.body.data.accessToken).toBeDefined()
    })

    it('returns 401 on wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'wrong' })
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('returns new accessToken when refreshToken cookie is valid', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: 'password123', name: 'Jane' })
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'password123' })
      const cookie = loginRes.headers['set-cookie'] as unknown as string[]
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
      expect(res.body.data.accessToken).toBeDefined()
    })
  })

  describe('POST /api/auth/logout', () => {
    it('returns 200 and clears the refresh cookie', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: 'password123', name: 'Jane' })
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'password123' })
      const cookie = loginRes.headers['set-cookie'] as unknown as string[]
      const token = loginRes.body.data.accessToken
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
    })
  })
})
