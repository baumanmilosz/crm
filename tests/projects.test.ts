import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { clearDatabase, testPrisma } from './helpers/db'
import { createUserAndGetToken } from './helpers/auth'

describe('Projects', () => {
  let token: string
  let clientId: string

  beforeEach(async () => {
    await clearDatabase()
    const auth = await createUserAndGetToken()
    token = auth.token
    const clientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Client' })
    clientId = clientRes.body.data.id
  })
  afterAll(async () => { await testPrisma.$disconnect() })

  describe('POST /api/projects', () => {
    it('creates a project linked to a client', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Website Redesign', clientId, value: '5000.00' })
      expect(res.status).toBe(201)
      expect(res.body.data.clientId).toBe(clientId)
      expect(res.body.data.status).toBe('ACTIVE')
    })

    it('returns 400 when clientId is missing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Website Redesign' })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/projects', () => {
    it('filters by clientId', async () => {
      await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`).send({ name: 'P1', clientId })
      await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`).send({ name: 'P2', clientId })
      const res = await request(app)
        .get(`/api/projects?clientId=${clientId}`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.body.data).toHaveLength(2)
    })

    it('filters by status', async () => {
      const p = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`).send({ name: 'P1', clientId })
      await request(app).put(`/api/projects/${p.body.data.id}`).set('Authorization', `Bearer ${token}`).send({ status: 'COMPLETED' })
      const res = await request(app).get('/api/projects?status=COMPLETED').set('Authorization', `Bearer ${token}`)
      expect(res.body.data).toHaveLength(1)
    })
  })

  describe('DELETE /api/projects/:id', () => {
    it('deletes the project', async () => {
      const p = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`).send({ name: 'P1', clientId })
      const res = await request(app).delete(`/api/projects/${p.body.data.id}`).set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(204)
    })
  })
})
