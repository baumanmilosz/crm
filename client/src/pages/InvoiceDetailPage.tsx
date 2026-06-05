import { Button, Table, Tag, Typography, Descriptions, Space, Popconfirm, message, Divider } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { getInvoice, patchInvoiceStatus, deleteInvoice } from '../api/invoices'
import InvoicePdf from '../components/InvoicePdf'
import type { InvoiceItem, InvoiceStatus, VatRate } from '../types'
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

const vatRateLabels: Record<VatRate, string> = {
  VAT_23: '23%', VAT_8: '8%', VAT_5: '5%', VAT_0: '0%', ZW: 'zw.', NP: 'np.',
}

const vatMultiplier: Record<VatRate, number> = {
  VAT_23: 0.23, VAT_8: 0.08, VAT_5: 0.05, VAT_0: 0, ZW: 0, NP: 0,
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: (status: InvoiceStatus) => patchInvoiceStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => messageApi.error('Błąd zmiany statusu'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteInvoice(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      navigate('/invoices')
    },
    onError: () => messageApi.error('Błąd usuwania faktury'),
  })

  if (isLoading || !invoice) return null

  const totalNet = invoice.items.reduce((s, i) => s + parseFloat(i.quantity) * parseFloat(i.unitPrice), 0)
  const totalVat = invoice.items.reduce((s, i) => {
    const net = parseFloat(i.quantity) * parseFloat(i.unitPrice)
    return s + net * vatMultiplier[i.vatRate]
  }, 0)
  const totalGross = totalNet + totalVat

  const itemColumns = [
    { title: 'Opis', dataIndex: 'description', key: 'description' },
    { title: 'Ilość', dataIndex: 'quantity', key: 'quantity' },
    {
      title: 'Cena netto',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (v: string) => `${parseFloat(v).toFixed(2)} zł`,
    },
    {
      title: 'VAT',
      dataIndex: 'vatRate',
      key: 'vatRate',
      render: (v: VatRate) => vatRateLabels[v],
    },
    {
      title: 'Netto',
      key: 'net',
      render: (_: unknown, r: InvoiceItem) =>
        `${(parseFloat(r.quantity) * parseFloat(r.unitPrice)).toFixed(2)} zł`,
    },
    {
      title: 'VAT kwota',
      key: 'vatAmount',
      render: (_: unknown, r: InvoiceItem) => {
        const net = parseFloat(r.quantity) * parseFloat(r.unitPrice)
        return `${(net * vatMultiplier[r.vatRate]).toFixed(2)} zł`
      },
    },
    {
      title: 'Brutto',
      key: 'gross',
      render: (_: unknown, r: InvoiceItem) => {
        const net = parseFloat(r.quantity) * parseFloat(r.unitPrice)
        return `${(net + net * vatMultiplier[r.vatRate]).toFixed(2)} zł`
      },
    },
  ]

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/invoices')} style={{ paddingLeft: 0 }}>
          Faktury
        </Button>
        <Space>
          <PDFDownloadLink
            document={<InvoicePdf invoice={invoice} />}
            fileName={`faktura-${invoice.number.replace(/\//g, '-')}.pdf`}
          >
            {({ loading }: { loading: boolean }) => (
              <Button icon={<DownloadOutlined />} loading={loading}>
                Pobierz PDF
              </Button>
            )}
          </PDFDownloadLink>
          {invoice.status === 'DRAFT' && (
            <Button icon={<EditOutlined />} onClick={() => navigate(`/invoices/${id}/edit`)}>
              Edytuj
            </Button>
          )}
          {invoice.status === 'DRAFT' && (
            <Button type="primary" onClick={() => statusMutation.mutate('ISSUED')} loading={statusMutation.isPending}>
              Wystaw
            </Button>
          )}
          {invoice.status === 'ISSUED' && (
            <Button type="primary" onClick={() => statusMutation.mutate('PAID')} loading={statusMutation.isPending}>
              Oznacz jako opłacona
            </Button>
          )}
          <Popconfirm title="Usunąć fakturę?" onConfirm={() => deleteMutation.mutate()}>
            <Button danger loading={deleteMutation.isPending}>Usuń</Button>
          </Popconfirm>
        </Space>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>{invoice.number}</Typography.Title>
        <Tag color={statusColors[invoice.status]}>{statusLabels[invoice.status]}</Tag>
      </div>

      <Descriptions bordered size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Klient">{invoice.client.name}</Descriptions.Item>
        {invoice.project && <Descriptions.Item label="Projekt">{invoice.project.name}</Descriptions.Item>}
        <Descriptions.Item label="Data wystawienia">{dayjs(invoice.issueDate).format('YYYY-MM-DD')}</Descriptions.Item>
        <Descriptions.Item label="Termin płatności">{dayjs(invoice.dueDate).format('YYYY-MM-DD')}</Descriptions.Item>
        {invoice.notes && <Descriptions.Item label="Notatki" span={3}>{invoice.notes}</Descriptions.Item>}
      </Descriptions>

      <Table rowKey="id" dataSource={invoice.items} columns={itemColumns} pagination={false} size="small" />

      <Divider />

      <div style={{ textAlign: 'right' }}>
        <Space direction="vertical" align="end">
          <Typography.Text>Razem netto: <strong>{totalNet.toFixed(2)} zł</strong></Typography.Text>
          <Typography.Text>Razem VAT: <strong>{totalVat.toFixed(2)} zł</strong></Typography.Text>
          <Typography.Title level={4} style={{ margin: 0 }}>Razem brutto: {totalGross.toFixed(2)} zł</Typography.Title>
        </Space>
      </div>
    </>
  )
}
