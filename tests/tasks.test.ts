import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { clearDatabase, testPrisma } from './helpers/db'
import { createUserAndGetToken } from './helpers/auth'

describe('Tasks', () => {
  let token: string
  let clientId: string

  beforeEach(async () => {
    await clearDatabase()
    const auth = await createUserAndGetToken()
    token = auth.token
    const clientRes = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`).send({ name: 'Test Client' })
    clientId = clientRes.body.data.id
  })
  afterAll(async () => { await testPrisma.$disconnect() })

  it('creates a task with default PENDING status', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Follow up on proposal', clientId })
    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('PENDING')
  })

  it('creates a task with a dueDate', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Send invoice', dueDate: '2026-07-01T00:00:00.000Z' })
    expect(res.status).toBe(201)
    expect(res.body.data.dueDate).toBeDefined()
  })

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ clientId })
    expect(res.status).toBe(400)
  })

  it('filters by status', async () => {
    await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ title: 'T1' })
    const created = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ title: 'T2' })
    await request(app)
      .patch(`/api/tasks/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DONE' })
    const res = await request(app).get('/api/tasks?status=DONE').set('Authorization', `Bearer ${token}`)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].title).toBe('T2')
  })

  it('PATCH /status updates only the status field', async () => {
    const created = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ title: 'T1' })
    const res = await request(app)
      .patch(`/api/tasks/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_PROGRESS' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('IN_PROGRESS')
    expect(res.body.data.title).toBe('T1')
  })

  it('deletes a task', async () => {
    const created = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ title: 'T1' })
    const res = await request(app).delete(`/api/tasks/${created.body.data.id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })
})
