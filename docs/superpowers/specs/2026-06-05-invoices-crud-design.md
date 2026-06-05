# Invoices CRUD + Line Items — Design Spec

**Date:** 2026-06-05
**Status:** Approved

## Overview

Full invoice management module: create, list, view, edit, and change status of invoices with dynamic line items. This is sub-project 1 of 2 (sub-project 2 is PDF generation). No automatic numbering — user enters invoice number manually.

## Data Model

Two new Prisma models and two new enums:

```prisma
enum InvoiceStatus {
  DRAFT
  ISSUED
  PAID
}

enum VatRate {
  VAT_23
  VAT_8
  VAT_5
  VAT_0
  ZW   // zwolniony
  NP   // nie podlega (reverse charge / odwrotne obciążenie)
}

model Invoice {
  id         String        @id @default(cuid())
  number     String
  issueDate  DateTime
  dueDate    DateTime
  status     InvoiceStatus @default(DRAFT)
  notes      String?
  clientId   String
  client     Client        @relation(fields: [clientId], references: [id])
  projectId  String?
  project    Project?      @relation(fields: [projectId], references: [id])
  userId     String
  user       User          @relation(fields: [userId], references: [id])
  items      InvoiceItem[]
  createdAt  DateTime      @default(now())
}

model InvoiceItem {
  id          String    @id @default(cuid())
  description String
  quantity    Decimal
  unitPrice   Decimal
  vatRate     VatRate
  invoiceId   String
  invoice     Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
}
```

Totals (net, VAT, gross) are **never stored** — always computed from items. VatRate `ZW` and `NP` contribute 0 VAT amount.

## VAT Rate Display

| Enum value | Display |
|---|---|
| VAT_23 | 23% |
| VAT_8 | 8% |
| VAT_5 | 5% |
| VAT_0 | 0% |
| ZW | zw. |
| NP | np. |

## Backend Endpoints

Follow the same pattern as existing modules (authMiddleware, validate middleware, service/controller separation):

| Method | Path | Description |
|---|---|---|
| GET | /api/invoices | list (with client name, total gross) |
| POST | /api/invoices | create invoice + items in one request |
| GET | /api/invoices/:id | detail with items and client/project |
| PUT | /api/invoices/:id | update header + replace all items |
| PATCH | /api/invoices/:id/status | change status only |
| DELETE | /api/invoices/:id | delete invoice + items (cascade) |

**Create/update payload:**
```json
{
  "number": "FV/1/2026",
  "issueDate": "2026-06-05T00:00:00.000Z",
  "dueDate": "2026-06-19T00:00:00.000Z",
  "clientId": "cuid...",
  "projectId": "cuid...",
  "notes": "Odwrotne obciążenie art. 28b",
  "items": [
    { "description": "Usługa programistyczna", "quantity": "10", "unitPrice": "200.00", "vatRate": "VAT_23" }
  ]
}
```

PUT replaces all items: delete existing items, insert new ones in one transaction.

## Frontend Pages

### `/invoices` — InvoicesPage
Table with columns: Numer, Klient, Data wystawienia, Termin, Status (badge), Brutto (computed). Actions: View, Edit, Delete.

### `/invoices/new` and `/invoices/:id/edit` — InvoiceFormPage
Full-page form (not a modal). Two sections:

**Header section:** Numer (text), Data wystawienia (DatePicker), Termin płatności (DatePicker), Klient (Select, required), Projekt (Select, optional), Notatki (Textarea, optional).

**Items section:** Dynamic table managed as React state (not Form.List). Columns: Opis, Ilość, Cena jedn. netto, Stawka VAT (Select), Netto (computed), VAT (computed), Brutto (computed), [Usuń]. "Dodaj pozycję" button appends a blank row. At least one item required on save.

**Totals footer:** Sum of Netto / VAT / Brutto across all items.

Save button: POST (new) or PUT (edit) then navigate to `/invoices/:id`.

### `/invoices/:id` — InvoiceDetailPage
Read-only view: header info + items table + totals. Status badge. Buttons:
- "Edytuj" → `/invoices/:id/edit` (only for DRAFT)
- "Wystaw" → PATCH status to ISSUED (only from DRAFT)
- "Oznacz jako opłacona" → PATCH status to PAID (only from ISSUED)
- "Usuń" → DELETE + navigate to `/invoices`

## Sidebar Navigation

Add "Faktury" with `FileInvoiceOutlined` (or `AuditOutlined`) icon to AppLayout sidebar, below Notes.

## Files

**Backend:**
- Modify: `prisma/schema.prisma`
- Create: `src/validators/invoices.validators.ts`
- Create: `src/services/invoices.service.ts`
- Create: `src/controllers/invoices.controller.ts`
- Create: `src/routes/invoices.routes.ts`
- Modify: `src/app.ts`

**Frontend:**
- Modify: `client/src/types/index.ts`
- Create: `client/src/api/invoices.ts`
- Create: `client/src/pages/InvoicesPage.tsx`
- Create: `client/src/pages/InvoiceFormPage.tsx`
- Create: `client/src/pages/InvoiceDetailPage.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/AppLayout.tsx`

## Out of Scope

- PDF generation (sub-project 2)
- Automatic invoice numbering
- Multiple currencies
- Partial payments
- Credit notes
