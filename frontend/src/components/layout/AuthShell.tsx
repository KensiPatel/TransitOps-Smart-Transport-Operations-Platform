import type { ReactNode } from "react";
import { Truck, Check } from "lucide-react";

const FEATURES = [
  "Register vehicles and drivers with live status",
  "Dispatch trips with capacity & licence validation",
  "Track maintenance, fuel and expenses per vehicle",
  "ROI, fuel efficiency and safety analytics",
];

export function AuthShell({
  heading,
  sub,
  children,
}: {
  heading: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-card lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-ink-900">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-xl font-bold text-foreground">
              TransitOps
            </p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Smart Transport Operations
            </p>
          </div>
        </div>

        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-foreground">
            Run your fleet from
            <br />
            <span className="text-accent">one control room.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Retire the spreadsheets. Manage the full lifecycle — vehicles,
            drivers, dispatch, maintenance and cost — with business rules
            enforced end to end.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-start gap-3 text-sm text-foreground/80"
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/20 text-accent">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} TransitOps &middot; Fleet operations
          platform
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-accent text-ink-900">
              <Truck className="h-6 w-6" />
            </div>
            <p className="font-display text-xl font-bold text-foreground">
              TransitOps
            </p>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {heading}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
