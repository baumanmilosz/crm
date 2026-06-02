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
