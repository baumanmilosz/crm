import api from './axios'
import type { Client } from '../types'

type ListResponse = { data: Client[] }
type SingleResponse = { data: Client }

export type ClientInput = {
  name: string
  email?: string
  phone?: string
  company?: string
}

export async function getClients(): Promise<Client[]> {
  const { data } = await api.get<ListResponse>('/clients')
  return data.data
}

export async function getClient(id: string): Promise<Client> {
  const { data } = await api.get<SingleResponse>(`/clients/${id}`)
  return data.data
}

export async function createClient(input: ClientInput): Promise<Client> {
  const { data } = await api.post<SingleResponse>('/clients', input)
  return data.data
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const { data } = await api.put<SingleResponse>(`/clients/${id}`, input)
  return data.data
}

export async function deleteClient(id: string): Promise<void> {
  await api.delete(`/clients/${id}`)
}
