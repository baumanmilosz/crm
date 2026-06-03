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

  // runningTaskId drives the interval; refs mirror state for use in beforeunload closure
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const runningTaskIdRef = useRef<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const tasksRef = useRef<Task[]>([])
  const [, setTick] = useState(0)

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: getTasks })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: getClients })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })

  useEffect(() => { tasksRef.current = tasks }, [tasks])

  // Live counter — ticks every second while a timer is running
  useEffect(() => {
    if (!runningTaskId) return
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [runningTaskId])

  // Save on page unload — fetch keepalive survives tab close / refresh
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
    // If another timer is running, stop and save it first
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
