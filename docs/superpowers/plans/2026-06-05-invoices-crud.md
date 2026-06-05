# Invoices CRUD + Line Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full invoice management module — backend CRUD + frontend list/form/detail pages with dynamic line items and VAT calculations.

**Architecture:** Two new Prisma models (`Invoice`, `InvoiceItem`) with `InvoiceStatus` and `VatRate` enums. Backend follows the existing service/controller/validator/route pattern. Frontend has three dedicated pages: list, full-page form (create/edit), detail. Items state is managed as a React state array separate from the Ant Design Form (which handles only header fields); totals are computed on the fly.

**Tech Stack:** Prisma 7, Zod 4, Express 5, React 19, Ant Design 5, TanStack Query v5, React Router v7

---

## File Map

**Backend (new):**
- `src/validators/invoices.validators.ts`
- `src/services/invoices.service.ts`
- `src/controllers/invoices.controller.ts`
- `src/routes/invoices.routes.ts`

**Backend (modify):**
- `prisma/schema.prisma` — add Invoice, InvoiceItem, enums, relations
- `src/app.ts` — register invoicesRouter

**Frontend (new):**
- `client/src/pages/InvoicesPage.tsx`
- `client/src/pages/InvoiceFormPage.tsx`
- `client/src/pages/InvoiceDetailPage.tsx`
- `client/src/api/invoices.ts`

**Frontend (modify):**
- `client/src/types/index.ts` — add Invoice, InvoiceItem, InvoiceStatus, VatRate
- `client/src/App.tsx` — add 4 invoice routes
- `client/src/components/AppLayout.tsx` — add Faktury sidebar item

---

### Task 1: Backend — schema + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums and models to `prisma/schema.prisma`**

Add the two enums after existing enums (`TaskStatus`):

```prisma
enum InvoiceStatus {
  DRAFT
  ISSUED
  PAID
}

enum VatRate {
  VAT_23
  VAT_8
  VAT_5
  VAT_0
  ZW
  NP
}
```

Add the two models after the `Task` model:

```prisma
model Invoice {
  id        String        @id @default(cuid())
  number    String
  issueDate DateTime
  dueDate   DateTime
  status    InvoiceStatus @default(DRAFT)
  notes     String?
  clientId  String
  client    Client        @relation(fields: [clientId], references: [id])
  projectId String?
  project   Project?      @relation(fields: [projectId], references: [id])
  userId    String
  user      User          @relation(fields: [userId], references: [id])
  items     InvoiceItem[]
  createdAt DateTime      @default(now())
}

model InvoiceItem {
  id          String   @id @default(cuid())
  description String
  quantity    Decimal
  unitPrice   Decimal
  vatRate     VatRate
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
}
```

Add `invoices Invoice[]` to the `User`, `Client`, and `Project` models:

In `model User`, add after `tasks Task[]`:
```prisma
  invoices  Invoice[]
```

In `model Client`, add after `tasks Task[]`:
```prisma
  invoices  Invoice[]
```

In `model Project`, add after `tasks Task[]`:
```prisma
  invoices  Invoice[]
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-invoices
```

Expected: migration applied, Prisma client regenerated.

- [ ] **Step 3: Restore `src/generated/prisma/index.ts` if deleted**

```bash
ls src/generated/prisma/index.ts
```

If missing (Prisma 7 sometimes deletes it), recreate:

```ts
// src/generated/prisma/index.ts
export * from './client'
```

- [ ] **Step 4: Verify TypeScript (backend)**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/generated/
git commit -m "feat: add Invoice and InvoiceItem models to schema"
```

---

### Task 2: Backend — validators, service, controller, route

**Files:**
- Create: `src/validators/invoices.validators.ts`
- Create: `src/services/invoices.service.ts`
- Create: `src/controllers/invoices.controller.ts`
- Create: `src/routes/invoices.routes.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Create `src/validators/invoices.validators.ts`**

```ts
import { z } from 'zod'

const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
  vatRate: z.enum(['VAT_23', 'VAT_8', 'VAT_5', 'VAT_0', 'ZW', 'NP']),
})

export const createInvoiceSchema = z.object({
  number: z.string().min(1),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  clientId: z.string().min(1),
  projectId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
})

export const updateInvoiceSchema = createInvoiceSchema

export const patchInvoiceStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ISSUED', 'PAID']),
})
```

- [ ] **Step 2: Create `src/services/invoices.service.ts`**

```ts
import { InvoiceStatus } from '../generated/prisma'
import { prisma } from '../lib/prisma'

type ItemInput = {
  description: string
  quantity: string
  unitPrice: string
  vatRate: 'VAT_23' | 'VAT_8' | 'VAT_5' | 'VAT_0' | 'ZW' | 'NP'
}

type InvoiceInput = {
  number: string
  issueDate: string
  dueDate: string
  clientId: string
  projectId?: string
  notes?: string
  items: ItemInput[]
}

const includeRelations = {
  client: true,
  project: true,
  items: { orderBy: { createdAt: 'asc' as const } },
}

export async function listInvoices(userId: string) {
  return prisma.invoice.findMany({
    where: { userId },
    include: includeRelations,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getInvoice(id: string, userId: string) {
  return prisma.invoice.findFirstOrThrow({
    where: { id, userId },
    include: includeRelations,
  })
}

export async function createInvoice(data: InvoiceInput, userId: string) {
  return prisma.invoice.create({
    data: {
      number: data.number,
      issueDate: new Date(data.issueDate),
      dueDate: new Date(data.dueDate),
      clientId: data.clientId,
      projectId: data.projectId,
      notes: data.notes,
      userId,
      items: { create: data.items },
    },
    include: includeRelations,
  })
}

export async function updateInvoice(id: string, userId: string, data: InvoiceInput) {
  await prisma.invoice.findFirstOrThrow({ where: { id, userId } })
  return prisma.$transaction(async tx => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })
    return tx.invoice.update({
      where: { id },
      data: {
        number: data.number,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        clientId: data.clientId,
        projectId: data.projectId,
        notes: data.notes,
        items: { create: data.items },
      },
      include: includeRelations,
    })
  })
}

export async function patchInvoiceStatus(id: string, userId: string, status: InvoiceStatus) {
  await prisma.invoice.findFirstOrThrow({ where: { id, userId } })
  return prisma.invoice.update({ where: { id }, data: { status } })
}

export async function deleteInvoice(id: string, userId: string) {
  await prisma.invoice.findFirstOrThrow({ where: { id, userId } })
  return prisma.invoice.delete({ where: { id } })
}
```

- [ ] **Step 3: Create `src/controllers/invoices.controller.ts`**

```ts
import { Request, Response, NextFunction } from 'express'
import { InvoiceStatus } from '../generated/prisma'
import * as invoicesService from '../services/invoices.service'

export async function listInvoicesController(req: Request, res: Response, next: NextFunction) {
  try {
    const invoices = await invoicesService.listInvoices(req.user!.id)
    res.json({ data: invoices })
  } catch (err) { next(err) }
}

export async function getInvoiceController(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.getInvoice(req.params.id as string, req.user!.id)
    res.json({ data: invoice })
  } catch (err) { next(err) }
}

export async function createInvoiceController(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.createInvoice(req.body, req.user!.id)
    res.status(201).json({ data: invoice })
  } catch (err) { next(err) }
}

export async function updateInvoiceController(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.updateInvoice(req.params.id as string, req.user!.id, req.body)
    res.json({ data: invoice })
  } catch (err) { next(err) }
}

export async function patchInvoiceStatusController(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.patchInvoiceStatus(
      req.params.id as string,
      req.user!.id,
      req.body.status as InvoiceStatus,
    )
    res.json({ data: invoice })
  } catch (err) { next(err) }
}

export async function deleteInvoiceController(req: Request, res: Response, next: NextFunction) {
  try {
    await invoicesService.deleteInvoice(req.params.id as string, req.user!.id)
    res.status(204).send()
  } catch (err) { next(err) }
}
```

- [ ] **Step 4: Create `src/routes/invoices.routes.ts`**

```ts
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { createInvoiceSchema, updateInvoiceSchema, patchInvoiceStatusSchema } from '../validators/invoices.validators'
import {
  listInvoicesController,
  getInvoiceController,
  createInvoiceController,
  updateInvoiceController,
  patchInvoiceStatusController,
  deleteInvoiceController,
} from '../controllers/invoices.controller'

export const invoicesRouter = Router()

invoicesRouter.use(authMiddleware)
invoicesRouter.get('/', listInvoicesController)
invoicesRouter.post('/', validate(createInvoiceSchema), createInvoiceController)
invoicesRouter.get('/:id', getInvoiceController)
invoicesRouter.put('/:id', validate(updateInvoiceSchema), updateInvoiceController)
invoicesRouter.patch('/:id/status', validate(patchInvoiceStatusSchema), patchInvoiceStatusController)
invoicesRouter.delete('/:id', deleteInvoiceController)
```

- [ ] **Step 5: Register router in `src/app.ts`**

Add import after the tasksRouter import:
```ts
import { invoicesRouter } from './routes/invoices.routes'
```

Add route after `app.use('/api/tasks', tasksRouter)`:
```ts
app.use('/api/invoices', invoicesRouter)
```

- [ ] **Step 6: Verify TypeScript (backend)**

```bash
npx tsc --noEmit
```

Expected: PASS, no errors.

- [ ] **Step 7: Commit**

```bash
git add src/validators/invoices.validators.ts src/services/invoices.service.ts src/controllers/invoices.controller.ts src/routes/invoices.routes.ts src/app.ts
git commit -m "feat: add invoices backend — service, controller, routes"
```

---

### Task 3: Frontend — types + API module

**Files:**
- Modify: `client/src/types/index.ts`
- Create: `client/src/api/invoices.ts`

- [ ] **Step 1: Add invoice types to `client/src/types/index.ts`**

Add after the `Note` type:

```ts
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
```

- [ ] **Step 2: Create `client/src/api/invoices.ts`**

```ts
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
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/types/index.ts client/src/api/invoices.ts
git commit -m "feat: add Invoice types and API module"
```

---

### Task 4: Frontend — InvoicesPage (list)

**Files:**
- Create: `client/src/pages/InvoicesPage.tsx`

- [ ] **Step 1: Create `client/src/pages/InvoicesPage.tsx`**

```tsx
import { Table, Button, Tag, Popconfirm, Space, Typography, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoices, deleteInvoice } from '../api/invoices'
import type { Invoice, InvoiceStatus, VatRate } from '../types'
import dayjs from 'dayjs'

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: 'default',
  ISSUED: 'processing',
  PAID: 'success',
}

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Szkic',
  ISSUED: 'Wystawiona',
  PAID: 'Opłacona',
}

const vatMultiplier: Record<VatRate, number> = {
  VAT_23: 0.23, VAT_8: 0.08, VAT_5: 0.05, VAT_0: 0, ZW: 0, NP: 0,
}

function computeGross(invoice: Invoice): number {
  return invoice.items.reduce((sum, item) => {
    const net = parseFloat(item.quantity) * parseFloat(item.unitPrice)
    return sum + net + net * vatMultiplier[item.vatRate]
  }, 0)
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: getInvoices,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    onError: () => messageApi.error('Błąd podczas usuwania faktury'),
  })

  const columns = [
    { title: 'Numer', dataIndex: 'number', key: 'number' },
    { title: 'Klient', key: 'client', render: (_: unknown, r: Invoice) => r.client.name },
    {
      title: 'Data wystawienia',
      dataIndex: 'issueDate',
      key: 'issueDate',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD'),
    },
    {
      title: 'Termin',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: InvoiceStatus) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag>,
    },
    {
      title: 'Brutto',
      key: 'gross',
      render: (_: unknown, r: Invoice) => `${computeGross(r).toFixed(2)} zł`,
    },
    {
      title: 'Akcje',
      key: 'actions',
      render: (_: unknown, record: Invoice) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/invoices/${record.id}`)}>Podgląd</Button>
          <Popconfirm title="Usunąć fakturę?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button size="small" danger>Usuń</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Faktury</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>
          Nowa faktura
        </Button>
      </div>
      <Table rowKey="id" dataSource={invoices} columns={columns} loading={isLoading} />
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/InvoicesPage.tsx
git commit -m "feat: add InvoicesPage with invoice list"
```

---

### Task 5: Frontend — InvoiceFormPage (create/edit)

**Files:**
- Create: `client/src/pages/InvoiceFormPage.tsx`

- [ ] **Step 1: Create `client/src/pages/InvoiceFormPage.tsx`**

```tsx
import { useState, useEffect } from 'react'
import {
  Form, Input, Button, Select, DatePicker, Table, Typography, Space, message, Divider,
} from 'antd'
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoice, createInvoice, updateInvoice, type InvoiceItemInput } from '../api/invoices'
import { getClients } from '../api/clients'
import { getProjects } from '../api/projects'
import type { VatRate } from '../types'
import dayjs from 'dayjs'

const vatRateOptions = [
  { value: 'VAT_23', label: '23%' },
  { value: 'VAT_8', label: '8%' },
  { value: 'VAT_5', label: '5%' },
  { value: 'VAT_0', label: '0%' },
  { value: 'ZW', label: 'zw.' },
  { value: 'NP', label: 'np.' },
]

const vatMultiplier: Record<VatRate, number> = {
  VAT_23: 0.23, VAT_8: 0.08, VAT_5: 0.05, VAT_0: 0, ZW: 0, NP: 0,
}

type ItemRow = { key: number; description: string; quantity: string; unitPrice: string; vatRate: VatRate }

type HeaderValues = {
  number: string
  issueDate: dayjs.Dayjs
  dueDate: dayjs.Dayjs
  clientId: string
  projectId?: string
  notes?: string
}

let nextKey = 0
function blankItem(): ItemRow {
  return { key: nextKey++, description: '', quantity: '1', unitPrice: '0', vatRate: 'VAT_23' }
}

function computeNet(item: ItemRow) {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
}

export default function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()
  const [form] = Form.useForm<HeaderValues>()
  const [items, setItems] = useState<ItemRow[]>([blankItem()])

  const { data: existing } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: isEdit,
  })

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: getClients })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })

  useEffect(() => {
    if (!existing) return
    form.setFieldsValue({
      number: existing.number,
      issueDate: dayjs(existing.issueDate),
      dueDate: dayjs(existing.dueDate),
      clientId: existing.clientId,
      projectId: existing.projectId,
      notes: existing.notes,
    })
    setItems(existing.items.map(item => ({
      key: nextKey++,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
    })))
  }, [existing, form])

  const saveMutation = useMutation({
    mutationFn: async (values: HeaderValues) => {
      if (items.some(i => !i.description.trim())) {
        throw new Error('Każda pozycja musi mieć opis')
      }
      const itemInputs: InvoiceItemInput[] = items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        vatRate: i.vatRate,
      }))
      const payload = {
        number: values.number,
        issueDate: values.issueDate.toISOString(),
        dueDate: values.dueDate.toISOString(),
        clientId: values.clientId,
        projectId: values.projectId,
        notes: values.notes,
        items: itemInputs,
      }
      return isEdit ? updateInvoice(id!, payload) : createInvoice(payload)
    },
    onSuccess: invoice => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      navigate(`/invoices/${invoice.id}`)
    },
    onError: (err: Error) => messageApi.error(err.message || 'Błąd zapisu'),
  })

  function updateItem(index: number, field: keyof Omit<ItemRow, 'key'>, value: string) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const totalNet = items.reduce((s, i) => s + computeNet(i), 0)
  const totalVat = items.reduce((s, i) => s + computeNet(i) * vatMultiplier[i.vatRate], 0)
  const totalGross = totalNet + totalVat

  const itemColumns = [
    {
      title: 'Opis',
      key: 'description',
      render: (_: unknown, _r: ItemRow, index: number) => (
        <Input
          value={items[index].description}
          onChange={e => updateItem(index, 'description', e.target.value)}
          placeholder="Opis usługi"
        />
      ),
    },
    {
      title: 'Ilość',
      key: 'quantity',
      width: 90,
      render: (_: unknown, _r: ItemRow, index: number) => (
        <Input
          value={items[index].quantity}
          onChange={e => updateItem(index, 'quantity', e.target.value)}
        />
      ),
    },
    {
      title: 'Cena netto',
      key: 'unitPrice',
      width: 120,
      render: (_: unknown, _r: ItemRow, index: number) => (
        <Input
          value={items[index].unitPrice}
          onChange={e => updateItem(index, 'unitPrice', e.target.value)}
          suffix="zł"
        />
      ),
    },
    {
      title: 'VAT',
      key: 'vatRate',
      width: 100,
      render: (_: unknown, _r: ItemRow, index: number) => (
        <Select
          value={items[index].vatRate}
          options={vatRateOptions}
          onChange={val => updateItem(index, 'vatRate', val)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Netto',
      key: 'net',
      width: 100,
      render: (_: unknown, _r: ItemRow, index: number) => `${computeNet(items[index]).toFixed(2)} zł`,
    },
    {
      title: 'VAT kwota',
      key: 'vatAmount',
      width: 110,
      render: (_: unknown, _r: ItemRow, index: number) => {
        const net = computeNet(items[index])
        return `${(net * vatMultiplier[items[index].vatRate]).toFixed(2)} zł`
      },
    },
    {
      title: 'Brutto',
      key: 'gross',
      width: 110,
      render: (_: unknown, _r: ItemRow, index: number) => {
        const net = computeNet(items[index])
        return `${(net + net * vatMultiplier[items[index].vatRate]).toFixed(2)} zł`
      },
    },
    {
      title: '',
      key: 'remove',
      width: 50,
      render: (_: unknown, _r: ItemRow, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(index)}
          disabled={items.length === 1}
        />
      ),
    },
  ]

  return (
    <>
      {contextHolder}
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => navigate('/invoices')}
        style={{ marginBottom: 16, paddingLeft: 0 }}
      >
        Faktury
      </Button>

      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        {isEdit ? 'Edytuj fakturę' : 'Nowa faktura'}
      </Typography.Title>

      <Form form={form} layout="vertical" onFinish={values => saveMutation.mutate(values)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <Form.Item name="number" label="Numer faktury" rules={[{ required: true }]}>
            <Input placeholder="FV/1/2026" />
          </Form.Item>
          <Form.Item name="clientId" label="Klient" rules={[{ required: true }]}>
            <Select options={clients.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="issueDate" label="Data wystawienia" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="dueDate" label="Termin płatności" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="projectId" label="Projekt (opcjonalnie)">
            <Select allowClear options={projects.map(p => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="notes" label="Notatki (opcjonalnie)">
            <Input placeholder="np. Odwrotne obciążenie art. 28b" />
          </Form.Item>
        </div>

        <Divider>Pozycje</Divider>

        <Table
          rowKey="key"
          dataSource={items}
          columns={itemColumns}
          pagination={false}
          size="small"
        />

        <Button
          icon={<PlusOutlined />}
          onClick={() => setItems(prev => [...prev, blankItem()])}
          style={{ marginTop: 8, marginBottom: 16 }}
        >
          Dodaj pozycję
        </Button>

        <div style={{ textAlign: 'right', marginBottom: 24 }}>
          <Space direction="vertical" align="end">
            <Typography.Text>Razem netto: <strong>{totalNet.toFixed(2)} zł</strong></Typography.Text>
            <Typography.Text>Razem VAT: <strong>{totalVat.toFixed(2)} zł</strong></Typography.Text>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Razem brutto: {totalGross.toFixed(2)} zł
            </Typography.Title>
          </Space>
        </div>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
            {isEdit ? 'Zapisz zmiany' : 'Utwórz fakturę'}
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS, no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/InvoiceFormPage.tsx
git commit -m "feat: add InvoiceFormPage with dynamic line items and VAT calculations"
```

---

### Task 6: Frontend — InvoiceDetailPage

**Files:**
- Create: `client/src/pages/InvoiceDetailPage.tsx`

- [ ] **Step 1: Create `client/src/pages/InvoiceDetailPage.tsx`**

```tsx
import { Button, Table, Tag, Typography, Descriptions, Space, Popconfirm, message, Divider } from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoice, patchInvoiceStatus, deleteInvoice } from '../api/invoices'
import type { InvoiceItem, InvoiceStatus, VatRate } from '../types'
import dayjs from 'dayjs'

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: 'default',
  ISSUED: 'processing',
  PAID: 'success',
}

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Szkic',
  ISSUED: 'Wystawiona',
  PAID: 'Opłacona',
}

const vatRateLabels: Record<VatRate, string> = {
  VAT_23: '23%', VAT_8: '8%', VAT_5: '5%', VAT_0: '0%', ZW: 'zw.', NP: 'np.',
}

const vatMultiplier: Record<VatRate, number> = {
  VAT_23: 0.23, VAT_8: 0.08, VAT_5: 0.05, VAT_0: 0, ZW: 0, NP: 0,
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: (status: InvoiceStatus) => patchInvoiceStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => messageApi.error('Błąd zmiany statusu'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteInvoice(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      navigate('/invoices')
    },
    onError: () => messageApi.error('Błąd usuwania faktury'),
  })

  if (isLoading || !invoice) return null

  const totalNet = invoice.items.reduce((s, i) => {
    return s + parseFloat(i.quantity) * parseFloat(i.unitPrice)
  }, 0)
  const totalVat = invoice.items.reduce((s, i) => {
    const net = parseFloat(i.quantity) * parseFloat(i.unitPrice)
    return s + net * vatMultiplier[i.vatRate]
  }, 0)
  const totalGross = totalNet + totalVat

  const itemColumns = [
    { title: 'Opis', dataIndex: 'description', key: 'description' },
    { title: 'Ilość', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Cena netto', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: string) => `${parseFloat(v).toFixed(2)} zł` },
    { title: 'VAT', dataIndex: 'vatRate', key: 'vatRate', render: (v: VatRate) => vatRateLabels[v] },
    {
      title: 'Netto',
      key: 'net',
      render: (_: unknown, r: InvoiceItem) => `${(parseFloat(r.quantity) * parseFloat(r.unitPrice)).toFixed(2)} zł`,
    },
    {
      title: 'VAT kwota',
      key: 'vatAmount',
      render: (_: unknown, r: InvoiceItem) => {
        const net = parseFloat(r.quantity) * parseFloat(r.unitPrice)
        return `${(net * vatMultiplier[r.vatRate]).toFixed(2)} zł`
      },
    },
    {
      title: 'Brutto',
      key: 'gross',
      render: (_: unknown, r: InvoiceItem) => {
        const net = parseFloat(r.quantity) * parseFloat(r.unitPrice)
        return `${(net + net * vatMultiplier[r.vatRate]).toFixed(2)} zł`
      },
    },
  ]

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/invoices')} style={{ paddingLeft: 0 }}>
          Faktury
        </Button>
        <Space>
          {invoice.status === 'DRAFT' && (
            <Button icon={<EditOutlined />} onClick={() => navigate(`/invoices/${id}/edit`)}>
              Edytuj
            </Button>
          )}
          {invoice.status === 'DRAFT' && (
            <Button type="primary" onClick={() => statusMutation.mutate('ISSUED')} loading={statusMutation.isPending}>
              Wystaw
            </Button>
          )}
          {invoice.status === 'ISSUED' && (
            <Button type="primary" onClick={() => statusMutation.mutate('PAID')} loading={statusMutation.isPending}>
              Oznacz jako opłacona
            </Button>
          )}
          <Popconfirm title="Usunąć fakturę?" onConfirm={() => deleteMutation.mutate()}>
            <Button danger loading={deleteMutation.isPending}>Usuń</Button>
          </Popconfirm>
        </Space>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>{invoice.number}</Typography.Title>
        <Tag color={statusColors[invoice.status]}>{statusLabels[invoice.status]}</Tag>
      </div>

      <Descriptions bordered size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Klient">{invoice.client.name}</Descriptions.Item>
        {invoice.project && <Descriptions.Item label="Projekt">{invoice.project.name}</Descriptions.Item>}
        <Descriptions.Item label="Data wystawienia">{dayjs(invoice.issueDate).format('YYYY-MM-DD')}</Descriptions.Item>
        <Descriptions.Item label="Termin płatności">{dayjs(invoice.dueDate).format('YYYY-MM-DD')}</Descriptions.Item>
        {invoice.notes && <Descriptions.Item label="Notatki" span={3}>{invoice.notes}</Descriptions.Item>}
      </Descriptions>

      <Table rowKey="id" dataSource={invoice.items} columns={itemColumns} pagination={false} size="small" />

      <Divider />

      <div style={{ textAlign: 'right' }}>
        <Space direction="vertical" align="end">
          <Typography.Text>Razem netto: <strong>{totalNet.toFixed(2)} zł</strong></Typography.Text>
          <Typography.Text>Razem VAT: <strong>{totalVat.toFixed(2)} zł</strong></Typography.Text>
          <Typography.Title level={4} style={{ margin: 0 }}>Razem brutto: {totalGross.toFixed(2)} zł</Typography.Title>
        </Space>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/InvoiceDetailPage.tsx
git commit -m "feat: add InvoiceDetailPage with status transitions"
```

---

### Task 7: Frontend — wire routing + sidebar

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/AppLayout.tsx`

- [ ] **Step 1: Update `client/src/App.tsx`**

Full file:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import ProjectsPage from './pages/ProjectsPage'
import TasksPage from './pages/TasksPage'
import NotesPage from './pages/NotesPage'
import InvoicesPage from './pages/InvoicesPage'
import InvoiceFormPage from './pages/InvoiceFormPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spin fullscreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/new" element={<InvoiceFormPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Update `client/src/components/AppLayout.tsx`**

Add `AuditOutlined` to imports and add Faktury item to menu:

```tsx
import { Layout, Menu, Button, Typography, Space } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  AuditOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const { Sider, Header, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/clients', icon: <UserOutlined />, label: 'Clients' },
  { key: '/projects', icon: <ProjectOutlined />, label: 'Projects' },
  { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Tasks' },
  { key: '/notes', icon: <FileTextOutlined />, label: 'Notes' },
  { key: '/invoices', icon: <AuditOutlined />, label: 'Faktury' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ padding: '16px', color: 'white', fontWeight: 'bold', fontSize: 16 }}>
          CRM
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
        <div style={{ position: 'absolute', bottom: 16, width: '100%', padding: '0 16px' }}>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            style={{ color: 'rgba(255,255,255,0.65)', width: '100%', textAlign: 'left' }}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <Space>
            <Typography.Text type="secondary">{user?.email}</Typography.Text>
            <Typography.Text strong>{user?.name}</Typography.Text>
          </Space>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Manual test**

1. Start backend (`npm run dev`) and frontend (`cd client && npm run dev`)
2. Navigate to `/invoices` — should show empty list with "Nowa faktura" button
3. Click "Nowa faktura" → `/invoices/new`
4. Fill in: number=`FV/1/2026`, dates, select a client, add 2 pozycje with different VAT rates
5. Verify totals update live as you type
6. Save → should navigate to `/invoices/:id`
7. Verify detail page shows all data, status=Szkic
8. Click "Wystaw" → status changes to Wystawiona, "Wystaw" button disappears
9. Click "Oznacz jako opłacona" → status changes to Opłacona
10. Navigate back to list → invoice appears with correct gross amount

- [ ] **Step 5: Commit**

```bash
git add client/src/App.tsx client/src/components/AppLayout.tsx
git commit -m "feat: wire invoice routes and add Faktury to sidebar"
```
