import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { clearDatabase, testPrisma } from './helpers/db'
import { createUserAndGetToken } from './helpers/auth'

describe('Notes', () => {
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

  it('creates a note linked to a client', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Called to discuss pricing', clientId })
    expect(res.status).toBe(201)
    expect(res.body.data.clientId).toBe(clientId)
  })

  it('creates a note with no relations (standalone)', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'General note' })
    expect(res.status).toBe(201)
    expect(res.body.data.clientId).toBeNull()
  })

  it('returns 400 when content is missing', async () => {
    const res = await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ clientId })
    expect(res.status).toBe(400)
  })

  it('filters notes by clientId', async () => {
    await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ content: 'Note 1', clientId })
    await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ content: 'Unlinked note' })
    const res = await request(app).get(`/api/notes?clientId=${clientId}`).set('Authorization', `Bearer ${token}`)
    expect(res.body.data).toHaveLength(1)
  })

  it('deletes a note', async () => {
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ content: 'To delete', clientId })
    const res = await request(app).delete(`/api/notes/${created.body.data.id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })
})
