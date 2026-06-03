# Task Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-task stopwatch that accumulates time in seconds, saved to the database on Stop and on page unload.

**Architecture:** New `timeSpentSeconds Int @default(0)` column on Task. Dedicated `PATCH /api/tasks/:id/time` endpoint (mirrors existing `PATCH /:id/status` pattern). Frontend tracks the running timer with a state + refs hybrid: `runningTaskId` state drives the `setInterval`, refs mirror state for use in the `beforeunload` handler (closures don't capture React state updates). On Stop: normal Axios PATCH. On page unload: `fetch` with `keepalive: true` so the request survives tab close.

**Tech Stack:** Prisma migration, Zod, Express, React, TanStack Query, Ant Design, fetch keepalive

---

## File Map

**Backend:**
- Modify: `prisma/schema.prisma` — add `timeSpentSeconds` to Task model
- Modify: `src/validators/tasks.validators.ts` — add `patchTimeSchema`
- Modify: `src/services/tasks.service.ts` — add `patchTaskTime` function
- Modify: `src/controllers/tasks.controller.ts` — add `patchTaskTimeController`
- Modify: `src/routes/tasks.routes.ts` — add `PATCH /:id/time` route

**Frontend:**
- Modify: `client/src/types/index.ts` — add `timeSpentSeconds: number` to Task
- Modify: `client/src/api/tasks.ts` — add `patchTaskTime` function
- Modify: `client/src/pages/TasksPage.tsx` — add timer column, interval, beforeunload

---

### Task 1: Backend — schema, migration, endpoint

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/validators/tasks.validators.ts`
- Modify: `src/services/tasks.service.ts`
- Modify: `src/controllers/tasks.controller.ts`
- Modify: `src/routes/tasks.routes.ts`

- [ ] **Step 1: Add `timeSpentSeconds` to schema**

In `prisma/schema.prisma`, find the `model Task` block and add the field after `createdAt`:

```prisma
model Task {
  id               String     @id @default(cuid())
  title            String
  status           TaskStatus @default(PENDING)
  dueDate          DateTime?
  timeSpentSeconds Int        @default(0)
  userId           String
  user             User       @relation(fields: [userId], references: [id])
  clientId         String?
  client           Client?    @relation(fields: [clientId], references: [id])
  projectId        String?
  project          Project?   @relation(fields: [projectId], references: [id])
  createdAt        DateTime   @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-task-time-spent
```

Expected output: `✔ Generated Prisma client` and migration applied.

- [ ] **Step 3: Add `patchTimeSchema` to `src/validators/tasks.validators.ts`**

Add at the end of the file:

```ts
export const patchTimeSchema = z.object({
  timeSpentSeconds: z.number().int().min(0),
})
```

- [ ] **Step 4: Add `patchTaskTime` to `src/services/tasks.service.ts`**

Add after the `patchTaskStatus` function:

```ts
export async function patchTaskTime(id: string, userId: string, timeSpentSeconds: number) {
  await prisma.task.findFirstOrThrow({ where: { id, userId } })
  return prisma.task.update({ where: { id }, data: { timeSpentSeconds } })
}
```

- [ ] **Step 5: Add `patchTaskTimeController` to `src/controllers/tasks.controller.ts`**

Add after `patchTaskStatusController`:

```ts
export async function patchTaskTimeController(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.patchTaskTime(
      req.params.id as string,
      req.user!.id,
      req.body.timeSpentSeconds,
    )
    res.json({ data: task })
  } catch (err) { next(err) }
}
```

Also add `patchTaskTimeController` to the import list at the top of the file — update the existing destructured import from `tasksService` (no change needed there since it uses `* as tasksService`), but export the new controller.

- [ ] **Step 6: Add route to `src/routes/tasks.routes.ts`**

Import `patchTaskTimeController` and add the route after `PATCH /:id/status`:

```ts
import {
  listTasksController,
  getTaskController,
  createTaskController,
  updateTaskController,
  patchTaskStatusController,
  patchTaskTimeController,
  deleteTaskController,
} from '../controllers/tasks.controller'
```

```ts
tasksRouter.patch('/:id/time', validate(patchTimeSchema), patchTaskTimeController)
```

Also import `patchTimeSchema`:

```ts
import { createTaskSchema, updateTaskSchema, patchStatusSchema, patchTimeSchema } from '../validators/tasks.validators'
```

- [ ] **Step 7: Verify TypeScript (backend)**

```bash
npx tsc --noEmit
```

Expected: PASS, no errors.

- [ ] **Step 8: Commit**

```bash
git add prisma/ src/validators/tasks.validators.ts src/services/tasks.service.ts src/controllers/tasks.controller.ts src/routes/tasks.routes.ts
git commit -m "feat: add timeSpentSeconds to Task and PATCH /tasks/:id/time endpoint"
```

---

### Task 2: Frontend — types, API, timer UI

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/api/tasks.ts`
- Modify: `client/src/pages/TasksPage.tsx`

- [ ] **Step 1: Add `timeSpentSeconds` to Task type in `client/src/types/index.ts`**

Find the `Task` type and add the field:

```ts
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
```

- [ ] **Step 2: Add `patchTaskTime` to `client/src/api/tasks.ts`**

Add after `patchTaskStatus`:

```ts
export async function patchTaskTime(id: string, timeSpentSeconds: number): Promise<Task> {
  const { data } = await api.patch<SingleResponse>(`/tasks/${id}/time`, { timeSpentSeconds })
  return data.data
}
```

- [ ] **Step 3: Replace `client/src/pages/TasksPage.tsx` with timer support**

Full file content:

```tsx
import { useState, useEffect, useRef } from 'react'
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
  patchTaskTime,
  deleteTask,
  type TaskInput,
} from '../api/tasks'
import { getClients } from '../api/clients'
import { getProjects } from '../api/projects'
import { tokenStore } from '../api/tokenStore'
import type { Task, TaskStatus } from '../types'
import dayjs from 'dayjs'

const statusColors: Record<TaskStatus, string> = {
  PENDING: 'default',
  IN_PROGRESS: 'processing',
  DONE: 'success',
}

type FormValues = TaskInput & { dueDatePicker?: dayjs.Dayjs }

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function TasksPage() {
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form] = Form.useForm<FormValues>()

  // Timer state — runningTaskId drives the interval; refs used in beforeunload closure
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const runningTaskIdRef = useRef<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const tasksRef = useRef<Task[]>([])
  const [, setTick] = useState(0)

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: getTasks })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: getClients })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })

  // Keep tasksRef in sync for use in beforeunload
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  // Live counter — ticks every second while a timer is running
  useEffect(() => {
    if (!runningTaskId) return
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [runningTaskId])

  // Save on page unload using fetch keepalive (survives tab close / refresh)
  useEffect(() => {
    function handleBeforeUnload() {
      if (!runningTaskIdRef.current || !startedAtRef.current) return
      const task = tasksRef.current.find(t => t.id === runningTaskIdRef.current)
      if (!task) return
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000)
      const total = task.timeSpentSeconds + elapsed
      const token = tokenStore.get()
      fetch(`/api/tasks/${runningTaskIdRef.current}/time`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ timeSpentSeconds: total }),
        keepalive: true,
      })
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

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

  const timeMutation = useMutation({
    mutationFn: ({ id, timeSpentSeconds }: { id: string; timeSpentSeconds: number }) =>
      patchTaskTime(id, timeSpentSeconds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onError: () => messageApi.error('Failed to save time'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onError: () => messageApi.error('Failed to delete task'),
  })

  function handleStart(task: Task) {
    // If another timer is running, stop it first and save
    if (runningTaskIdRef.current && startedAtRef.current) {
      const prev = tasksRef.current.find(t => t.id === runningTaskIdRef.current)
      if (prev) {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000)
        timeMutation.mutate({ id: prev.id, timeSpentSeconds: prev.timeSpentSeconds + elapsed })
      }
    }
    runningTaskIdRef.current = task.id
    startedAtRef.current = Date.now()
    setRunningTaskId(task.id)
  }

  function handleStop(task: Task) {
    if (!startedAtRef.current) return
    const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000)
    timeMutation.mutate({ id: task.id, timeSpentSeconds: task.timeSpentSeconds + elapsed })
    runningTaskIdRef.current = null
    startedAtRef.current = null
    setRunningTaskId(null)
  }

  function getDisplaySeconds(task: Task): number {
    if (runningTaskIdRef.current !== task.id || !startedAtRef.current) return task.timeSpentSeconds
    return task.timeSpentSeconds + Math.floor((Date.now() - startedAtRef.current) / 1000)
  }

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
    {
      title: 'Time',
      key: 'time',
      render: (_: unknown, record: Task) => {
        const isRunning = runningTaskId === record.id
        return (
          <Space>
            <Typography.Text code>{formatSeconds(getDisplaySeconds(record))}</Typography.Text>
            {isRunning ? (
              <Button size="small" danger onClick={() => handleStop(record)}>Stop</Button>
            ) : (
              <Button size="small" type="dashed" onClick={() => handleStart(record)}>Start</Button>
            )}
          </Space>
        )
      },
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

- [ ] **Step 4: Verify TypeScript (frontend)**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS, no errors.

- [ ] **Step 5: Manual test**

1. Start backend (`npm run dev`) and frontend (`cd client && npm run dev`)
2. Navigate to `/tasks`, add a task
3. Click **Start** — timer should begin counting up (MM:SS format)
4. Click **Stop** — timer should stop and save; verify in DB: `npx prisma studio` → Task → `timeSpentSeconds`
5. Refresh the page — saved value should persist (timer shows accumulated seconds, not counting)
6. Click **Start** on a task, then **Start** on another task — first timer should auto-stop and save
7. Click **Start**, then refresh the browser — the accumulated time should be saved (beforeunload)

- [ ] **Step 6: Commit**

```bash
git add client/src/types/index.ts client/src/api/tasks.ts client/src/pages/TasksPage.tsx
git commit -m "feat: add task timer with DB persistence and beforeunload save"
```
