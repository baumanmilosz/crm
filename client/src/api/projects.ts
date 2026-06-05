import api from './axios'
import type { Project, ProjectStatus } from '../types'

type ListResponse = { data: Project[] }
type SingleResponse = { data: Project }

export type ProjectInput = {
  name: string
  status: ProjectStatus
  value?: string
  clientId: string
}

export async function getProjects(): Promise<Project[]> {
  const { data } = await api.get<ListResponse>('/projects')
  return data.data
}

export async function getProjectsByClient(clientId: string): Promise<Project[]> {
  const { data } = await api.get<ListResponse>('/projects', { params: { clientId } })
  return data.data
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const { data } = await api.post<SingleResponse>('/projects', input)
  return data.data
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const { data } = await api.put<SingleResponse>(`/projects/${id}`, input)
  return data.data
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`)
}
