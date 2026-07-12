import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
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
import { money, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusBadge, SeverityBadge } from "@/components/ui/StatusBadge";
import { DonutChart, TrendArea } from "@/components/ui/Charts";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";

export function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  const [fleet, setFleet] = useState<FleetStatusSummary | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceSummary | null>(null);
  const [recent, setRecent] = useState<RecentTrip[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    (async () => {
      try {
        // All four are open (no auth) endpoints — safe for every role and
        // never triggers the 403 that /dashboard would for driver/safety.
        const [vehicles, drivers, tripList, maint]: [
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

        setFleet(computeFleet(vehicles, drivers, tripList));
        setMaintenance(computeMaintenance(maint));
        setRecent(computeRecentTrips(tripList, vehicles, drivers));
        setAlerts(computeAlerts(drivers, vehicles, maint));
        setTrips(tripList);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  if (loading || !fleet || !maintenance) {
    return (
      <div className="grid place-items-center py-24 text-zinc-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-accent" />
      </div>
    );
  }

  const utilization = fleetUtilization(fleet);
  const donut = [
    { name: "Available", value: fleet.vehicles.Available },
    { name: "On Trip", value: fleet.vehicles["On Trip"] },
    { name: "In Shop", value: fleet.vehicles["In Shop"] },
    { name: "Retired", value: fleet.vehicles.Retired },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0]}`}
        subtitle="Here's the state of your fleet right now."
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Active Trips"
          value={fleet.trips.Dispatched}
          hint={`${fleet.trips.Draft} pending`}
          accent
        />
        <KpiCard
          label="Available Vehicles"
          value={fleet.vehicles.Available}
          hint={`of ${fleet.vehicles.total} total`}
        />
        <KpiCard
          label="In Maintenance"
          value={fleet.vehicles["In Shop"]}
          hint={money(maintenance.active_cost_outstanding) + " outstanding"}
        />
        <KpiCard
          label="Fleet Utilization"
          value={`${utilization}%`}
          hint="vehicles on the road"
        />
      </div>

      {/* Charts row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h3 className="mb-1 font-display font-semibold text-zinc-100">
            Vehicle status
          </h3>
          <p className="mb-2 text-xs text-zinc-500">
            Distribution across the fleet
          </p>
          <DonutChart
            data={donut}
            centerLabel="vehicles"
            centerValue={fleet.vehicles.total}
          />
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-display font-semibold text-zinc-100">
              Trips created
            </h3>
            <span className="text-xs text-zinc-500">last 7 days</span>
          </div>
          <TrendArea data={tripsPerDay(trips)} dataKey="trips" xKey="day" />
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {(["Draft", "Dispatched", "Completed", "Cancelled"] as const).map(
              (s) => (
                <div key={s} className="rounded-lg bg-ink-700/60 py-2">
                  <p className="font-display text-lg font-bold text-zinc-100">
                    {fleet.trips[s]}
                  </p>
                  <p className="text-[11px] text-zinc-500">{s}</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Recent trips + alerts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-3 font-display font-semibold text-zinc-100">
            Recent activity
          </h3>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              No trips yet.
            </p>
          ) : (
            <ul className="divide-y divide-ink-600/60">
              {recent.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">
                      <span className="font-mono text-accent">{t.trip_code}</span>{" "}
                      · {t.source} → {t.destination}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {t.vehicle_registration ?? "No vehicle"} ·{" "}
                      {t.driver_name ?? "No driver"} · {formatDate(t.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="bell" className="h-4 w-4 text-accent" />
            <h3 className="font-display font-semibold text-zinc-100">Alerts</h3>
            {alerts.length > 0 && (
              <span className="ml-auto rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">
                {alerts.length}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              All clear — nothing needs attention.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {alerts.slice(0, 8).map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-ink-600/70 bg-ink-700/40 p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">
                      {a.entity_label}
                    </span>
                    <SeverityBadge severity={a.severity} />
                  </div>
                  <p className="text-xs text-zinc-400">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
