import { Elysia, t } from "elysia";
import { requireAuth, requireRole } from "../../shared/rbac";
import {
  getDashboardSummary,
  getFleetStatusSummary,
  getMaintenanceSummary,
  getRecentTrips,
  getAlerts,
} from "./dashboard.service";

export const dashboardRoutes = new Elysia({ prefix: "/dashboard" })
  // Must be logged in, then must be a management/analytics role.
  .use(requireAuth)
  .use(requireRole("fleet_manager", "financial_analyst", "driver", "dispatcher", "safety_officer"))

  // GET /dashboard?recent_limit=5&license_expiry_window_days=30&in_shop_alert_days=7
  .get("/", ({ query }) => {
    return getDashboardSummary({
      recent_limit: query.recent_limit,
      license_expiry_window_days: query.license_expiry_window_days,
      in_shop_alert_days: query.in_shop_alert_days,
    });
  }, {
    query: t.Object({
      recent_limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50 })),
      license_expiry_window_days: t.Optional(t.Numeric({ minimum: 0 })),
      in_shop_alert_days: t.Optional(t.Numeric({ minimum: 0 })),
    }),
  })

  // GET /dashboard/fleet — status counts only
  .get("/fleet", () => {
    return getFleetStatusSummary();
  })

  // GET /dashboard/maintenance — maintenance cost summary only
  .get("/maintenance", () => {
    return getMaintenanceSummary();
  })

  // GET /dashboard/recent-trips?limit=10&search=ahmedabad
  .get("/recent-trips", ({ query }) => {
    return getRecentTrips(query.limit ?? 5, query.search);
  }, {
    query: t.Object({
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50 })),
      search: t.Optional(t.String()),
    }),
  })

  // GET /dashboard/alerts?license_expiry_window_days=30&in_shop_alert_days=7
  .get("/alerts", ({ query }) => {
    return getAlerts(
      query.license_expiry_window_days ?? 30,
      query.in_shop_alert_days ?? 7
    );
  }, {
    query: t.Object({
      license_expiry_window_days: t.Optional(t.Numeric({ minimum: 0 })),
      in_shop_alert_days: t.Optional(t.Numeric({ minimum: 0 })),
    }),
  });