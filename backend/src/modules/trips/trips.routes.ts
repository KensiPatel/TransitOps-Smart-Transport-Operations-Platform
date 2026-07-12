import { Elysia, t } from "elysia";
import {
  getAllTrips,
  getTripById,
  createTrip,
  updateTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
} from "./trips.service";

export const tripRoutes = new Elysia({ prefix: "/trips" })

  // GET /trips?status=Dispatched&vehicle_id=...&driver_id=...
  .get("/", ({ query }) => {
    return getAllTrips({
      status: query.status as any,
      vehicle_id: query.vehicle_id,
      driver_id: query.driver_id,
    });
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      vehicle_id: t.Optional(t.String()),
      driver_id: t.Optional(t.String()),
    }),
  })

  // GET /trips/:id
  .get("/:id", ({ params, set }) => {
    const trip = getTripById(params.id);
    if (!trip) {
      set.status = 404;
      return { error: "Trip not found." };
    }
    return trip;
  })

  // POST /trips — creates a Draft trip
  .post("/", ({ body, set }) => {
    try {
      const trip = createTrip(body);
      set.status = 201;
      return trip;
    } catch (err: any) {
      set.status = 400;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      source: t.String({ minLength: 1 }),
      destination: t.String({ minLength: 1 }),
      cargo_weight: t.Number({ minimum: 0 }),
      planned_distance: t.Number({ minimum: 0 }),
      vehicle_id: t.Optional(t.String()),
      driver_id: t.Optional(t.String()),
      created_by: t.Optional(t.String()),
    }),
  })

  // PUT /trips/:id — only permitted while the trip is Draft
  .put("/:id", ({ params, body, set }) => {
    try {
      return updateTrip(params.id, body);
    } catch (err: any) {
      set.status = err.message === "Trip not found." ? 404 : 400;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      source: t.Optional(t.String()),
      destination: t.Optional(t.String()),
      cargo_weight: t.Optional(t.Number({ minimum: 0 })),
      planned_distance: t.Optional(t.Number({ minimum: 0 })),
      vehicle_id: t.Optional(t.String()),
      driver_id: t.Optional(t.String()),
    }),
  })

  // POST /trips/:id/dispatch — Draft -> Dispatched, locks in vehicle + driver
  .post("/:id/dispatch", ({ params, set }) => {
    try {
      return dispatchTrip(params.id);
    } catch (err: any) {
      set.status = err.message === "Trip not found." ? 404 : 400;
      return { error: err.message };
    }
  })

  // POST /trips/:id/complete — Dispatched -> Completed, frees vehicle + driver
  .post("/:id/complete", ({ params, body, set }) => {
    try {
      return completeTrip(params.id, body);
    } catch (err: any) {
      set.status = err.message === "Trip not found." ? 404 : 400;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      actual_distance: t.Number({ minimum: 0 }),
      fuel_consumed: t.Number({ minimum: 0 }),
      revenue: t.Optional(t.Number({ minimum: 0 })),
    }),
  })

  // POST /trips/:id/cancel — Draft -> Cancelled only
  .post("/:id/cancel", ({ params, set }) => {
    try {
      return cancelTrip(params.id);
    } catch (err: any) {
      set.status = err.message === "Trip not found." ? 404 : 400;
      return { error: err.message };
    }
  });