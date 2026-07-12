import { useCallback, useEffect, useState } from "react";
import { reportsApi } from "@/api/reports.api";
import { useToast } from "@/components/ui/Toast";
import type {
  DriverSafetyReport,
  FuelEfficiencyReport,
  TripCompletionReport,
  VehicleROIReport,
} from "@/types";
import { money, num, pct, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { Table, type Column } from "@/components/ui/Table";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Tab = "roi" | "fuel" | "safety" | "completion";
const TABS: { id: Tab; label: string }[] = [
  { id: "roi", label: "Vehicle ROI" },
  { id: "fuel", label: "Fuel Efficiency" },
  { id: "safety", label: "Driver Safety" },
  { id: "completion", label: "Trip Completion" },
];

export function ReportsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("roi");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [roi, setRoi] = useState<VehicleROIReport | null>(null);
  const [fuelEff, setFuelEff] = useState<FuelEfficiencyReport | null>(null);
  const [safety, setSafety] = useState<DriverSafetyReport | null>(null);
  const [completion, setCompletion] = useState<TripCompletionReport | null>(null);

  const filters = { start_date: start || undefined, end_date: end || undefined, search: search || undefined };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "roi") setRoi(await reportsApi.vehicleRoi(filters));
      else if (tab === "fuel") setFuelEff(await reportsApi.fuelEfficiency(filters));
      else if (tab === "safety") setSafety(await reportsApi.driverSafety(filters));
      else
        setCompletion(
          await reportsApi.tripCompletion({
            start_date: start || undefined,
            end_date: end || undefined,
          })
        );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, start, end, search]);

  useEffect(() => {
    load();
  }, [load]);

  function handleExport() {
    if (tab === "roi" && roi)
      exportToCsv("vehicle-roi", roi.rows);
    else if (tab === "fuel" && fuelEff)
      exportToCsv("fuel-efficiency-by-vehicle", fuelEff.by_vehicle);
    else if (tab === "safety" && safety)
      exportToCsv("driver-safety", safety.rows);
    else if (tab === "completion" && completion)
      exportToCsv("trip-completion", [
        { metric: "Total trips", value: completion.total_trips },
        { metric: "Draft", value: completion.by_status.Draft },
        { metric: "Dispatched", value: completion.by_status.Dispatched },
        { metric: "Completed", value: completion.by_status.Completed },
        { metric: "Cancelled", value: completion.by_status.Cancelled },
        { metric: "Completion rate %", value: completion.completion_rate_percent ?? "—" },
        { metric: "Total revenue", value: completion.total_revenue },
        { metric: "Total distance", value: completion.total_distance },
      ]);
    toast.success("CSV exported.");
  }

  const roiCols: Column<VehicleROIReport["rows"][number]>[] = [
    {
      header: "Vehicle",
      cell: (r) => (
        <div>
          <p className="font-semibold text-zinc-100">{r.name_model}</p>
          <p className="font-mono text-xs text-zinc-500">
            {r.registration_number}
          </p>
        </div>
      ),
    },
    { header: "Revenue", cell: (r) => money(r.revenue) },
    { header: "Running cost", cell: (r) => money(r.running_cost) },
    { header: "Acq. cost", cell: (r) => money(r.acquisition_cost) },
    {
      header: "Net profit",
      cell: (r) => (
        <span className={r.net_profit >= 0 ? "text-emerald-300" : "text-red-300"}>
          {money(r.net_profit)}
        </span>
      ),
    },
    {
      header: "ROI",
      cell: (r) => (
        <span
          className={
            r.roi_percent == null
              ? "text-zinc-500"
              : r.roi_percent >= 0
                ? "text-emerald-300"
                : "text-red-300"
          }
        >
          {pct(r.roi_percent)}
        </span>
      ),
    },
  ];

  const fuelCols: Column<FuelEfficiencyReport["by_vehicle"][number]>[] = [
    {
      header: "Vehicle",
      cell: (r) => (
        <div>
          <p className="font-semibold text-zinc-100">{r.name_model}</p>
          <p className="font-mono text-xs text-zinc-500">
            {r.registration_number}
          </p>
        </div>
      ),
    },
    { header: "Distance", cell: (r) => num(r.total_distance, "km") },
    { header: "Fuel", cell: (r) => num(r.total_liters, "L") },
    { header: "Fuel cost", cell: (r) => money(r.total_fuel_cost) },
    {
      header: "km / L",
      cell: (r) =>
        r.km_per_liter == null ? (
          <span className="text-zinc-500">—</span>
        ) : (
          <span className="text-accent">{r.km_per_liter}</span>
        ),
    },
    {
      header: "₹ / km",
      cell: (r) => (r.cost_per_km == null ? "—" : money(r.cost_per_km)),
    },
  ];

  const safetyCols: Column<DriverSafetyReport["rows"][number]>[] = [
    {
      header: "Driver",
      cell: (r) => (
        <div>
          <p className="font-semibold text-zinc-100">{r.name}</p>
          <p className="font-mono text-xs text-zinc-500">{r.license_number}</p>
        </div>
      ),
    },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      header: "Safety score",
      cell: (r) => (
        <span
          className={
            r.safety_score >= 90
              ? "text-emerald-300"
              : r.safety_score >= 75
                ? "text-accent"
                : "text-red-300"
          }
        >
          {r.safety_score}
        </span>
      ),
    },
    { header: "Completed trips", cell: (r) => r.completed_trips },
    { header: "Distance", cell: (r) => num(r.total_distance, "km") },
  ];

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle="ROI, fuel efficiency, safety and completion — exportable to CSV."
        actions={
          <button onClick={handleExport} className="btn-ghost">
            <Icon name="download" className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Field label="From">
            <input
              type="date"
              className="input"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
        </div>
        <div className="w-40">
          <Field label="To">
            <input
              type="date"
              className="input"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
        </div>
        {tab !== "completion" && (
          <div className="w-56">
            <Field label="Search">
              <input
                className="input"
                placeholder="Vehicle / driver…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Field>
          </div>
        )}
        {(start || end || search) && (
          <button
            className="btn-ghost"
            onClick={() => {
              setStart("");
              setEnd("");
              setSearch("");
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5 rounded-lg border border-ink-600 bg-ink-800 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-accent text-ink-900"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "roi" && (
        <>
          {roi && (
            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard label="Total Revenue" value={money(roi.totals.revenue)} accent />
              <KpiCard label="Running Cost" value={money(roi.totals.running_cost)} />
              <KpiCard label="Capital Cost" value={money(roi.totals.acquisition_cost)} />
              <KpiCard
                label="Net Profit"
                value={money(roi.totals.net_profit)}
              />
            </div>
          )}
          <Table
            columns={roiCols}
            rows={roi?.rows ?? []}
            keyFn={(r) => r.vehicle_id}
            loading={loading}
            empty="No vehicles in range."
          />
        </>
      )}

      {tab === "fuel" && (
        <Table
          columns={fuelCols}
          rows={fuelEff?.by_vehicle ?? []}
          keyFn={(r) => r.vehicle_id}
          loading={loading}
          empty="No fuel data in range."
        />
      )}

      {tab === "safety" && (
        <>
          {safety && (
            <div className="mb-4">
              <KpiCard
                label="Fleet Average Safety Score"
                value={safety.fleet_average_safety_score ?? "—"}
                accent
              />
            </div>
          )}
          <Table
            columns={safetyCols}
            rows={safety?.rows ?? []}
            keyFn={(r) => r.driver_id}
            loading={loading}
            empty="No drivers in range."
          />
        </>
      )}

      {tab === "completion" && completion && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Total Trips" value={completion.total_trips} accent />
            <KpiCard
              label="Completion Rate"
              value={pct(completion.completion_rate_percent)}
            />
            <KpiCard label="Total Revenue" value={money(completion.total_revenue)} />
            <KpiCard label="Total Distance" value={num(completion.total_distance, "km")} />
          </div>
          <div className="card p-5">
            <h3 className="mb-3 font-display font-semibold text-zinc-100">
              Trips by status
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["Draft", "Dispatched", "Completed", "Cancelled"] as const).map(
                (s) => (
                  <div
                    key={s}
                    className="rounded-lg border border-ink-600/70 bg-ink-700/40 p-4 text-center"
                  >
                    <p className="font-display text-3xl font-bold text-zinc-100">
                      {completion.by_status[s]}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{s}</p>
                  </div>
                )
              )}
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              Range:{" "}
              {completion.range.start_date
                ? formatDate(completion.range.start_date)
                : "all time"}{" "}
              → {completion.range.end_date ? formatDate(completion.range.end_date) : "now"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
