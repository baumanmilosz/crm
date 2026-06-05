import { Button, Tabs, Table, List, Card, Tag, Typography, Spin, Descriptions } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getClient } from '../api/clients'
import { getProjectsByClient } from '../api/projects'
import { getTasksByClient } from '../api/tasks'
import { getNotesByClient } from '../api/notes'
import type { ProjectStatus, TaskStatus, Note } from '../types'
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
