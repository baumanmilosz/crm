# Invoice PDF Generation — Design Spec

**Date:** 2026-06-05
**Status:** Approved

## Overview

Add a "Pobierz PDF" button to `InvoiceDetailPage` that generates and downloads a PDF of the invoice directly in the browser. Sub-project 2 of 2 for the invoicing module.

## Approach

Frontend-only using `@react-pdf/renderer`. No backend changes. The PDF document is defined as a React component tree (`<Document>`, `<Page>`, `<View>`, `<Text>`) and rendered to a binary PDF blob in the browser. The `<PDFDownloadLink>` component from the library handles the download trigger.

## Seller Data

Stored in `client/.env` as Vite environment variables (prefix `VITE_` required for browser access):

```
VITE_SELLER_NAME=Jan Kowalski
VITE_SELLER_NIP=123-456-78-90
VITE_SELLER_ADDRESS=ul. Przykładowa 1
VITE_SELLER_CITY=00-001 Warszawa
```

Read in the PDF component via `import.meta.env.VITE_SELLER_NAME` etc.

## PDF Layout

Single A4 page, portrait. Sections top to bottom:

1. **Header row:** "FAKTURA VAT" (large, left) + invoice number (right)
2. **Parties row (two columns):**
   - Left — Sprzedawca: `VITE_SELLER_NAME`, `NIP: VITE_SELLER_NIP`, `VITE_SELLER_ADDRESS`, `VITE_SELLER_CITY`
   - Right — Nabywca: `client.name`, `client.company` (if set), `client.email` (if set), `client.phone` (if set)
3. **Dates row:** Data wystawienia + Termin płatności
4. **Items table:** columns — Opis, Ilość, Cena netto, VAT, Netto, Kw. VAT, Brutto. Alternating row background for readability.
5. **Totals block (right-aligned):** Razem netto / Razem VAT / **Razem brutto** (bold)
6. **Notes** (if `invoice.notes` is set): plain text at the bottom

VAT rate labels in table: VAT_23→"23%", VAT_8→"8%", VAT_5→"5%", VAT_0→"0%", ZW→"zw.", NP→"np."

Downloaded filename: `faktura-{invoice.number}.pdf` (slashes replaced with dashes).

## Files

- **Install:** `@react-pdf/renderer` in `client/`
- **Create:** `client/src/components/InvoicePdf.tsx` — PDF document component
- **Modify:** `client/src/pages/InvoiceDetailPage.tsx` — add `<PDFDownloadLink>` button to the action bar
- **Create:** `client/.env.example` — documents the four required seller env vars

## Out of Scope

- Buyer NIP / address (not in Client model)
- Polish number formatting (1 234,56 zł) — use standard `toFixed(2)` with space separator
- Multi-page invoices
- Custom fonts (use react-pdf default font)
- Backend PDF endpoint
