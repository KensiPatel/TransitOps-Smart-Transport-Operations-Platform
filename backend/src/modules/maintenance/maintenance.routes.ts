import { Elysia, t } from "elysia";
import {
  getAllMaintenanceLogs,
  getMaintenanceLogById,
  createMaintenanceLog,
  updateMaintenanceLog,
  closeMaintenanceLog,
} from "./maintenance.service";

export const maintenanceRoutes = new Elysia({ prefix: "/maintenance" })

  // GET /maintenance?vehicle_id=...&status=Active
  .get("/", ({ query }) => {
    return getAllMaintenanceLogs({
      vehicle_id: query.vehicle_id,
      status: query.status as any,
    });
  }, {
    query: t.Object({
      vehicle_id: t.Optional(t.String()),
      status: t.Optional(t.String()),
    }),
  })

  // GET /maintenance/:id
  .get("/:id", ({ params, set }) => {
    const log = getMaintenanceLogById(params.id);
    if (!log) {
      set.status = 404;
      return { error: "Maintenance log not found." };
    }
    return log;
  })

  // POST /maintenance — opens a log, flips vehicle to In Shop
  .post("/", ({ body, set }) => {
    try {
      const log = createMaintenanceLog(body);
      set.status = 201;
      return log;
    } catch (err: any) {
      set.status = err.message === "Vehicle not found." ? 404 : 400;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      vehicle_id: t.String({ minLength: 1 }),
      type: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      cost: t.Number({ minimum: 0 }),
      created_by: t.Optional(t.String()),
    }),
  })

  // PUT /maintenance/:id — only permitted while Active
  .put("/:id", ({ params, body, set }) => {
    try {
      return updateMaintenanceLog(params.id, body);
    } catch (err: any) {
      set.status = err.message === "Maintenance log not found." ? 404 : 400;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      type: t.Optional(t.String()),
      description: t.Optional(t.String()),
      cost: t.Optional(t.Number({ minimum: 0 })),
    }),
  })

  // POST /maintenance/:id/close — Active -> Closed, may release vehicle
  .post("/:id/close", ({ params, set }) => {
    try {
      return closeMaintenanceLog(params.id);
    } catch (err: any) {
      set.status = err.message === "Maintenance log not found." ? 404 : 400;
      return { error: err.message };
    }
  });