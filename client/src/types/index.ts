export type User = {
  id: string
  email: string
  name: string
}

export type Client = {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  createdAt: string
}

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export type Project = {
  id: string
  name: string
  status: ProjectStatus
  value?: string
  clientId: string
  client: Client
  createdAt: string
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE'

export type Task = {
  id: string
  title: string
  status: TaskStatus
  dueDate?: string
  userId: string
  clientId?: string
  client?: Client
  projectId?: string
  project?: Project
  createdAt: string
}

export type Note = {
  id: string
  content: string
  userId: string
  clientId?: string
  client?: Client
  projectId?: string
  project?: Project
  createdAt: string
}
