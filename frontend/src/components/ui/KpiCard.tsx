import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
}

export function KpiCard({ label, value, hint, accent }: KpiCardProps) {
  return (
    <div
      className={`card p-4 ${accent ? "ring-1 ring-accent/40" : ""}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-2 font-display text-3xl font-bold tabular-nums ${accent ? "text-accent" : "text-zinc-100"}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
