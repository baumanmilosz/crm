# Invoice PDF Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Pobierz PDF" button to `InvoiceDetailPage` that generates and downloads a professional invoice PDF in the browser.

**Architecture:** Frontend-only using `@react-pdf/renderer`. A new `InvoicePdf` component defines the PDF layout using the library's flex-based components (`Document`, `Page`, `View`, `Text`). `PDFDownloadLink` wraps the download button. Seller data is read from `import.meta.env.VITE_SELLER_*` variables set in `client/.env`.

**Tech Stack:** @react-pdf/renderer 4.x, Vite env vars, React, TypeScript

---

## File Map

- **Install:** `@react-pdf/renderer` in `client/`
- **Create:** `client/.env.example` — documents the four seller env vars
- **Create:** `client/src/components/InvoicePdf.tsx` — PDF document component
- **Modify:** `client/src/pages/InvoiceDetailPage.tsx` — add PDFDownloadLink button

---

### Task 1: Install library + environment setup

**Files:**
- Create: `client/.env.example`

- [ ] **Step 1: Install `@react-pdf/renderer`**

```bash
cd client && npm install @react-pdf/renderer
```

Expected: package added to `client/node_modules`, no errors.

- [ ] **Step 2: Create `client/.env.example`**

```
# Dane sprzedawcy — skopiuj do .env i uzupełnij swoimi danymi
VITE_SELLER_NAME=Jan Kowalski
VITE_SELLER_NIP=123-456-78-90
VITE_SELLER_ADDRESS=ul. Przykładowa 1
VITE_SELLER_CITY=00-001 Warszawa
```

- [ ] **Step 3: Create your `client/.env` with real data**

Copy `.env.example` to `.env` and fill in your actual company data:

```bash
cp client/.env.example client/.env
```

Then edit `client/.env` with your real name, NIP, address, city.

Note: `client/.env` is gitignored by default by Vite — verify with:

```bash
grep '.env' client/.gitignore 2>/dev/null || echo "no .gitignore in client — add .env manually"
```

If missing, create `client/.gitignore` with:
```
.env
.env.local
```

- [ ] **Step 4: Commit**

```bash
git add client/.env.example client/.gitignore
git commit -m "feat: add seller env vars template for invoice PDF"
```

---

### Task 2: InvoicePdf component

**Files:**
- Create: `client/src/components/InvoicePdf.tsx`

- [ ] **Step 1: Create `client/src/components/InvoicePdf.tsx`**

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Invoice, VatRate } from '../types'

const vatLabels: Record<VatRate, string> = {
  VAT_23: '23%', VAT_8: '8%', VAT_5: '5%', VAT_0: '0%', ZW: 'zw.', NP: 'np.',
}

const vatMult: Record<VatRate, number> = {
  VAT_23: 0.23, VAT_8: 0.08, VAT_5: 0.05, VAT_0: 0, ZW: 0, NP: 0,
}

const seller = {
  name: import.meta.env.VITE_SELLER_NAME ?? '',
  nip: import.meta.env.VITE_SELLER_NIP ?? '',
  address: import.meta.env.VITE_SELLER_ADDRESS ?? '',
  city: import.meta.env.VITE_SELLER_CITY ?? '',
}

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#333', fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 20 },
  invoiceNumber: { fontSize: 13, textAlign: 'right' },
  parties: { flexDirection: 'row', marginBottom: 18 },
  party: { flex: 1 },
  partyLabel: { fontSize: 8, color: '#888', marginBottom: 4 },
  partyName: { fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  partyLine: { marginBottom: 1 },
  dates: { flexDirection: 'row', marginBottom: 18 },
  dateBlock: { marginRight: 32 },
  dateLabel: { color: '#888', fontSize: 8, marginBottom: 2 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#f0f0f0',
    paddingVertical: 5, paddingHorizontal: 4,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ddd',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5, paddingHorizontal: 4,
    borderBottomWidth: 1, borderColor: '#eee',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5, paddingHorizontal: 4,
    borderBottomWidth: 1, borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  colDesc: { flex: 1 },
  colQty: { width: 35, textAlign: 'right' },
  colPrice: { width: 62, textAlign: 'right' },
  colVat: { width: 35, textAlign: 'center' },
  colNet: { width: 58, textAlign: 'right' },
  colVatAmt: { width: 58, textAlign: 'right' },
  colGross: { width: 65, textAlign: 'right' },
  headerCell: { fontFamily: 'Helvetica-Bold', fontSize: 8 },
  totalsSection: { alignItems: 'flex-end', marginTop: 12 },
  totalRow: { flexDirection: 'row', marginBottom: 3 },
  totalLabel: { width: 110, textAlign: 'right', color: '#666', paddingRight: 8 },
  totalValue: { width: 75, textAlign: 'right' },
  grandLabel: { width: 110, textAlign: 'right', fontFamily: 'Helvetica-Bold', paddingRight: 8 },
  grandValue: { width: 75, textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 12 },
  notes: { marginTop: 20, padding: 10, backgroundColor: '#f9f9f9' },
  notesLabel: { color: '#888', fontSize: 8, marginBottom: 4 },
})

function fmt(n: number) {
  return `${n.toFixed(2)} zł`
}

type Props = { invoice: Invoice }

export default function InvoicePdf({ invoice }: Props) {
  const totalNet = invoice.items.reduce((sum, i) => sum + parseFloat(i.quantity) * parseFloat(i.unitPrice), 0)
  const totalVat = invoice.items.reduce((sum, i) => {
    const net = parseFloat(i.quantity) * parseFloat(i.unitPrice)
    return sum + net * vatMult[i.vatRate]
  }, 0)
  const totalGross = totalNet + totalVat

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>FAKTURA VAT</Text>
          <Text style={s.invoiceNumber}>{invoice.number}</Text>
        </View>

        {/* Parties */}
        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.partyLabel}>SPRZEDAWCA</Text>
            <Text style={s.partyName}>{seller.name}</Text>
            {seller.nip ? <Text style={s.partyLine}>NIP: {seller.nip}</Text> : null}
            {seller.address ? <Text style={s.partyLine}>{seller.address}</Text> : null}
            {seller.city ? <Text style={s.partyLine}>{seller.city}</Text> : null}
          </View>
          <View style={s.party}>
            <Text style={s.partyLabel}>NABYWCA</Text>
            <Text style={s.partyName}>{invoice.client.name}</Text>
            {invoice.client.company ? <Text style={s.partyLine}>{invoice.client.company}</Text> : null}
            {invoice.client.email ? <Text style={s.partyLine}>{invoice.client.email}</Text> : null}
            {invoice.client.phone ? <Text style={s.partyLine}>{invoice.client.phone}</Text> : null}
          </View>
        </View>

        {/* Dates */}
        <View style={s.dates}>
          <View style={s.dateBlock}>
            <Text style={s.dateLabel}>DATA WYSTAWIENIA</Text>
            <Text>{invoice.issueDate.slice(0, 10)}</Text>
          </View>
          <View style={s.dateBlock}>
            <Text style={s.dateLabel}>TERMIN PŁATNOŚCI</Text>
            <Text>{invoice.dueDate.slice(0, 10)}</Text>
          </View>
        </View>

        {/* Table header */}
        <View style={s.tableHeader}>
          <Text style={[s.colDesc, s.headerCell]}>Opis</Text>
          <Text style={[s.colQty, s.headerCell]}>Ilość</Text>
          <Text style={[s.colPrice, s.headerCell]}>C. netto</Text>
          <Text style={[s.colVat, s.headerCell]}>VAT</Text>
          <Text style={[s.colNet, s.headerCell]}>Netto</Text>
          <Text style={[s.colVatAmt, s.headerCell]}>Kw. VAT</Text>
          <Text style={[s.colGross, s.headerCell]}>Brutto</Text>
        </View>

        {/* Table rows */}
        {invoice.items.map((item, idx) => {
          const net = parseFloat(item.quantity) * parseFloat(item.unitPrice)
          const vat = net * vatMult[item.vatRate]
          const gross = net + vat
          const rowStyle = idx % 2 === 0 ? s.tableRow : s.tableRowAlt
          return (
            <View key={item.id} style={rowStyle}>
              <Text style={s.colDesc}>{item.description}</Text>
              <Text style={s.colQty}>{item.quantity}</Text>
              <Text style={s.colPrice}>{fmt(parseFloat(item.unitPrice))}</Text>
              <Text style={s.colVat}>{vatLabels[item.vatRate]}</Text>
              <Text style={s.colNet}>{fmt(net)}</Text>
              <Text style={s.colVatAmt}>{fmt(vat)}</Text>
              <Text style={s.colGross}>{fmt(gross)}</Text>
            </View>
          )
        })}

        {/* Totals */}
        <View style={s.totalsSection}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Razem netto:</Text>
            <Text style={s.totalValue}>{fmt(totalNet)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Razem VAT:</Text>
            <Text style={s.totalValue}>{fmt(totalVat)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.grandLabel}>Razem brutto:</Text>
            <Text style={s.grandValue}>{fmt(totalGross)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes ? (
          <View style={s.notes}>
            <Text style={s.notesLabel}>NOTATKI</Text>
            <Text>{invoice.notes}</Text>
          </View>
        ) : null}

      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS. If you see errors about `import.meta.env`, add this to `client/src/vite-env.d.ts` (create if missing):

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SELLER_NAME: string
  readonly VITE_SELLER_NIP: string
  readonly VITE_SELLER_ADDRESS: string
  readonly VITE_SELLER_CITY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/InvoicePdf.tsx client/src/vite-env.d.ts
git commit -m "feat: add InvoicePdf component using @react-pdf/renderer"
```

---

### Task 3: Add download button to InvoiceDetailPage

**Files:**
- Modify: `client/src/pages/InvoiceDetailPage.tsx`

- [ ] **Step 1: Add PDFDownloadLink import to `InvoiceDetailPage.tsx`**

Add to the top of the file, after existing imports:

```tsx
import { PDFDownloadLink } from '@react-pdf/renderer'
import { DownloadOutlined } from '@ant-design/icons'
import InvoicePdf from '../components/InvoicePdf'
```

- [ ] **Step 2: Add download button to the action bar**

In `InvoiceDetailPage.tsx`, find the `<Space>` block that holds the action buttons and add the download link as the first item:

```tsx
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
  {/* ... rest of existing buttons ... */}
```

The full updated `InvoiceDetailPage.tsx`:

```tsx
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
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: PASS, no errors.

- [ ] **Step 4: Manual test**

1. Make sure `client/.env` has all four `VITE_SELLER_*` values filled in
2. Start backend (`npm run dev`) and frontend (`cd client && npm run dev`)
3. Navigate to any invoice detail page
4. Click "Pobierz PDF" — browser should download `faktura-FV-1-2026.pdf`
5. Open the PDF — verify: FAKTURA VAT title, invoice number, seller data, client data, dates, items table with correct VAT amounts, totals, notes (if any)
6. Verify alternating row colors in the items table

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/InvoiceDetailPage.tsx
git commit -m "feat: add PDF download button to InvoiceDetailPage"
```
