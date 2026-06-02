import api from './axios'
import type { User } from '../types'

type LoginResponse = { data: { accessToken: string; user: User } }
type RefreshResponse = { data: { accessToken: string } }

export async function login(email: string, password: string): Promise<{ accessToken: string; user: User }> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
  return data.data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function refresh(): Promise<string> {
  const { data } = await api.post<RefreshResponse>('/auth/refresh')
  return data.data.accessToken
}
