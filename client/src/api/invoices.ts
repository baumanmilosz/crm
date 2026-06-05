import api from './axios'
import type { Invoice, InvoiceStatus, VatRate } from '../types'

type ListResponse = { data: Invoice[] }
type SingleResponse = { data: Invoice }

export type InvoiceItemInput = {
  description: string
  quantity: string
  unitPrice: string
  vatRate: VatRate
}

export type InvoiceInput = {
  number: string
  issueDate: string
  dueDate: string
  clientId: string
  projectId?: string
  notes?: string
  items: InvoiceItemInput[]
}

export async function getInvoices(): Promise<Invoice[]> {
  const { data } = await api.get<ListResponse>('/invoices')
  return data.data
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await api.get<SingleResponse>(`/invoices/${id}`)
  return data.data
}

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const { data } = await api.post<SingleResponse>('/invoices', input)
  return data.data
}

export async function updateInvoice(id: string, input: InvoiceInput): Promise<Invoice> {
  const { data } = await api.put<SingleResponse>(`/invoices/${id}`, input)
  return data.data
}

export async function patchInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
  const { data } = await api.patch<SingleResponse>(`/invoices/${id}/status`, { status })
  return data.data
}

export async function deleteInvoice(id: string): Promise<void> {
  await api.delete(`/invoices/${id}`)
}
