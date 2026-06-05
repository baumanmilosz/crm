import { useState, useEffect } from 'react'
import {
  Form, Input, Button, Select, DatePicker, Table, Typography, Space, message, Divider,
} from 'antd'
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoice, createInvoice, updateInvoice, type InvoiceItemInput } from '../api/invoices'
import { getClients } from '../api/clients'
import { getProjects } from '../api/projects'
import type { VatRate } from '../types'
import dayjs from 'dayjs'

const vatRateOptions = [
  { value: 'VAT_23', label: '23%' },
  { value: 'VAT_8', label: '8%' },
  { value: 'VAT_5', label: '5%' },
  { value: 'VAT_0', label: '0%' },
  { value: 'ZW', label: 'zw.' },
  { value: 'NP', label: 'np.' },
]

const vatMultiplier: Record<VatRate, number> = {
  VAT_23: 0.23, VAT_8: 0.08, VAT_5: 0.05, VAT_0: 0, ZW: 0, NP: 0,
}

type ItemRow = { key: number; description: string; quantity: string; unitPrice: string; vatRate: VatRate }

type HeaderValues = {
  number: string
  issueDate: dayjs.Dayjs
  dueDate: dayjs.Dayjs
  clientId: string
  projectId?: string
  notes?: string
}

let nextKey = 0
function blankItem(): ItemRow {
  return { key: nextKey++, description: '', quantity: '1', unitPrice: '0', vatRate: 'VAT_23' }
}

function computeNet(item: ItemRow) {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
}

export default function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()
  const [form] = Form.useForm<HeaderValues>()
  const [items, setItems] = useState<ItemRow[]>([blankItem()])

  const { data: existing } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: isEdit,
  })

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: getClients })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })

  useEffect(() => {
    if (!existing) return
    form.setFieldsValue({
      number: existing.number,
      issueDate: dayjs(existing.issueDate),
      dueDate: dayjs(existing.dueDate),
      clientId: existing.clientId,
      projectId: existing.projectId,
      notes: existing.notes,
    })
    setItems(existing.items.map(item => ({
      key: nextKey++,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
    })))
  }, [existing, form])

  const saveMutation = useMutation({
    mutationFn: async (values: HeaderValues) => {
      if (items.some(i => !i.description.trim())) {
        throw new Error('Każda pozycja musi mieć opis')
      }
      const itemInputs: InvoiceItemInput[] = items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        vatRate: i.vatRate,
      }))
      const payload = {
        number: values.number,
        issueDate: values.issueDate.toISOString(),
        dueDate: values.dueDate.toISOString(),
        clientId: values.clientId,
        projectId: values.projectId,
        notes: values.notes,
        items: itemInputs,
      }
      return isEdit ? updateInvoice(id!, payload) : createInvoice(payload)
    },
    onSuccess: invoice => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      navigate(`/invoices/${invoice.id}`)
    },
    onError: (err: Error) => messageApi.error(err.message || 'Błąd zapisu'),
  })

  function updateItem(index: number, field: keyof Omit<ItemRow, 'key'>, value: string) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const totalNet = items.reduce((s, i) => s + computeNet(i), 0)
  const totalVat = items.reduce((s, i) => s + computeNet(i) * vatMultiplier[i.vatRate], 0)
  const totalGross = totalNet + totalVat

  const itemColumns = [
    {
      title: 'Opis',
      key: 'description',
      render: (_: unknown, _r: ItemRow, index: number) => (
        <Input
          value={items[index].description}
          onChange={e => updateItem(index, 'description', e.target.value)}
          placeholder="Opis usługi"
        />
      ),
    },
    {
      title: 'Ilość',
      key: 'quantity',
      width: 90,
      render: (_: unknown, _r: ItemRow, index: number) => (
        <Input
          value={items[index].quantity}
          onChange={e => updateItem(index, 'quantity', e.target.value)}
        />
      ),
    },
    {
      title: 'Cena netto',
      key: 'unitPrice',
      width: 130,
      render: (_: unknown, _r: ItemRow, index: number) => (
        <Input
          value={items[index].unitPrice}
          onChange={e => updateItem(index, 'unitPrice', e.target.value)}
          suffix="zł"
        />
      ),
    },
    {
      title: 'VAT',
      key: 'vatRate',
      width: 100,
      render: (_: unknown, _r: ItemRow, index: number) => (
        <Select
          value={items[index].vatRate}
          options={vatRateOptions}
          onChange={(val: VatRate) => updateItem(index, 'vatRate', val)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Netto',
      key: 'net',
      width: 110,
      render: (_: unknown, _r: ItemRow, index: number) =>
        `${computeNet(items[index]).toFixed(2)} zł`,
    },
    {
      title: 'VAT kwota',
      key: 'vatAmount',
      width: 110,
      render: (_: unknown, _r: ItemRow, index: number) => {
        const net = computeNet(items[index])
        return `${(net * vatMultiplier[items[index].vatRate]).toFixed(2)} zł`
      },
    },
    {
      title: 'Brutto',
      key: 'gross',
      width: 110,
      render: (_: unknown, _r: ItemRow, index: number) => {
        const net = computeNet(items[index])
        return `${(net + net * vatMultiplier[items[index].vatRate]).toFixed(2)} zł`
      },
    },
    {
      title: '',
      key: 'remove',
      width: 50,
      render: (_: unknown, _r: ItemRow, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(index)}
          disabled={items.length === 1}
        />
      ),
    },
  ]

  return (
    <>
      {contextHolder}
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => navigate('/invoices')}
        style={{ marginBottom: 16, paddingLeft: 0 }}
      >
        Faktury
      </Button>

      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        {isEdit ? 'Edytuj fakturę' : 'Nowa faktura'}
      </Typography.Title>

      <Form form={form} layout="vertical" onFinish={values => saveMutation.mutate(values)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <Form.Item name="number" label="Numer faktury" rules={[{ required: true }]}>
            <Input placeholder="FV/1/2026" />
          </Form.Item>
          <Form.Item name="clientId" label="Klient" rules={[{ required: true }]}>
            <Select options={clients.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="issueDate" label="Data wystawienia" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="dueDate" label="Termin płatności" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="projectId" label="Projekt (opcjonalnie)">
            <Select allowClear options={projects.map(p => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="notes" label="Notatki (opcjonalnie)">
            <Input placeholder="np. Odwrotne obciążenie art. 28b" />
          </Form.Item>
        </div>

        <Divider>Pozycje</Divider>

        <Table
          rowKey="key"
          dataSource={items}
          columns={itemColumns}
          pagination={false}
          size="small"
        />

        <Button
          icon={<PlusOutlined />}
          onClick={() => setItems(prev => [...prev, blankItem()])}
          style={{ marginTop: 8, marginBottom: 16 }}
        >
          Dodaj pozycję
        </Button>

        <div style={{ textAlign: 'right', marginBottom: 24 }}>
          <Space direction="vertical" align="end">
            <Typography.Text>Razem netto: <strong>{totalNet.toFixed(2)} zł</strong></Typography.Text>
            <Typography.Text>Razem VAT: <strong>{totalVat.toFixed(2)} zł</strong></Typography.Text>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Razem brutto: {totalGross.toFixed(2)} zł
            </Typography.Title>
          </Space>
        </div>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
            {isEdit ? 'Zapisz zmiany' : 'Utwórz fakturę'}
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}
