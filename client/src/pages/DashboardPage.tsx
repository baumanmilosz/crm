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
