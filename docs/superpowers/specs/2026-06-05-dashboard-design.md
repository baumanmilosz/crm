# CRM Dashboard — Design Spec

**Date:** 2026-06-05
**Status:** Approved

## Overview

A summary dashboard page at `/dashboard` that shows key financial and time metrics for the JDG owner. Replaces `/clients` as the default landing page after login.

## Architecture

Frontend-only — no new backend endpoints. Data fetched from existing endpoints (`/api/clients`, `/api/projects`, `/api/tasks`) using TanStack Query. Stats calculated in the component from the fetched arrays. TanStack Query caching means no duplicate network requests if the user has already visited other pages.

## Metrics

| Card | Calculation |
|---|---|
| Aktywne projekty | count of projects with `status === 'ACTIVE'` + sum of their `value` fields (skip nulls) |
| Przychód zrealizowany | sum of `value` from projects with `status === 'COMPLETED'` |
| Łączny czas pracy | sum of `timeSpentSeconds` across all tasks → formatted as `Xh Ym` |
| Klienci | count of all clients |

**Time note:** `timeSpentSeconds` is a lifetime total per task — per-period filtering (this week, this month) is out of scope until a time-entry model is added to the backend.

## Recent Tasks

Below the stat cards: a list of the 5 most recently created tasks (sort by `createdAt` desc, already returned desc by the API). Shows title + status badge. Quick "what's happening" view without navigation.

## UI Components

- Ant Design `<Row>` + `<Col>` grid (4 cols on desktop, 2 on tablet, 1 on mobile)
- Ant Design `<Card>` + `<Statistic>` for each metric
- Ant Design `<List>` + `<Tag>` for recent tasks
- Loading state: Ant Design `<Spin>` while any query is pending

## Files

- **Create:** `client/src/pages/DashboardPage.tsx`
- **Modify:** `client/src/App.tsx` — default route `"/"` → redirect to `/dashboard` instead of `/clients`
- **Modify:** `client/src/components/AppLayout.tsx` — add Dashboard entry at top of sidebar menu

## Out of Scope

- Charts / graphs (no charting library)
- Per-period time filtering (requires backend TimeEntry model)
- Revenue breakdown by client
- Overdue task count (not selected by user)
