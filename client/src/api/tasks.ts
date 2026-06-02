import api from './axios'
import type { Task, TaskStatus } from '../types'

type ListResponse = { data: Task[] }
type SingleResponse = { data: Task }

export type TaskInput = {
  title: string
  status: TaskStatus
  dueDate?: string
  clientId?: string
  projectId?: string
}

export async function getTasks(): Promise<Task[]> {
  const { data } = await api.get<ListResponse>('/tasks')
  return data.data
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { data } = await api.post<SingleResponse>('/tasks', input)
  return data.data
}

export async function updateTask(id: string, input: TaskInput): Promise<Task> {
  const { data } = await api.put<SingleResponse>(`/tasks/${id}`, input)
  return data.data
}

export async function patchTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const { data } = await api.patch<SingleResponse>(`/tasks/${id}/status`, { status })
  return data.data
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`)
}
