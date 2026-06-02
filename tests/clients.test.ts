import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { clearDatabase, testPrisma } from './helpers/db'
import { createUserAndGetToken } from './helpers/auth'

describe('Clients', () => {
  let token: string

  beforeEach(async () => {
    await clearDatabase()
    const auth = await createUserAndGetToken()
    token = auth.token
  })
  afterAll(async () => { await testPrisma.$disconnect() })

  describe('GET /api/clients', () => {
    it('returns empty list when no clients exist', async () => {
      const res = await request(app).get('/api/clients').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(res.body.meta.total).toBe(0)
    })

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/clients')
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/clients', () => {
    it('creates a client and returns 201', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Acme Corp', email: 'contact@acme.com', company: 'Acme' })
      expect(res.status).toBe(201)
      expect(res.body.data.name).toBe('Acme Corp')
      expect(res.body.data.id).toBeDefined()
    })

    it('returns 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'contact@acme.com' })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/clients/:id', () => {
    it('returns the client by id', async () => {
      const created = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Acme Corp' })
      const res = await request(app)
        .get(`/api/clients/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Acme Corp')
    })

    it('returns 404 for unknown id', async () => {
      const res = await request(app)
        .get('/api/clients/nonexistent-id')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/clients/:id', () => {
    it('updates the client', async () => {
      const created = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Acme Corp' })
      const res = await request(app)
        .put(`/api/clients/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Acme Updated', email: 'new@acme.com' })
      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Acme Updated')
    })
  })

  describe('DELETE /api/clients/:id', () => {
    it('deletes the client and returns 204', async () => {
      const created = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Acme Corp' })
      const res = await request(app)
        .delete(`/api/clients/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(204)
    })
  })
})
