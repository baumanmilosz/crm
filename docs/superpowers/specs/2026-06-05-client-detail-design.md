# Client Detail View — Design Spec

**Date:** 2026-06-05
**Status:** Approved

## Overview

A read-only detail page at `/clients/:id` showing all data related to a specific client: their info, projects, tasks, and notes in one place via an Ant Design Tabs layout.

## Navigation

In `ClientsPage`, add a "View" button to the Actions column (before Edit/Delete). Clicking it navigates to `/clients/:id`.

## Page Layout

```
← Klienci   [Back button → /clients]

[Client Name]                          Typography.Title
email | phone | company                Typography.Text (secondary)

┌──────────┬──────────┬──────────┐
│ Projekty │  Taski   │ Notatki  │     Ant Design Tabs
└──────────┴──────────┴──────────┘

[tab content]
```

### Projekty tab
Ant Design `<Table>` with columns: Nazwa, Status (Tag badge), Wartość.

### Taski tab
Ant Design `<Table>` with columns: Tytuł, Status (Tag badge), Termin, Czas (timeSpentSeconds formatted as `Xh Ym`).

### Notatki tab
Ant Design `<List>` of `<Card>` items showing note content + creation date.

## Data Fetching

All backend endpoints already support `clientId` query param filtering:

| Data | Endpoint |
|---|---|
| Client info | `GET /api/clients/:id` |
| Projects | `GET /api/projects?clientId=:id` |
| Tasks | `GET /api/tasks?clientId=:id` |
| Notes | `GET /api/notes?clientId=:id` |

Frontend API modules get new filtered functions alongside the existing ones:
- `getClient(id)` added to `client/src/api/clients.ts`
- `getProjectsByClient(clientId)` added to `client/src/api/projects.ts`
- `getTasksByClient(clientId)` added to `client/src/api/tasks.ts`
- `getNotesByClient(clientId)` added to `client/src/api/notes.ts`

Each uses a separate `useQuery` with a client-scoped query key (e.g. `['projects', 'byClient', clientId]`) so it doesn't collide with the full-list cache used on other pages.

## Files

- **Create:** `client/src/pages/ClientDetailPage.tsx`
- **Modify:** `client/src/App.tsx` — add `<Route path="clients/:id" element={<ClientDetailPage />} />`
- **Modify:** `client/src/pages/ClientsPage.tsx` — add "View" button in Actions column
- **Modify:** `client/src/api/clients.ts` — add `getClient(id)`
- **Modify:** `client/src/api/projects.ts` — add `getProjectsByClient(clientId)`
- **Modify:** `client/src/api/tasks.ts` — add `getTasksByClient(clientId)`
- **Modify:** `client/src/api/notes.ts` — add `getNotesByClient(clientId)`

## Out of Scope

- Adding/editing projects, tasks, or notes from this page
- Client edit from this page (already in ClientsPage modal)
- Pagination (data volume per client is small for JDG)
