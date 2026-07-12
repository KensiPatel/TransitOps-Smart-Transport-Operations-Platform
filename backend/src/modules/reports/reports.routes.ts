import { Elysia, t } from "elysia";
import { requireAuth, requireRole } from "../../shared/rbac";
import {
  getVehicleROIReport,
  getFuelEfficiencyReport,
  getDriverSafetyReport,
  getTripCompletionReport,
} from "./reports.service";

// Shared query schema for report filters.
const reportQuery = t.Object({
  start_date: t.Optional(t.String()),
  end_date: t.Optional(t.String()),
  search: t.Optional(t.String()),
});

export const reportRoutes = new Elysia({ prefix: "/reports" })
  // Must be logged in, then must be a management/analytics role.
  .use(requireAuth)
  .use(requireRole("fleet_manager", "financial_analyst"))

  // GET /reports/vehicle-roi?start_date=&end_date=&search=
  .get("/vehicle-roi", ({ query }) => {
    return getVehicleROIReport(query);
  }, { query: reportQuery })

  // GET /reports/fuel-efficiency?start_date=&end_date=&search=
  .get("/fuel-efficiency", ({ query }) => {
    return getFuelEfficiencyReport(query);
  }, { query: reportQuery })

  // GET /reports/driver-safety?start_date=&end_date=&search=
  .get("/driver-safety", ({ query }) => {
    return getDriverSafetyReport(query);
  }, { query: reportQuery })

  // GET /reports/trip-completion?start_date=&end_date=
  .get("/trip-completion", ({ query }) => {
    return getTripCompletionReport(query);
  }, {
    query: t.Object({
      start_date: t.Optional(t.String()),
      end_date: t.Optional(t.String()),
    }),
  });