import type { VehicleStatus } from "../vehicles/vehicles.types";
import type { DriverStatus } from "../drivers/drivers.types";
import type { TripStatus } from "../trips/trips.types";

// ---------- Fleet status counts ----------

export interface VehicleStatusCounts {
  Available: number;
  "On Trip": number;
  "In Shop": number;
  Retired: number;
  total: number;
}

export interface DriverStatusCounts {
  Available: number;
  "On Trip": number;
  "Off Duty": number;
  Suspended: number;
  total: number;
}

export interface TripStatusCounts {
  Draft: number;
  Dispatched: number;
  Completed: number;
  Cancelled: number;
  total: number;
}

export interface FleetStatusSummary {
  vehicles: VehicleStatusCounts;
  drivers: DriverStatusCounts;
  trips: TripStatusCounts;
}

// ---------- Maintenance summary (this month) ----------

export interface MaintenanceSummary {
  active_count: number;         // logs currently Active
  cost_this_month: number;      // sum of cost for logs started this month
  active_cost_outstanding: number; // sum of cost across Active logs
}

// ---------- Recent trips ----------

export interface RecentTrip {
  id: string;
  trip_code: string;
  source: string;
  destination: string;
  status: TripStatus;
  vehicle_registration: string | null; // joined from vehicles
  driver_name: string | null;           // joined from drivers
  created_at: string;
}

// ---------- Alerts ----------

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  type:
    | "license_expiring"
    | "license_expired"
    | "vehicle_in_shop_too_long"
    | "driver_suspended";
  severity: AlertSeverity;
  message: string;
  entity_id: string;   // driver_id or vehicle_id the alert concerns
  entity_label: string; // human-readable (driver name / vehicle registration)
}

// ---------- Full dashboard payload ----------

export interface DashboardSummary {
  fleet: FleetStatusSummary;
  maintenance: MaintenanceSummary;
  recent_trips: RecentTrip[];
  alerts: Alert[];
  generated_at: string;
}

// ---------- Options ----------

export interface DashboardOptions {
  recent_limit?: number;              // how many recent trips (default 5)
  license_expiry_window_days?: number; // "expiring soon" horizon (default 30)
  in_shop_alert_days?: number;         // in-shop-too-long threshold (default 7)
}