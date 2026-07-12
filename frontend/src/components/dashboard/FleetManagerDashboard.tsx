import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { vehiclesApi } from "@/api/vehicles.api";
import { driversApi } from "@/api/drivers.api";
import { tripsApi } from "@/api/trips.api";
import { maintenanceApi } from "@/api/maintenance.api";
import type {
  Alert,
  Driver,
  FleetStatusSummary,
  MaintenanceLog,
  MaintenanceSummary,
  RecentTrip,
  Trip,
  Vehicle,
} from "@/types";
import {
  computeAlerts,
  computeFleet,
  computeMaintenance,
  computeRecentTrips,
  fleetUtilization,
  tripsPerDay,
} from "@/lib/computeDashboard";
import { money, num, pct, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DonutChart, TrendArea } from "@/components/ui/Charts";
import { Bell } from "lucide-react";
import { toast } from "sonner";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
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

const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
  info: "outline",
};

export function FleetManagerDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  const [fleet, setFleet] = useState<FleetStatusSummary | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceSummary | null>(null);
  const [recent, setRecent] = useState<RecentTrip[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [vehicleList, driverList, tripList, maint]: [
          Vehicle[],
          Driver[],
          Trip[],
          MaintenanceLog[]
        ] = await Promise.all([
          vehiclesApi.list(),
          driversApi.list(),
          tripsApi.list(),
          maintenanceApi.list(),
        ]);

        setFleet(computeFleet(vehicleList, driverList, tripList));
        setMaintenance(computeMaintenance(maint));
        setRecent(computeRecentTrips(tripList, vehicleList, driverList));
        setAlerts(computeAlerts(driverList, vehicleList, maint));
        setTrips(tripList);
        setVehicles(vehicleList);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !fleet || !maintenance) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  const utilization = fleetUtilization(fleet);
  const totalRevenue = trips
    .filter((t) => t.status === "Completed")
    .reduce((s, t) => s + t.revenue, 0);
  const donut = [
    { name: "Available", value: fleet.vehicles.Available },
    { name: "On Trip", value: fleet.vehicles["On Trip"] },
    { name: "In Shop", value: fleet.vehicles["In Shop"] },
    { name: "Retired", value: fleet.vehicles.Retired },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Fleet Manager Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user?.name.split(" ")[0]}. Here's your fleet overview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="ring-1 ring-accent/40">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Trips</p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-accent">{fleet.trips.Dispatched}</p>
            <p className="mt-1 text-xs text-muted-foreground">{fleet.trips.Draft} pending draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Available Vehicles</p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">{fleet.vehicles.Available}</p>
            <p className="mt-1 text-xs text-muted-foreground">of {fleet.vehicles.total} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">In Maintenance</p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">{fleet.vehicles["In Shop"]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{money(maintenance.active_cost_outstanding)} outstanding</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fleet Utilization</p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">{utilization}%</p>
            <p className="mt-1 text-xs text-muted-foreground">vehicles on the road</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Revenue</p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">{money(totalRevenue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">from {fleet.trips.Completed} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Maintenance Cost</p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">{money(maintenance.cost_this_month)}</p>
            <p className="mt-1 text-xs text-muted-foreground">this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-1 font-display font-semibold text-foreground">
            Vehicle status
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Distribution across the fleet
          </p>
          <DonutChart
            data={donut}
            centerLabel="vehicles"
            centerValue={fleet.vehicles.total}
          />
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-display font-semibold text-foreground">
              Trips created
            </h3>
            <span className="text-xs text-muted-foreground">last 7 days</span>
          </div>
          <TrendArea data={tripsPerDay(trips)} dataKey="trips" xKey="day" />
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {(["Draft", "Dispatched", "Completed", "Cancelled"] as const).map(
              (s) => (
                <div key={s} className="rounded-lg bg-muted py-2">
                  <p className="font-display text-lg font-bold text-foreground">
                    {fleet.trips[s]}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{s}</p>
                </div>
              )
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 font-display font-semibold text-foreground">
            Recent activity
          </h3>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No trips yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      <span className="font-mono text-accent">{t.trip_code}</span>{" "}
                      · {t.source} → {t.destination}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.vehicle_registration ?? "No vehicle"} ·{" "}
                      {t.driver_name ?? "No driver"} · {formatDate(t.created_at)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[t.status] ?? "secondary"}>{t.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent" />
            <h3 className="font-display font-semibold text-foreground">Alerts</h3>
            {alerts.length > 0 && (
              <span className="ml-auto rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">
                {alerts.length}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              All clear — nothing needs attention.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {alerts.slice(0, 8).map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-muted p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      {a.entity_label}
                    </span>
                    <Badge variant={SEVERITY_VARIANT[a.severity] ?? "secondary"}>{a.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
