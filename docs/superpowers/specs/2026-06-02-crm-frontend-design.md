# CRM Frontend — Design Spec

**Date:** 2026-06-02
**Status:** Approved

## Overview

Simple admin panel for the CRM backend. MVP scope: CRUD on Clients, Projects, Tasks, Notes with authentication. No dashboard stats, no detail views with nested relations.

## Stack

- **Location:** `client/` directory in the same monorepo
- **Bundler:** Vite 6
- **Framework:** React 19 + TypeScript
- **UI Library:** Ant Design 5
- **Data fetching:** TanStack Query v5 (React Query)
- **Routing:** React Router v7
- **HTTP:** Axios (with interceptor for 401 → redirect to login)
- **Auth:** Refresh token in httpOnly cookie (backend), access token in React Context memory, user info in localStorage for session restore

## Project Structure

```
client/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── api/
    │   ├── axios.ts          # Axios instance, base URL, 401 interceptor
    │   ├── auth.ts
    │   ├── clients.ts
    │   ├── projects.ts
    │   ├── tasks.ts
    │   └── notes.ts
    ├── context/
    │   └── AuthContext.tsx   # User state, login/logout helpers
    ├── components/
    │   └── Layout.tsx        # Ant Design Layout + Sider with nav menu
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── ClientsPage.tsx
    │   ├── ProjectsPage.tsx
    │   ├── TasksPage.tsx
    │   └── NotesPage.tsx
    └── types/
        └── index.ts          # Shared TS types matching Prisma models
```

## Routing

| Path | Component | Protected |
|---|---|---|
| `/login` | `LoginPage` | No |
| `/` | redirect → `/clients` | Yes |
| `/clients` | `ClientsPage` | Yes |
| `/projects` | `ProjectsPage` | Yes |
| `/tasks` | `TasksPage` | Yes |
| `/notes` | `NotesPage` | Yes |

Protected routes: if no user in AuthContext, redirect to `/login`. On login success, redirect to `/clients`.

## Auth Flow

Backend details:
- `POST /api/auth/login` returns `{ data: { accessToken, user } }` and sets `refreshToken` as httpOnly cookie (7d)
- `POST /api/auth/refresh` returns `{ data: { accessToken } }` using the cookie — no user info
- `POST /api/auth/logout` requires Bearer token in Authorization header
- Access token expires in 15 minutes

Frontend strategy:
1. `LoginPage` posts `{ email, password }` to `POST /api/auth/login`
2. On success: store access token in AuthContext memory; store `{ id, email, name }` in `localStorage` (not the token)
3. Axios instance sets `Authorization: Bearer <accessToken>` from AuthContext on every request
4. On app load: if `localStorage` has user info, call `POST /api/auth/refresh` to get new access token; on success, restore session; on 401, clear localStorage → show login
5. Axios 401 interceptor: try `POST /api/auth/refresh` once; if that also fails, clear AuthContext + localStorage + redirect to `/login`
6. Logout: `POST /api/auth/logout`, clear AuthContext + localStorage, redirect to `/login`

## Layout

Ant Design `Layout` with:
- `Sider` (collapsed on mobile): menu items — Clients, Projects, Tasks, Notes + logout button at bottom
- `Header`: page title + logged-in user name
- `Content`: page component

## Pages

### ClientsPage
- `Table` with columns: Name, Email, Phone, Company, Created At, Actions
- Actions: Edit (modal), Delete (confirm popconfirm)
- "Add Client" button → modal with form (name required, rest optional)
- No pagination on MVP (backend returns all)

### ProjectsPage
- `Table` with columns: Name, Client, Status (badge), Value, Created At, Actions
- Status badge: ACTIVE=green, COMPLETED=blue, CANCELLED=red
- "Add Project" button → modal (name, client select, status, value optional)
- Edit inline via modal, delete with confirm

### TasksPage
- `Table` with columns: Title, Status, Client, Project, Due Date, Actions
- Status change inline: `Select` component in the status cell (PENDING, IN_PROGRESS, DONE)
- "Add Task" button → modal (title, status, client select optional, project select optional, due date optional)
- Delete with confirm

### NotesPage
- `List` (not Table) — note content as card, client/project badge if linked, date, delete button
- "Add Note" button → modal (textarea for content, client select optional, project select optional)
- No edit — notes are immutable once created

## API Integration

Each page uses TanStack Query:
- `useQuery` to fetch list
- `useMutation` for create/update/delete, with `queryClient.invalidateQueries` on success
- Loading states handled by Ant Design `Table` `loading` prop / `Spin`
- Error states: Ant Design `message.error(...)` toast

Axios instance base URL: `http://localhost:3000` in dev (proxied via Vite proxy to avoid CORS), `/api` in prod. Vite proxy config forwards `/api/*` to the Express backend.

## Types

Mirror Prisma models (no codegen for MVP):

```ts
type Client = { id: string; name: string; email?: string; phone?: string; company?: string; createdAt: string }
type Project = { id: string; name: string; status: 'ACTIVE'|'COMPLETED'|'CANCELLED'; value?: string; clientId: string; client: Client; createdAt: string }
type Task = { id: string; title: string; status: 'PENDING'|'IN_PROGRESS'|'DONE'; dueDate?: string; clientId?: string; projectId?: string; createdAt: string }
type Note = { id: string; content: string; clientId?: string; projectId?: string; createdAt: string }
```

## Out of Scope (MVP)

- Dashboard with stats/charts
- Client detail page with nested projects/tasks
- User management / settings
- Pagination (backend returns all records)
- Search / filtering
- Mobile responsiveness beyond Sider collapse
