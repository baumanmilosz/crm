# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/dashboard` page with 4 stat cards (active projects + value, completed revenue, total time worked, client count) and a list of 5 recent tasks.

**Architecture:** Frontend-only — fetches existing `/api/projects`, `/api/tasks`, `/api/clients` endpoints via TanStack Query and calculates stats in the component. No backend changes. Dashboard becomes the default landing page after login.

**Tech Stack:** React, Ant Design 5 (Row, Col, Card, Statistic, List, Tag, Spin), TanStack Query

---

## File Map

- **Create:** `client/src/pages/DashboardPage.tsx` — stat cards + recent tasks list
- **Modify:** `client/src/App.tsx` — add `/dashboard` route, change default redirect
- **Modify:** `client/src/components/AppLayout.tsx` — add Dashboard item at top of sidebar menu

---

### Task 1: DashboardPage component

**Files:**
- Create: `client/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create `client/src/pages/DashboardPage.tsx`**

```tsx
import { Row, Col, Card, Statistic, List, Tag, Spin, Typography } from 'antd'
import {
  ProjectOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { getClients } from '../api/clients'
import { getProjects } from '../api/projects'
import { getTasks } from '../api/tasks'
import type { TaskStatus } from '../types'

const statusColors: Record<TaskStatus, string> = {
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

export default function DashboardPage() {
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  })
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
  })

  const loading = loadingClients || loadingProjects || loadingTasks

  const activeProjects = projects.filter(p => p.status === 'ACTIVE')
  const activeValue = activeProjects.reduce((sum, p) => sum + (p.value ? parseFloat(p.value) : 0), 0)

  const completedValue = projects
    .filter(p => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + (p.value ? parseFloat(p.value) : 0), 0)

  const totalSeconds = tasks.reduce((sum, t) => sum + t.timeSpentSeconds, 0)

  const recentTasks = tasks.slice(0, 5)

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  return (
    <>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>Dashboard</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Aktywne projekty"
              value={activeProjects.length}
              suffix={activeValue > 0 ? `/ ${activeValue.toFixed(0)} zł` : undefined}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Przychód zrealizowany"
              value={completedValue.toFixed(0)}
              suffix="zł"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Łączny czas pracy"
              value={formatTime(totalSeconds)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Klienci"
              value={clients.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Typography.Title level={5} style={{ marginTop: 32, marginBottom: 12 }}>
        Ostatnie taski
      </Typography.Title>
      <Card>
        <List
          dataSource={recentTasks}
          rowKey="id"
          locale={{ emptyText: 'Brak tasków' }}
          renderItem={task => (
            <List.Item>
              <List.Item.Meta title={task.title} />
              <Tag color={statusColors[task.status]}>{task.status}</Tag>
            </List.Item>
          )}
        />
      </Card>
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
git add client/src/pages/DashboardPage.tsx
git commit -m "feat: add DashboardPage with stat cards and recent tasks"
```

---

### Task 2: Wire routing and sidebar

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/AppLayout.tsx`

- [ ] **Step 1: Update `client/src/App.tsx`**

Full file — adds `DashboardPage` import, `/dashboard` route, changes default redirect:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
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
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
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

- [ ] **Step 2: Update `client/src/components/AppLayout.tsx`**

Add `DashboardOutlined` to the icon import and add Dashboard entry at the top of `menuItems`:

```tsx
import { Layout, Menu, Button, Typography, Space } from 'antd'
import {
  DashboardOutlined,
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
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
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

- [ ] **Step 3: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS, no errors.

- [ ] **Step 4: Manual test**

Start backend (`npm run dev`) and frontend (`cd client && npm run dev`).

Open `http://localhost:5173` — should redirect to `/dashboard`. Verify:
- 4 stat cards render with correct values
- "Aktywne projekty" shows count + sum of active project values
- "Przychód zrealizowany" shows sum of completed project values
- "Łączny czas pracy" shows total time in `Xh Ym` format
- "Klienci" shows client count
- "Ostatnie taski" shows up to 5 tasks with status badges
- Dashboard item is highlighted in sidebar when on `/dashboard`

- [ ] **Step 5: Commit**

```bash
git add client/src/App.tsx client/src/components/AppLayout.tsx
git commit -m "feat: wire dashboard into routing and sidebar"
```
