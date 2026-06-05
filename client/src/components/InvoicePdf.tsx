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

        <View style={s.header}>
          <Text style={s.title}>FAKTURA VAT</Text>
          <Text style={s.invoiceNumber}>{invoice.number}</Text>
        </View>

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

        <View style={s.tableHeader}>
          <Text style={[s.colDesc, s.headerCell]}>Opis</Text>
          <Text style={[s.colQty, s.headerCell]}>Ilość</Text>
          <Text style={[s.colPrice, s.headerCell]}>C. netto</Text>
          <Text style={[s.colVat, s.headerCell]}>VAT</Text>
          <Text style={[s.colNet, s.headerCell]}>Netto</Text>
          <Text style={[s.colVatAmt, s.headerCell]}>Kw. VAT</Text>
          <Text style={[s.colGross, s.headerCell]}>Brutto</Text>
        </View>

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
