import { useCallback, useEffect, useState } from "react";
import { reportsApi } from "@/api/reports.api";
import { toast } from "sonner";
import type {
  DriverSafetyReport,
  FuelEfficiencyReport,
  TripCompletionReport,
  VehicleROIReport,
} from "@/types";
import { money, num, pct, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/format";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
}

type Tab = "roi" | "fuel" | "safety" | "completion";
const TABS: { id: Tab; label: string }[] = [
  { id: "roi", label: "Vehicle ROI" },
  { id: "fuel", label: "Fuel Efficiency" },
  { id: "safety", label: "Driver Safety" },
  { id: "completion", label: "Trip Completion" },
];

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Available: "default",
  "On Trip": "secondary",
  "In Shop": "outline",
  Retired: "outline",
  "Off Duty": "outline",
  Suspended: "destructive",
  Draft: "outline",
  Dispatched: "secondary",
  Completed: "default",
  Cancelled: "destructive",
  Active: "outline",
  Closed: "default",
};

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>("roi");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [roi, setRoi] = useState<VehicleROIReport | null>(null);
  const [fuelEff, setFuelEff] = useState<FuelEfficiencyReport | null>(null);
  const [safety, setSafety] = useState<DriverSafetyReport | null>(null);
  const [completion, setCompletion] =
    useState<TripCompletionReport | null>(null);

  const filters = {
    start_date: start || undefined,
    end_date: end || undefined,
    search: search || undefined,
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "roi") setRoi(await reportsApi.vehicleRoi(filters));
      else if (tab === "fuel")
        setFuelEff(await reportsApi.fuelEfficiency(filters));
      else if (tab === "safety")
        setSafety(await reportsApi.driverSafety(filters));
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
    if (tab === "roi" && roi) exportToCsv("vehicle-roi", roi.rows);
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
        {
          metric: "Completion rate %",
          value: completion.completion_rate_percent ?? "—",
        },
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
          <p className="font-semibold text-foreground">{r.name_model}</p>
          <p className="font-mono text-xs text-muted-foreground">
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
        <span
          className={
            r.net_profit >= 0 ? "text-emerald-300" : "text-red-300"
          }
        >
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
              ? "text-muted-foreground"
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
          <p className="font-semibold text-foreground">{r.name_model}</p>
          <p className="font-mono text-xs text-muted-foreground">
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
          <span className="text-muted-foreground">—</span>
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
          <p className="font-semibold text-foreground">{r.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {r.license_number}
          </p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (r) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>
          {r.status}
        </Badge>
      ),
    },
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

  function renderTable<T>(
    cols: Column<T>[],
    rows: T[],
    keyFn: (row: T) => string
  ) {
    if (loading) {
      return (
        <div className="rounded-xl border border-border py-10 text-center text-muted-foreground">
          Loading…
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="rounded-xl border border-border py-10 text-center text-muted-foreground">
          No data in range.
        </div>
      );
    }
    return (
      <div className="overflow-x-auto rounded-xl border border-border">
        <ShadcnTable>
          <TableHeader>
            <TableRow>
              {cols.map((c, i) => (
                <TableHead key={i}>{c.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={keyFn(row)}>
                {cols.map((c, i) => (
                  <TableCell key={i}>{c.cell(row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </ShadcnTable>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ROI, fuel efficiency, safety and completion — exportable to CSV.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-1.5 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-40 space-y-2">
          <Label>From</Label>
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="w-40 space-y-2">
          <Label>To</Label>
          <Input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        {tab !== "completion" && (
          <div className="w-56 space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Vehicle / driver…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}
        {(start || end || search) && (
          <Button
            variant="outline"
            onClick={() => {
              setStart("");
              setEnd("");
              setSearch("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "roi" && (
        <>
          {roi && (
            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card className="ring-1 ring-accent/40">
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total Revenue
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold tabular-nums text-accent">
                    {money(roi.totals.revenue)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Running Cost
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                    {money(roi.totals.running_cost)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Capital Cost
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                    {money(roi.totals.acquisition_cost)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Net Profit
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                    {money(roi.totals.net_profit)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {renderTable(roiCols, roi?.rows ?? [], (r) => r.vehicle_id)}
        </>
      )}

      {tab === "fuel" &&
        renderTable(
          fuelCols,
          fuelEff?.by_vehicle ?? [],
          (r) => r.vehicle_id
        )}

      {tab === "safety" && (
        <>
          {safety && (
            <div className="mb-4">
              <Card className="ring-1 ring-accent/40">
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Fleet Average Safety Score
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold tabular-nums text-accent">
                    {safety.fleet_average_safety_score ?? "—"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {renderTable(safetyCols, safety?.rows ?? [], (r) => r.driver_id)}
        </>
      )}

      {tab === "completion" && completion && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="ring-1 ring-accent/40">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total Trips
                </p>
                <p className="mt-2 font-display text-3xl font-bold tabular-nums text-accent">
                  {completion.total_trips}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Completion Rate
                </p>
                <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                  {pct(completion.completion_rate_percent)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total Revenue
                </p>
                <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                  {money(completion.total_revenue)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total Distance
                </p>
                <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                  {num(completion.total_distance, "km")}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 font-display font-semibold text-foreground">
                Trips by status
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  ["Draft", "Dispatched", "Completed", "Cancelled"] as const
                ).map((s) => (
                  <div
                    key={s}
                    className="rounded-lg border border-border bg-muted p-4 text-center"
                  >
                    <p className="font-display text-3xl font-bold text-foreground">
                      {completion.by_status[s]}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{s}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Range:{" "}
                {completion.range.start_date
                  ? formatDate(completion.range.start_date)
                  : "all time"}{" "}
                →{" "}
                {completion.range.end_date
                  ? formatDate(completion.range.end_date)
                  : "now"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
