import { useState } from 'react'
import { Table, Button, Modal, Form, Input, Popconfirm, Space, message, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
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
          <Button size="small" onClick={() => navigate(`/clients/${record.id}`)}>View</Button>
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
