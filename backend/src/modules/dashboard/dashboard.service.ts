import { db, now } from "../../db/client";
import type {
  FleetStatusSummary,
  VehicleStatusCounts,
  DriverStatusCounts,
  TripStatusCounts,
  MaintenanceSummary,
  RecentTrip,
  Alert,
  DashboardSummary,
  DashboardOptions,
} from "./dashboard.types";

const DEFAULT_RECENT_LIMIT = 5;
const DEFAULT_LICENSE_WINDOW_DAYS = 30;
const DEFAULT_IN_SHOP_ALERT_DAYS = 7;

/**
 * Counts rows grouped by a status column, then folds the result into a
 * fixed-shape object so the frontend always gets every status key (even
 * zero-count ones) rather than a sparse map.
 */
function countByStatus(table: string): Record<string, number> {
  const rows = db
    .query(`SELECT status, COUNT(*) as count FROM ${table} GROUP BY status`)
    .all() as { status: string; count: number }[];

  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = r.count;
  return out;
}

/**
 * Fleet status counts — vehicles, drivers, and trips broken down by status.
 * Used by: Dashboard top row of status cards.
 */
export function getFleetStatusSummary(): FleetStatusSummary {
  const v = countByStatus("vehicles");
  const d = countByStatus("drivers");
  const t = countByStatus("trips");

  const vehicles: VehicleStatusCounts = {
    Available: v["Available"] ?? 0,
    "On Trip": v["On Trip"] ?? 0,
    "In Shop": v["In Shop"] ?? 0,
    Retired: v["Retired"] ?? 0,
    total: 0,
  };
  vehicles.total =
    vehicles.Available + vehicles["On Trip"] + vehicles["In Shop"] + vehicles.Retired;

  const drivers: DriverStatusCounts = {
    Available: d["Available"] ?? 0,
    "On Trip": d["On Trip"] ?? 0,
    "Off Duty": d["Off Duty"] ?? 0,
    Suspended: d["Suspended"] ?? 0,
    total: 0,
  };
  drivers.total =
    drivers.Available + drivers["On Trip"] + drivers["Off Duty"] + drivers.Suspended;

  const trips: TripStatusCounts = {
    Draft: t["Draft"] ?? 0,
    Dispatched: t["Dispatched"] ?? 0,
    Completed: t["Completed"] ?? 0,
    Cancelled: t["Cancelled"] ?? 0,
    total: 0,
  };
  trips.total = trips.Draft + trips.Dispatched + trips.Completed + trips.Cancelled;

  return { vehicles, drivers, trips };
}

/**
 * Maintenance summary for the current calendar month.
 *  - active_count: logs currently Active
 *  - cost_this_month: sum of cost for logs started in the current month
 *  - active_cost_outstanding: sum of cost across all Active logs
 * Used by: Dashboard maintenance card.
 */
export function getMaintenanceSummary(): MaintenanceSummary {
  const activeCount = db
    .query("SELECT COUNT(*) as c FROM maintenance_logs WHERE status = 'Active'")
    .get() as { c: number };

  // started_at is stored as 'YYYY-MM-DD HH:MM:SS'; compare on the YYYY-MM prefix.
  const monthPrefix = now().slice(0, 7); // 'YYYY-MM'
  const monthCost = db
    .query(
      `SELECT COALESCE(SUM(cost), 0) as s
       FROM maintenance_logs
       WHERE substr(started_at, 1, 7) = ?`
    )
    .get(monthPrefix) as { s: number };

  const activeCost = db
    .query(
      "SELECT COALESCE(SUM(cost), 0) as s FROM maintenance_logs WHERE status = 'Active'"
    )
    .get() as { s: number };

  return {
    active_count: activeCount.c,
    cost_this_month: monthCost.s,
    active_cost_outstanding: activeCost.s,
  };
}

/**
 * Recent trips with vehicle registration + driver name joined in.
 * Optional `search` matches trip_code / source / destination /
 * vehicle registration / driver name (case-insensitive substring).
 * Used by: Dashboard recent-activity list.
 */
export function getRecentTrips(limit = DEFAULT_RECENT_LIMIT, search?: string): RecentTrip[] {
  let query = `
    SELECT
      tr.id,
      tr.trip_code,
      tr.source,
      tr.destination,
      tr.status,
      v.registration_number AS vehicle_registration,
      d.name AS driver_name,
      tr.created_at
    FROM trips tr
    LEFT JOIN vehicles v ON v.id = tr.vehicle_id
    LEFT JOIN drivers  d ON d.id = tr.driver_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (search && search.trim() !== "") {
    const term = `%${search.trim().toLowerCase()}%`;
    query += `
      AND (
        LOWER(tr.trip_code)   LIKE ?
        OR LOWER(tr.source)      LIKE ?
        OR LOWER(tr.destination) LIKE ?
        OR LOWER(COALESCE(v.registration_number, '')) LIKE ?
        OR LOWER(COALESCE(d.name, '')) LIKE ?
      )
    `;
    params.push(term, term, term, term, term);
  }

  query += " ORDER BY tr.created_at DESC LIMIT ?";
  params.push(limit);

  return db.query(query).all(...params) as RecentTrip[];
}

/**
 * Alerts:
 *  - drivers whose license is already expired (critical)
 *  - drivers whose license expires within `licenseWindowDays` (warning)
 *  - vehicles In Shop with an Active maintenance log older than
 *    `inShopAlertDays` (warning)
 *  - suspended drivers (info)
 * Used by: Dashboard alerts panel.
 */
export function getAlerts(
  licenseWindowDays = DEFAULT_LICENSE_WINDOW_DAYS,
  inShopAlertDays = DEFAULT_IN_SHOP_ALERT_DAYS
): Alert[] {
  const alerts: Alert[] = [];
  const today = now().slice(0, 10);

  // Expired + expiring licenses in one pass.
  const drivers = db
    .query(
      `SELECT id, name, license_number, license_expiry_date, status
       FROM drivers
       WHERE license_expiry_date <= date(?, '+' || ? || ' days')
       ORDER BY license_expiry_date ASC`
    )
    .all(today, licenseWindowDays) as {
    id: string;
    name: string;
    license_number: string;
    license_expiry_date: string;
    status: string;
  }[];

  for (const d of drivers) {
    if (d.license_expiry_date < today) {
      alerts.push({
        type: "license_expired",
        severity: "critical",
        message: `${d.name}'s license (${d.license_number}) expired on ${d.license_expiry_date}.`,
        entity_id: d.id,
        entity_label: d.name,
      });
    } else {
      alerts.push({
        type: "license_expiring",
        severity: "warning",
        message: `${d.name}'s license (${d.license_number}) expires on ${d.license_expiry_date}.`,
        entity_id: d.id,
        entity_label: d.name,
      });
    }
  }

  // Suspended drivers.
  const suspended = db
    .query("SELECT id, name FROM drivers WHERE status = 'Suspended'")
    .all() as { id: string; name: string }[];
  for (const s of suspended) {
    alerts.push({
      type: "driver_suspended",
      severity: "info",
      message: `${s.name} is currently Suspended.`,
      entity_id: s.id,
      entity_label: s.name,
    });
  }

  // Vehicles in shop too long — Active maintenance log older than threshold.
  const stuck = db
    .query(
      `SELECT v.id, v.registration_number, MIN(m.started_at) AS since
       FROM vehicles v
       JOIN maintenance_logs m ON m.vehicle_id = v.id AND m.status = 'Active'
       WHERE v.status = 'In Shop'
       GROUP BY v.id
       HAVING MIN(m.started_at) <= datetime(?, '-' || ? || ' days')`
    )
    .all(now(), inShopAlertDays) as {
    id: string;
    registration_number: string;
    since: string;
  }[];

  for (const veh of stuck) {
    alerts.push({
      type: "vehicle_in_shop_too_long",
      severity: "warning",
      message: `${veh.registration_number} has been In Shop since ${veh.since}.`,
      entity_id: veh.id,
      entity_label: veh.registration_number,
    });
  }

  return alerts;
}

/**
 * Assembles the full dashboard payload in one call.
 * Used by: GET /dashboard
 */
export function getDashboardSummary(options: DashboardOptions = {}): DashboardSummary {
  const recentLimit = options.recent_limit ?? DEFAULT_RECENT_LIMIT;
  const licenseWindow = options.license_expiry_window_days ?? DEFAULT_LICENSE_WINDOW_DAYS;
  const inShopDays = options.in_shop_alert_days ?? DEFAULT_IN_SHOP_ALERT_DAYS;

  return {
    fleet: getFleetStatusSummary(),
    maintenance: getMaintenanceSummary(),
    recent_trips: getRecentTrips(recentLimit),
    alerts: getAlerts(licenseWindow, inShopDays),
    generated_at: now(),
  };
}