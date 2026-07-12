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
import { daysUntil, todayISO } from "./format";

// Derives the same numbers the backend dashboard.service produces, but from
// the open list endpoints — used for driver & safety_officer, who are not
// authorized to call /dashboard.

export function computeFleet(
  vehicles: Vehicle[],
  drivers: Driver[],
  trips: Trip[]
): FleetStatusSummary {
  const count = <K extends string>(arr: { status: string }[], keys: K[]) => {
    const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
    for (const r of arr) if (r.status in out) out[r.status as K]++;
    return out;
  };

  const v = count(vehicles, ["Available", "On Trip", "In Shop", "Retired"]);
  const d = count(drivers, ["Available", "On Trip", "Off Duty", "Suspended"]);
  const t = count(trips, ["Draft", "Dispatched", "Completed", "Cancelled"]);

  return {
    vehicles: { ...v, total: vehicles.length },
    drivers: { ...d, total: drivers.length },
    trips: { ...t, total: trips.length },
  };
}

export function computeMaintenance(logs: MaintenanceLog[]): MaintenanceSummary {
  const month = todayISO().slice(0, 7);
  const active = logs.filter((l) => l.status === "Active");
  return {
    active_count: active.length,
    cost_this_month: logs
      .filter((l) => l.started_at.slice(0, 7) === month)
      .reduce((s, l) => s + l.cost, 0),
    active_cost_outstanding: active.reduce((s, l) => s + l.cost, 0),
  };
}

export function computeRecentTrips(
  trips: Trip[],
  vehicles: Vehicle[],
  drivers: Driver[],
  limit = 5
): RecentTrip[] {
  const vById = new Map(vehicles.map((v) => [v.id, v]));
  const dById = new Map(drivers.map((d) => [d.id, d]));
  return [...trips]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((tr) => ({
      id: tr.id,
      trip_code: tr.trip_code,
      source: tr.source,
      destination: tr.destination,
      status: tr.status,
      vehicle_registration: tr.vehicle_id
        ? vById.get(tr.vehicle_id)?.registration_number ?? null
        : null,
      driver_name: tr.driver_id ? dById.get(tr.driver_id)?.name ?? null : null,
      created_at: tr.created_at,
    }));
}

export function computeAlerts(
  drivers: Driver[],
  vehicles: Vehicle[],
  maintenance: MaintenanceLog[],
  licenseWindowDays = 30,
  inShopAlertDays = 7
): Alert[] {
  const alerts: Alert[] = [];

  for (const d of drivers) {
    const days = daysUntil(d.license_expiry_date);
    if (days < 0) {
      alerts.push({
        type: "license_expired",
        severity: "critical",
        message: `${d.name}'s license (${d.license_number}) expired on ${d.license_expiry_date}.`,
        entity_id: d.id,
        entity_label: d.name,
      });
    } else if (days <= licenseWindowDays) {
      alerts.push({
        type: "license_expiring",
        severity: "warning",
        message: `${d.name}'s license (${d.license_number}) expires on ${d.license_expiry_date}.`,
        entity_id: d.id,
        entity_label: d.name,
      });
    }
  }

  for (const d of drivers.filter((x) => x.status === "Suspended")) {
    alerts.push({
      type: "driver_suspended",
      severity: "info",
      message: `${d.name} is currently Suspended.`,
      entity_id: d.id,
      entity_label: d.name,
    });
  }

  const vById = new Map(vehicles.map((v) => [v.id, v]));
  const stuck = new Map<string, string>(); // vehicle_id -> earliest started_at
  for (const m of maintenance) {
    if (m.status !== "Active") continue;
    const veh = vById.get(m.vehicle_id);
    if (!veh || veh.status !== "In Shop") continue;
    const prev = stuck.get(m.vehicle_id);
    if (!prev || m.started_at < prev) stuck.set(m.vehicle_id, m.started_at);
  }
  for (const [vehId, since] of stuck) {
    if (daysUntil(since.slice(0, 10)) <= -inShopAlertDays) {
      const veh = vById.get(vehId)!;
      alerts.push({
        type: "vehicle_in_shop_too_long",
        severity: "warning",
        message: `${veh.registration_number} has been In Shop since ${since}.`,
        entity_id: vehId,
        entity_label: veh.registration_number,
      });
    }
  }

  return alerts;
}

/** Fleet utilization % = vehicles On Trip / active (non-retired) fleet. */
export function fleetUtilization(fleet: FleetStatusSummary): number {
  const active = fleet.vehicles.total - fleet.vehicles.Retired;
  if (active <= 0) return 0;
  return Math.round((fleet.vehicles["On Trip"] / active) * 100);
}

/** Trips created per day for the last `days` days, for the trend chart. */
export function tripsPerDay(trips: Trip[], days = 7) {
  const buckets: { day: string; trips: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const trips_count = trips.filter(
      (t) => t.created_at.slice(0, 10) === iso
    ).length;
    buckets.push({ day: label, trips: trips_count });
  }
  return buckets;
}
