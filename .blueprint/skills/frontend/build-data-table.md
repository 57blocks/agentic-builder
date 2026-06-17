---
id: build-data-table
agent: frontend
version: v1
description: "Standardize list / table pages — TanStack Table column defs + sort / filter / pagination (server-side preferred) + URL state persistence + four-state branching (empty / loading / error / success) + row selection + virtualization threshold. Invoke when the user says \"build a table\" / \"build a list page\" / \"add pagination\" / \"add sort and filter\" / \"build an admin list\"."
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - build data table
      - table
      - designing a new list / table page
      - adding pagination / sort / filter to a list
      - persisting list state to the url \(refresh / share restores it\)
      - lists > 100 rows that need virtualization
      - adding row selection / bulk actions
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"build-data-table\" engineering skill. That skill applies when: Standardize list / table pages — TanStack Table column defs + sort / filter / pagination (server-side preferred) + URL state persistence + four-state branching (empty / loading / error / success) + row selection + virtualization threshold. Invoke when the user says \"build a table\" / \"build a list page\" / \"add pagination\" / \"add sort and filter\" / \"build an admin list\". Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

## When you need this

Almost every page in B2B / admin tools is a list. Without a standard you'll get: "five list pages with five pagination UIs", "switching tabs drops the page number", "list params can't be shared via URL". This skill provides a minimal scaffold with pagination + sort + filter + URL state + four-state branching.

## Decision tree

1. **Server-side vs client-side**:

| Data size | Recommended |
|---|---|
| < 200 items | Client-side (fetch all once, sort/filter/paginate in the frontend) |
| ≥ 200 items | Server-side (every operation refetches, list params in the URL) |
| Huge (10k+) | Server-side + virtualization + cursor pagination (no offset/page) |

2. **TanStack Table vs hand-rolled**: ≥ 5 columns + sort / filter / row selection → TanStack Table; pure display of a few columns → hand-rolled `<table>`.
3. **URL state vs store**: URL state (always first choice — shareable, refreshable, browser back/forward works). Only ephemeral state that *should* be lost on refresh (e.g., row selection) goes in `useState`.
4. **Virtualization threshold**: > 100 rows (or rows with images); use `@tanstack/react-virtual`.
5. **Empty vs loading**: always render distinctly (see the react-and-ui rule).

## Minimal skeleton

**Install**:

```bash
pnpm add @tanstack/react-table @tanstack/react-query nuqs
```

**`columns.ts`** — typed column definitions:

```ts
import type { ColumnDef } from '@tanstack/react-table';

export type User = { id: string; name: string; email: string; role: string; createdAt: string };

export const columns: ColumnDef<User>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'createdAt', header: 'Created at',
    cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString() },
];
```

**`use-list-params.ts`** — URL state sync hook (nuqs):

```ts
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

export function useListParams() {
  return useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(20),
    sort: parseAsString.withDefault('createdAt'),
    order: parseAsString.withDefault('desc'),
    search: parseAsString.withDefault(''),
    role: parseAsString.withDefault(''),
  });
}
```

**`UsersTable.tsx`** — four-state + TanStack wiring:

```tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { columns, type User } from './columns';
import { useListParams } from './use-list-params';
import { http } from '@/lib/http';

type Page<T> = { items: T[]; total: number };

export function UsersTable() {
  const [params, setParams] = useListParams();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users', params],
    queryFn: ({ signal }) =>
      http<Page<User>>(`/api/users?${new URLSearchParams(params as never)}`, { signal }),
    placeholderData: (prev) => prev, // No loading flash when paging
  });

  const table = useReactTable({ data: data?.items ?? [], columns, getCoreRowModel: getCoreRowModel() });

  if (isLoading) return <TableSkeleton rows={params.pageSize} />;
  if (error) return <ErrorState onRetry={() => refetch()} message="Failed to load users" />;
  if (data && data.items.length === 0) return <EmptyState message={params.search ? 'No matches' : 'No users yet'} />;

  return (
    <>
      <FilterBar params={params} onChange={setParams} />
      <table>
        <thead>{table.getHeaderGroups().map((g) => (
          <tr key={g.id}>{g.headers.map((h) => (
            <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
          ))}</tr>
        ))}</thead>
        <tbody>{table.getRowModel().rows.map((row) => (
          <tr key={row.id}>{row.getVisibleCells().map((cell) => (
            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
          ))}</tr>
        ))}</tbody>
      </table>
      <Pagination total={data!.total} params={params} onChange={setParams} />
    </>
  );
}
```

## Verification checklist

- Changing pagination / sort / filter updates the URL (copy/paste restores state)
- Paging doesn't flash a loading skeleton (`placeholderData: (prev) => prev` works)
- An empty search result shows "No matches"; no data at all shows "No users yet" (two distinct empty causes)
- Loading failure shows a retry button, not a blank page
- Browser back / forward returns to previous list state
- Rows > 100 still scroll smoothly (virtualization works)

## Going further

- TanStack Table docs: <https://tanstack.com/table/latest>
- TanStack Virtual (virtualization): <https://tanstack.com/virtual/latest>
- nuqs (typed URL state): <https://nuqs.47ng.com/>
- Cursor pagination vs offset (cursors win at scale): <https://www.prisma.io/docs/orm/prisma-client/queries/pagination>
- Table accessibility (`role=table` / `scope=col`): <https://www.w3.org/WAI/tutorials/tables/>
