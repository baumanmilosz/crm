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
