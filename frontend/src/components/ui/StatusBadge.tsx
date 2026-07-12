type Tone = "green" | "orange" | "blue" | "red" | "gray" | "purple";

const TONES: Record<Tone, string> = {
  green: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  orange: "bg-accent/15 text-accent ring-accent/30",
  blue: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  red: "bg-red-500/15 text-red-300 ring-red-500/30",
  gray: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
  purple: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
};

// Every status string the backend can emit -> a tone.
const STATUS_TONE: Record<string, Tone> = {
  // vehicles
  Available: "green",
  "On Trip": "blue",
  "In Shop": "orange",
  Retired: "gray",
  // drivers
  "Off Duty": "gray",
  Suspended: "red",
  // trips
  Draft: "gray",
  Dispatched: "blue",
  Completed: "green",
  Cancelled: "red",
  // maintenance
  Active: "orange",
  Closed: "green",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "gray";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

const SEVERITY_TONE: Record<string, Tone> = {
  critical: "red",
  warning: "orange",
  info: "blue",
};

export function SeverityBadge({ severity }: { severity: string }) {
  const tone = SEVERITY_TONE[severity] ?? "gray";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${TONES[tone]}`}
    >
      {severity}
    </span>
  );
}
