// Small formatting + export helpers used across pages.

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const money = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : inr.format(n);

export const num = (n: number | null | undefined, unit = ""): string =>
  n === null || n === undefined
    ? "—"
    : `${new Intl.NumberFormat("en-IN").format(n)}${unit ? " " + unit : ""}`;

export const pct = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : `${n}%`;

/** 'YYYY-MM-DD HH:MM:SS' | ISO -> 'DD MMM YYYY'. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

/** Days until a 'YYYY-MM-DD' date (negative = already passed). */
export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

/** Turn an array of flat objects into a CSV file and trigger a download. */
export function exportToCsv<T extends object>(
  filename: string,
  rows: T[],
  columns?: { key: keyof T; label: string }[]
): void {
  if (rows.length === 0) return;

  const cols =
    columns ??
    (Object.keys(rows[0] as Record<string, unknown>).map((k) => ({
      key: k as keyof T,
      label: k,
    })) as { key: keyof T; label: string }[]);

  const escape = (val: unknown): string => {
    const s = val === null || val === undefined ? "" : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = cols.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((row) =>
      cols.map((c) => escape((row as Record<string, unknown>)[c.key as string])).join(",")
    )
    .join("\n");

  const blob = new Blob([`${header}\n${body}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
