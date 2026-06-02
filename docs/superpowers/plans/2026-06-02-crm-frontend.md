# CRM Frontend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vite + React + TypeScript admin panel with Ant Design 5 in the `client/` directory providing CRUD for Clients, Projects, Tasks, and Notes with JWT authentication.

**Architecture:** Monorepo — `client/` alongside the Express backend. Vite dev server proxies `/api/*` to `localhost:3000`. Access token lives in a module-level `tokenStore` read by Axios interceptors; refresh token lives in an httpOnly cookie set by the backend. AuthContext manages user state in React; session restored on app load via `POST /api/auth/refresh`.

**Tech Stack:** Vite 6, React 19, TypeScript 5, Ant Design 5, TanStack Query v5, React Router v7, Axios, dayjs

---

## File Map

```
client/
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types/index.ts
    ├── api/
    │   ├── tokenStore.ts
    │   ├── axios.ts
    │   ├── auth.ts
    │   ├── clients.ts
    │   ├── projects.ts
    │   ├── tasks.ts
    │   └── notes.ts
    ├── context/AuthContext.tsx
    ├── components/AppLayout.tsx
    └── pages/
        ├── LoginPage.tsx
        ├── ClientsPage.tsx
        ├── ProjectsPage.tsx
        ├── TasksPage.tsx
        └── NotesPage.tsx
```

Also modified: `src/app.ts` — CORS origin updated from `localhost:3000` to `localhost:5173`.

---

### Task 1: Fix CORS + scaffold `client/` project

**Files:**
- Modify: `src/app.ts`
- Create: `client/package.json`
- Create: `client/index.html`
- Create: `client/vite.config.ts`
- Create: `client/tsconfig.json`

- [ ] **Step 1: Fix CORS in `src/app.ts`**

Current line 18: `app.use(cors({ origin: 'http://localhost:3000', credentials: true }))`

Change to:

```ts
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
```

This is required so the browser sends the httpOnly refresh token cookie to the backend.

- [ ] **Step 2: Create `client/package.json`**

```json
{
  "name": "crm-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.80.0",
    "antd": "^5.24.0",
    "axios": "^1.9.0",
    "dayjs": "^1.11.13",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.6",
    "@types/react-dom": "^19.1.5",
    "@vitejs/plugin-react": "^4.5.0",
    "typescript": "^5.8.3",
    "vite": "^6.3.5"
  }
}
```

- [ ] **Step 3: Create `client/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CRM</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `client/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 5: Create `client/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Install dependencies**

```bash
cd client && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app.ts client/
git commit -m "feat: scaffold client Vite+React+TS project, fix CORS for frontend"
```

---

### Task 2: Shared types + token store + Axios instance

**Files:**
- Create: `client/src/types/index.ts`
- Create: `client/src/api/tokenStore.ts`
- Create: `client/src/api/axios.ts`

- [ ] **Step 1: Create `client/src/types/index.ts`**

```ts
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
```

- [ ] **Step 2: Create `client/src/api/tokenStore.ts`**

```ts
let token: string | null = null

export const tokenStore = {
  get: (): string | null => token,
  set: (t: string): void => { token = t },
  clear: (): void => { token = null },
}
```

- [ ] **Step 3: Create `client/src/api/axios.ts`**

```ts
import axios from 'axios'
import { tokenStore } from './tokenStore'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

api.interceptors.request.use(config => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config as typeof err.config & { _retry?: boolean }
    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) return Promise.reject(err)
      original._retry = true
      isRefreshing = true
      try {
        const { data } = await api.post<{ data: { accessToken: string } }>('/auth/refresh')
        tokenStore.set(data.data.accessToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(original)
      } catch {
        tokenStore.clear()
        localStorage.removeItem('crm_user')
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  },
)

export default api
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: errors about missing source files only (App.tsx, main.tsx not created yet) — the files we just created should have no type errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/
git commit -m "feat: add shared types, token store, and axios instance"
```

---

### Task 3: API modules

**Files:**
- Create: `client/src/api/auth.ts`
- Create: `client/src/api/clients.ts`
- Create: `client/src/api/projects.ts`
- Create: `client/src/api/tasks.ts`
- Create: `client/src/api/notes.ts`

- [ ] **Step 1: Create `client/src/api/auth.ts`**

```ts
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
```

- [ ] **Step 2: Create `client/src/api/clients.ts`**

```ts
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
```

- [ ] **Step 3: Create `client/src/api/projects.ts`**

```ts
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
```

- [ ] **Step 4: Create `client/src/api/tasks.ts`**

Backend endpoint for status: `PATCH /api/tasks/:id/status` with body `{ status }`.

```ts
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
```

- [ ] **Step 5: Create `client/src/api/notes.ts`**

```ts
import api from './axios'
import type { Note } from '../types'

type ListResponse = { data: Note[] }
type SingleResponse = { data: Note }

export type NoteInput = {
  content: string
  clientId?: string
  projectId?: string
}

export async function getNotes(): Promise<Note[]> {
  const { data } = await api.get<ListResponse>('/notes')
  return data.data
}

export async function createNote(input: NoteInput): Promise<Note> {
  const { data } = await api.post<SingleResponse>('/notes', input)
  return data.data
}

export async function deleteNote(id: string): Promise<void> {
  await api.delete(`/notes/${id}`)
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/api/
git commit -m "feat: add API modules for auth, clients, projects, tasks, notes"
```

---

### Task 4: AuthContext + App bootstrap

**Files:**
- Create: `client/src/context/AuthContext.tsx`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`

- [ ] **Step 1: Create `client/src/context/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { tokenStore } from '../api/tokenStore'
import { login as apiLogin, logout as apiLogout, refresh } from '../api/auth'
import type { User } from '../types'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('crm_user')
    if (!stored) { setLoading(false); return }
    refresh()
      .then(token => {
        tokenStore.set(token)
        setUser(JSON.parse(stored) as User)
      })
      .catch(() => localStorage.removeItem('crm_user'))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const result = await apiLogin(email, password)
    tokenStore.set(result.accessToken)
    localStorage.setItem('crm_user', JSON.stringify(result.user))
    setUser(result.user)
  }

  async function logout() {
    await apiLogout()
    tokenStore.clear()
    localStorage.removeItem('crm_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Create placeholder page files so App.tsx imports compile**

```bash
mkdir -p client/src/components client/src/pages client/src/context
printf 'export default function AppLayout() { return null }\n' > client/src/components/AppLayout.tsx
printf 'export default function LoginPage() { return null }\n' > client/src/pages/LoginPage.tsx
printf 'export default function ClientsPage() { return null }\n' > client/src/pages/ClientsPage.tsx
printf 'export default function ProjectsPage() { return null }\n' > client/src/pages/ProjectsPage.tsx
printf 'export default function TasksPage() { return null }\n' > client/src/pages/TasksPage.tsx
printf 'export default function NotesPage() { return null }\n' > client/src/pages/NotesPage.tsx
```

- [ ] **Step 3: Create `client/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import ClientsPage from './pages/ClientsPage'
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
          <Route index element={<Navigate to="/clients" replace />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="notes" element={<NotesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Create `client/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import App from './App'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS, no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/
git commit -m "feat: add AuthContext, routing, and app bootstrap"
```

---

### Task 5: AppLayout + LoginPage

**Files:**
- Modify: `client/src/components/AppLayout.tsx` (replace placeholder)
- Modify: `client/src/pages/LoginPage.tsx` (replace placeholder)

- [ ] **Step 1: Replace `client/src/components/AppLayout.tsx`**

```tsx
import { Layout, Menu, Button, Typography, Space } from 'antd'
import {
  UserOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const { Sider, Header, Content } = Layout

const menuItems = [
  { key: '/clients', icon: <UserOutlined />, label: 'Clients' },
  { key: '/projects', icon: <ProjectOutlined />, label: 'Projects' },
  { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Tasks' },
  { key: '/notes', icon: <FileTextOutlined />, label: 'Notes' },
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

- [ ] **Step 2: Replace `client/src/pages/LoginPage.tsx`**

```tsx
import { Form, Input, Button, Card, message, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type FormValues = { email: string; password: string }

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()

  async function onFinish(values: FormValues) {
    try {
      await login(values.email, values.password)
      navigate('/clients')
    } catch {
      messageApi.error('Invalid email or password')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5',
      }}
    >
      {contextHolder}
      <Card style={{ width: 360 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          CRM Login
        </Typography.Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Log in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Smoke test in browser**

Start backend: `npm run dev` (in repo root)
Start frontend: `cd client && npm run dev`

Open `http://localhost:5173` — should redirect to `/login` and show the login form. Register a user first via Swagger at `http://localhost:3000/api/docs` (POST /api/auth/register). Then log in — should redirect to `/clients` and show the sidebar.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/AppLayout.tsx client/src/pages/LoginPage.tsx
git commit -m "feat: add AppLayout with sidebar nav and LoginPage"
```

---

### Task 6: ClientsPage

**Files:**
- Modify: `client/src/pages/ClientsPage.tsx` (replace placeholder)

- [ ] **Step 1: Replace `client/src/pages/ClientsPage.tsx`**

```tsx
import { useState } from 'react'
import { Table, Button, Modal, Form, Input, Popconfirm, Space, message, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  type ClientInput,
} from '../api/clients'
import type { Client } from '../types'

export default function ClientsPage() {
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form] = Form.useForm<ClientInput>()

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  })

  const saveMutation = useMutation({
    mutationFn: (input: ClientInput) =>
      editing ? updateClient(editing.id, input) : createClient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setModalOpen(false)
      form.resetFields()
      setEditing(null)
    },
    onError: () => messageApi.error('Failed to save client'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
    onError: () => messageApi.error('Failed to delete client'),
  })

  function openCreate() {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  function openEdit(client: Client) {
    setEditing(client)
    form.setFieldsValue({
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
    })
    setModalOpen(true)
  }

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Company', dataIndex: 'company', key: 'company' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Client) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this client?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Clients</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Client
        </Button>
      </div>
      <Table rowKey="id" dataSource={clients} columns={columns} loading={isLoading} />
      <Modal
        title={editing ? 'Edit Client' : 'Add Client'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={values => saveMutation.mutate(values)}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="company" label="Company">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Manual test**

Navigate to `/clients`. Add a client (name required). Verify it appears in table. Edit it, verify update. Delete it with confirm dialog.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ClientsPage.tsx
git commit -m "feat: add ClientsPage with full CRUD"
```

---

### Task 7: ProjectsPage

**Files:**
- Modify: `client/src/pages/ProjectsPage.tsx` (replace placeholder)

- [ ] **Step 1: Replace `client/src/pages/ProjectsPage.tsx`**

```tsx
import { useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Popconfirm, Space, Tag, message, Typography,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  type ProjectInput,
} from '../api/projects'
import { getClients } from '../api/clients'
import type { Project, ProjectStatus } from '../types'

const statusColors: Record<ProjectStatus, string> = {
  ACTIVE: 'green',
  COMPLETED: 'blue',
  CANCELLED: 'red',
}

export default function ProjectsPage() {
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form] = Form.useForm<ProjectInput>()

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: getClients })

  const saveMutation = useMutation({
    mutationFn: (input: ProjectInput) =>
      editing ? updateProject(editing.id, input) : createProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setModalOpen(false)
      form.resetFields()
      setEditing(null)
    },
    onError: () => messageApi.error('Failed to save project'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    onError: () => messageApi.error('Failed to delete project'),
  })

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 'ACTIVE' })
    setModalOpen(true)
  }

  function openEdit(project: Project) {
    setEditing(project)
    form.setFieldsValue({
      name: project.name,
      status: project.status,
      value: project.value,
      clientId: project.clientId,
    })
    setModalOpen(true)
  }

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: Project) => r.client?.name ?? '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: ProjectStatus) => <Tag color={statusColors[s]}>{s}</Tag>,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (v?: string) => (v ? `$${v}` : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Project) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this project?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Projects</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Project
        </Button>
      </div>
      <Table rowKey="id" dataSource={projects} columns={columns} loading={isLoading} />
      <Modal
        title={editing ? 'Edit Project' : 'Add Project'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={values => saveMutation.mutate(values)}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="clientId" label="Client" rules={[{ required: true }]}>
            <Select options={clients.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </Form.Item>
          <Form.Item name="value" label="Value (optional)">
            <Input placeholder="e.g. 5000" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Manual test**

Navigate to `/projects`. Add a project (need a client first). Verify status badge colors: ACTIVE=green, COMPLETED=blue, CANCELLED=red.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ProjectsPage.tsx
git commit -m "feat: add ProjectsPage with CRUD and status badges"
```

---

### Task 8: TasksPage

**Files:**
- Modify: `client/src/pages/TasksPage.tsx` (replace placeholder)

- [ ] **Step 1: Replace `client/src/pages/TasksPage.tsx`**

```tsx
import { useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Popconfirm, Space, Tag, DatePicker, message, Typography,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTasks,
  createTask,
  updateTask,
  patchTaskStatus,
  deleteTask,
  type TaskInput,
} from '../api/tasks'
import { getClients } from '../api/clients'
import { getProjects } from '../api/projects'
import type { Task, TaskStatus } from '../types'
import dayjs from 'dayjs'

const statusColors: Record<TaskStatus, string> = {
  PENDING: 'default',
  IN_PROGRESS: 'processing',
  DONE: 'success',
}

type FormValues = TaskInput & { dueDatePicker?: dayjs.Dayjs }

export default function TasksPage() {
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form] = Form.useForm<FormValues>()

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: getTasks })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: getClients })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })

  const saveMutation = useMutation({
    mutationFn: (input: TaskInput) =>
      editing ? updateTask(editing.id, input) : createTask(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setModalOpen(false)
      form.resetFields()
      setEditing(null)
    },
    onError: () => messageApi.error('Failed to save task'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      patchTaskStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onError: () => messageApi.error('Failed to update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onError: () => messageApi.error('Failed to delete task'),
  })

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 'PENDING' })
    setModalOpen(true)
  }

  function openEdit(task: Task) {
    setEditing(task)
    form.setFieldsValue({
      title: task.title,
      status: task.status,
      clientId: task.clientId,
      projectId: task.projectId,
      dueDatePicker: task.dueDate ? dayjs(task.dueDate) : undefined,
    })
    setModalOpen(true)
  }

  function onFinish({ dueDatePicker, ...rest }: FormValues) {
    saveMutation.mutate({ ...rest, dueDate: dueDatePicker?.toISOString() })
  }

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: TaskStatus, record: Task) => (
        <Select
          value={status}
          size="small"
          style={{ width: 140 }}
          onChange={val => statusMutation.mutate({ id: record.id, status: val })}
          options={[
            { value: 'PENDING', label: <Tag color={statusColors.PENDING}>PENDING</Tag> },
            { value: 'IN_PROGRESS', label: <Tag color={statusColors.IN_PROGRESS}>IN PROGRESS</Tag> },
            { value: 'DONE', label: <Tag color={statusColors.DONE}>DONE</Tag> },
          ]}
        />
      ),
    },
    { title: 'Client', key: 'client', render: (_: unknown, r: Task) => r.client?.name ?? '-' },
    { title: 'Project', key: 'project', render: (_: unknown, r: Task) => r.project?.name ?? '-' },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (d?: string) => (d ? dayjs(d).format('YYYY-MM-DD') : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Task) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this task?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Tasks</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Task
        </Button>
      </div>
      <Table rowKey="id" dataSource={tasks} columns={columns} loading={isLoading} />
      <Modal
        title={editing ? 'Edit Task' : 'Add Task'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'DONE', label: 'Done' },
              ]}
            />
          </Form.Item>
          <Form.Item name="clientId" label="Client">
            <Select allowClear options={clients.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="projectId" label="Project">
            <Select allowClear options={projects.map(p => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="dueDatePicker" label="Due Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Manual test**

Navigate to `/tasks`. Add a task. Change status inline using the Select dropdown in the status column — verify it updates without a page reload. Edit and delete.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/TasksPage.tsx
git commit -m "feat: add TasksPage with inline status change and CRUD"
```

---

### Task 9: NotesPage

**Files:**
- Modify: `client/src/pages/NotesPage.tsx` (replace placeholder)

- [ ] **Step 1: Replace `client/src/pages/NotesPage.tsx`**

```tsx
import { useState } from 'react'
import {
  List, Button, Modal, Form, Select, Popconfirm, Tag, Input, message, Typography, Card,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotes, createNote, deleteNote, type NoteInput } from '../api/notes'
import { getClients } from '../api/clients'
import { getProjects } from '../api/projects'
import type { Note } from '../types'
import dayjs from 'dayjs'

export default function NotesPage() {
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<NoteInput>()

  const { data: notes = [], isLoading } = useQuery({ queryKey: ['notes'], queryFn: getNotes })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: getClients })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setModalOpen(false)
      form.resetFields()
    },
    onError: () => messageApi.error('Failed to create note'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
    onError: () => messageApi.error('Failed to delete note'),
  })

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Notes</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Add Note
        </Button>
      </div>
      <List
        loading={isLoading}
        dataSource={notes}
        rowKey="id"
        renderItem={(note: Note) => (
          <List.Item
            actions={[
              <Popconfirm
                key="delete"
                title="Delete this note?"
                onConfirm={() => deleteMutation.mutate(note.id)}
              >
                <Button size="small" danger>Delete</Button>
              </Popconfirm>,
            ]}
          >
            <Card style={{ width: '100%' }} size="small">
              <Typography.Paragraph style={{ marginBottom: 8 }}>{note.content}</Typography.Paragraph>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {note.client && <Tag color="blue">{note.client.name}</Tag>}
                {note.project && <Tag color="purple">{note.project.name}</Tag>}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(note.createdAt).format('YYYY-MM-DD HH:mm')}
                </Typography.Text>
              </div>
            </Card>
          </List.Item>
        )}
      />
      <Modal
        title="Add Note"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={values => createMutation.mutate(values)}>
          <Form.Item name="content" label="Content" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="clientId" label="Client">
            <Select allowClear options={clients.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="projectId" label="Project">
            <Select allowClear options={projects.map(p => ({ value: p.id, label: p.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Manual test**

Navigate to `/notes`. Add a note with and without client/project. Verify blue/purple tags appear. Delete a note.

- [ ] **Step 4: Final full-flow test**

1. Log out and back in — verify session restores after page refresh (stays logged in)
2. All four pages load and CRUD works
3. Tasks inline status change works

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/NotesPage.tsx
git commit -m "feat: add NotesPage with create and delete"
```
