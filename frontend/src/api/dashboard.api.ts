import { http } from "./client";
import type {
  DashboardSummary,
  FleetStatusSummary,
  MaintenanceSummary,
  RecentTrip,
  Alert,
} from "@/types";

// NOTE: These endpoints are role-gated on the backend (reports.routes.ts /
// dashboard.routes.ts require fleet_manager OR financial_analyst). For driver
// and safety_officer roles the DashboardPage builds KPIs from the open
// vehicles/drivers/trips endpoints instead, so it never triggers a 403 here.

interface DashboardParams {
  recent_limit?: number;
  license_expiry_window_days?: number;
  in_shop_alert_days?: number;
}

export const dashboardApi = {
  summary: (params: DashboardParams = {}) =>
    http.get<DashboardSummary>("/dashboard", params),

  fleet: () => http.get<FleetStatusSummary>("/dashboard/fleet"),

  maintenance: () => http.get<MaintenanceSummary>("/dashboard/maintenance"),

  recentTrips: (limit = 5, search?: string) =>
    http.get<RecentTrip[]>("/dashboard/recent-trips", { limit, search }),

  alerts: (
    license_expiry_window_days = 30,
    in_shop_alert_days = 7
  ) =>
    http.get<Alert[]>("/dashboard/alerts", {
      license_expiry_window_days,
      in_shop_alert_days,
    }),
};
