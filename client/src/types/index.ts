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
  timeSpentSeconds: number
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

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID'

export type VatRate = 'VAT_23' | 'VAT_8' | 'VAT_5' | 'VAT_0' | 'ZW' | 'NP'

export type InvoiceItem = {
  id: string
  description: string
  quantity: string
  unitPrice: string
  vatRate: VatRate
  invoiceId: string
  createdAt: string
}

export type Invoice = {
  id: string
  number: string
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  notes?: string
  clientId: string
  client: Client
  projectId?: string
  project?: Project
  userId: string
  items: InvoiceItem[]
  createdAt: string
}
