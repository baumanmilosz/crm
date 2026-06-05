# Client Detail View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only `/clients/:id` page showing client info and their related projects, tasks, and notes in tabs.

**Architecture:** Three new filtered API functions (one per module) plus `getClient(id)` hit existing backend endpoints that already support `clientId` query param filtering. `ClientDetailPage` uses four separate `useQuery` hooks with scoped query keys so they don't collide with the full-list caches on other pages.

**Tech Stack:** React, React Router v7 (`useParams`), TanStack Query, Ant Design 5 (Tabs, Table, List, Tag, Descriptions)

---

## File Map

- **Modify:** `client/src/api/clients.ts` — add `getClient(id)`
- **Modify:** `client/src/api/projects.ts` — add `getProjectsByClient(clientId)`
- **Modify:** `client/src/api/tasks.ts` — add `getTasksByClient(clientId)`
- **Modify:** `client/src/api/notes.ts` — add `getNotesByClient(clientId)`
- **Create:** `client/src/pages/ClientDetailPage.tsx` — full detail page with tabs
- **Modify:** `client/src/App.tsx` — add `<Route path="clients/:id" element={<ClientDetailPage />} />`
- **Modify:** `client/src/pages/ClientsPage.tsx` — add "View" button in Actions column

---

### Task 1: API additions

**Files:**
- Modify: `client/src/api/clients.ts`
- Modify: `client/src/api/projects.ts`
- Modify: `client/src/api/tasks.ts`
- Modify: `client/src/api/notes.ts`

- [ ] **Step 1: Add `getClient` to `client/src/api/clients.ts`**

Add after the existing `getClients` function:

```ts
export async function getClient(id: string): Promise<Client> {
  const { data } = await api.get<{ data: Client }>(`/clients/${id}`)
  return data.data
}
```

- [ ] **Step 2: Add `getProjectsByClient` to `client/src/api/projects.ts`**

Add after the existing `getProjects` function:

```ts
export async function getProjectsByClient(clientId: string): Promise<Project[]> {
  const { data } = await api.get<ListResponse>('/projects', { params: { clientId } })
  return data.data
}
```

- [ ] **Step 3: Add `getTasksByClient` to `client/src/api/tasks.ts`**

Add after the existing `getTasks` function:

```ts
export async function getTasksByClient(clientId: string): Promise<Task[]> {
  const { data } = await api.get<ListResponse>('/tasks', { params: { clientId } })
  return data.data
}
```

- [ ] **Step 4: Add `getNotesByClient` to `client/src/api/notes.ts`**

Add after the existing `getNotes` function:

```ts
export async function getNotesByClient(clientId: string): Promise<Note[]> {
  const { data } = await api.get<ListResponse>('/notes', { params: { clientId } })
  return data.data
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS, no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/api/
git commit -m "feat: add filtered API functions for client detail view"
```

---

### Task 2: ClientDetailPage

**Files:**
- Create: `client/src/pages/ClientDetailPage.tsx`

- [ ] **Step 1: Create `client/src/pages/ClientDetailPage.tsx`**

```tsx
import { Button, Tabs, Table, List, Card, Tag, Typography, Spin, Descriptions } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getClient } from '../api/clients'
import { getProjectsByClient } from '../api/projects'
import { getTasksByClient } from '../api/tasks'
import { getNotesByClient } from '../api/notes'
import type { Project, ProjectStatus, Task, TaskStatus, Note } from '../types'
import dayjs from 'dayjs'

const projectStatusColors: Record<ProjectStatus, string> = {
  ACTIVE: 'green',
  COMPLETED: 'blue',
  CANCELLED: 'red',
}

const taskStatusColors: Record<TaskStatus, string> = {
  PENDING: 'default',
  IN_PROGRESS: 'processing',
  DONE: 'success',
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['client', id],
    queryFn: () => getClient(id!),
    enabled: !!id,
  })

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects', 'byClient', id],
    queryFn: () => getProjectsByClient(id!),
    enabled: !!id,
  })

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks', 'byClient', id],
    queryFn: () => getTasksByClient(id!),
    enabled: !!id,
  })

  const { data: notes = [], isLoading: loadingNotes } = useQuery({
    queryKey: ['notes', 'byClient', id],
    queryFn: () => getNotesByClient(id!),
    enabled: !!id,
  })

  if (loadingClient) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
  if (!client) return <Typography.Text type="danger">Klient nie znaleziony.</Typography.Text>

  const projectColumns = [
    { title: 'Nazwa', dataIndex: 'name', key: 'name' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: ProjectStatus) => <Tag color={projectStatusColors[s]}>{s}</Tag>,
    },
    {
      title: 'Wartość',
      dataIndex: 'value',
      key: 'value',
      render: (v?: string) => (v ? `${parseFloat(v).toFixed(0)} zł` : '-'),
    },
  ]

  const taskColumns = [
    { title: 'Tytuł', dataIndex: 'title', key: 'title' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: TaskStatus) => <Tag color={taskStatusColors[s]}>{s}</Tag>,
    },
    {
      title: 'Termin',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (d?: string) => (d ? dayjs(d).format('YYYY-MM-DD') : '-'),
    },
    {
      title: 'Czas',
      dataIndex: 'timeSpentSeconds',
      key: 'timeSpentSeconds',
      render: (s: number) => formatTime(s),
    },
  ]

  const tabItems = [
    {
      key: 'projects',
      label: `Projekty (${projects.length})`,
      children: (
        <Table
          rowKey="id"
          dataSource={projects}
          columns={projectColumns}
          loading={loadingProjects}
          pagination={false}
        />
      ),
    },
    {
      key: 'tasks',
      label: `Taski (${tasks.length})`,
      children: (
        <Table
          rowKey="id"
          dataSource={tasks}
          columns={taskColumns}
          loading={loadingTasks}
          pagination={false}
        />
      ),
    },
    {
      key: 'notes',
      label: `Notatki (${notes.length})`,
      children: (
        <List
          loading={loadingNotes}
          dataSource={notes}
          rowKey="id"
          locale={{ emptyText: 'Brak notatek' }}
          renderItem={(note: Note) => (
            <List.Item>
              <Card style={{ width: '100%' }} size="small">
                <Typography.Paragraph style={{ marginBottom: 4 }}>{note.content}</Typography.Paragraph>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(note.createdAt).format('YYYY-MM-DD HH:mm')}
                </Typography.Text>
              </Card>
            </List.Item>
          )}
        />
      ),
    },
  ]

  return (
    <>
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => navigate('/clients')}
        style={{ marginBottom: 16, paddingLeft: 0 }}
      >
        Klienci
      </Button>

      <Typography.Title level={3} style={{ marginBottom: 4 }}>{client.name}</Typography.Title>

      <Descriptions style={{ marginBottom: 24 }} size="small">
        {client.email && <Descriptions.Item label="Email">{client.email}</Descriptions.Item>}
        {client.phone && <Descriptions.Item label="Telefon">{client.phone}</Descriptions.Item>}
        {client.company && <Descriptions.Item label="Firma">{client.company}</Descriptions.Item>}
      </Descriptions>

      <Tabs items={tabItems} />
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
git add client/src/pages/ClientDetailPage.tsx
git commit -m "feat: add ClientDetailPage with projects, tasks and notes tabs"
```

---

### Task 3: Wire routing and ClientsPage

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/pages/ClientsPage.tsx`

- [ ] **Step 1: Update `client/src/App.tsx`**

Add `ClientDetailPage` import and route. Full file:

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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Add "View" button to `client/src/pages/ClientsPage.tsx`**

Import `useNavigate` and add a "View" button in the Actions column. Find the `columns` array in `ClientsPage.tsx` and update the Actions column render function:

```tsx
// Add at the top of the component (after existing hooks):
const navigate = useNavigate()
```

Update the Actions column (replace existing render):

```tsx
{
  title: 'Actions',
  key: 'actions',
  render: (_: unknown, record: Client) => (
    <Space>
      <Button size="small" onClick={() => navigate(`/clients/${record.id}`)}>View</Button>
      <Button size="small" onClick={() => openEdit(record)}>Edit</Button>
      <Popconfirm title="Delete this client?" onConfirm={() => deleteMutation.mutate(record.id)}>
        <Button size="small" danger>Delete</Button>
      </Popconfirm>
    </Space>
  ),
},
```

Also add `useNavigate` to the react-router-dom import at the top of `ClientsPage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS, no errors.

- [ ] **Step 4: Manual test**

1. Start backend (`npm run dev`) and frontend (`cd client && npm run dev`)
2. Navigate to `/clients`
3. Click "View" on any client → should navigate to `/clients/:id`
4. Verify client name, email/phone/company show in header
5. Verify Projekty tab shows the client's projects with status badges
6. Verify Taski tab shows the client's tasks with status, due date, time
7. Verify Notatki tab shows the client's notes with timestamps
8. Tab labels show counts in parentheses
9. Click "← Klienci" button → returns to `/clients`

- [ ] **Step 5: Commit**

```bash
git add client/src/App.tsx client/src/pages/ClientsPage.tsx
git commit -m "feat: wire client detail route and add View button to ClientsPage"
```
