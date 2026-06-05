import { Table, Button, Tag, Popconfirm, Space, Typography, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoices, deleteInvoice } from '../api/invoices'
import type { Invoice, InvoiceStatus, VatRate } from '../types'
import dayjs from 'dayjs'

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: 'default',
  ISSUED: 'processing',
  PAID: 'success',
}

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Szkic',
  ISSUED: 'Wystawiona',
  PAID: 'Opłacona',
}

const vatMultiplier: Record<VatRate, number> = {
  VAT_23: 0.23, VAT_8: 0.08, VAT_5: 0.05, VAT_0: 0, ZW: 0, NP: 0,
}

function computeGross(invoice: Invoice): number {
  return invoice.items.reduce((sum, item) => {
    const net = parseFloat(item.quantity) * parseFloat(item.unitPrice)
    return sum + net + net * vatMultiplier[item.vatRate]
  }, 0)
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: getInvoices,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    onError: () => messageApi.error('Błąd podczas usuwania faktury'),
  })

  const columns = [
    { title: 'Numer', dataIndex: 'number', key: 'number' },
    { title: 'Klient', key: 'client', render: (_: unknown, r: Invoice) => r.client.name },
    {
      title: 'Data wystawienia',
      dataIndex: 'issueDate',
      key: 'issueDate',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD'),
    },
    {
      title: 'Termin',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: InvoiceStatus) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag>,
    },
    {
      title: 'Brutto',
      key: 'gross',
      render: (_: unknown, r: Invoice) => `${computeGross(r).toFixed(2)} zł`,
    },
    {
      title: 'Akcje',
      key: 'actions',
      render: (_: unknown, record: Invoice) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/invoices/${record.id}`)}>Podgląd</Button>
          <Popconfirm title="Usunąć fakturę?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button size="small" danger>Usuń</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Faktury</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>
          Nowa faktura
        </Button>
      </div>
      <Table rowKey="id" dataSource={invoices} columns={columns} loading={isLoading} />
    </>
  )
}
