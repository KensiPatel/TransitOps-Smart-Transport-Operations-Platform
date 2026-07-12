import type { ReactNode } from "react";

interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyFn: (row: T) => string;
  loading?: boolean;
  empty?: string;
}

export function Table<T>({
  columns,
  rows,
  keyFn,
  loading,
  empty = "Nothing here yet.",
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-600/70">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-ink-700/60 text-left">
            {columns.map((c, i) => (
              <th
                key={i}
                className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 ${c.className ?? ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-600/60">
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-zinc-500"
              >
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-zinc-500"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={keyFn(row)}
                className="transition-colors hover:bg-ink-700/40"
              >
                {columns.map((c, i) => (
                  <td
                    key={i}
                    className={`whitespace-nowrap px-4 py-3 text-zinc-200 ${c.className ?? ""}`}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export type { Column };
