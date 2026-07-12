import { Elysia, t } from "elysia";
import {
  getAllVehicles,
  getAvailableVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  updateVehicleStatus,
} from "./vehicles.service";

export const vehicleRoutes = new Elysia({ prefix: "/vehicles" })

  // GET /vehicles?status=Available&type=Van&region=Ahmedabad
  .get("/", ({ query }) => {
    return getAllVehicles({
      status: query.status as any,
      type: query.type,
      region: query.region,
    });
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      type: t.Optional(t.String()),
      region: t.Optional(t.String()),
    }),
  })

  // GET /vehicles/available — dispatch-pool only (Available status)
  .get("/available", () => {
    return getAvailableVehicles();
  })

  // GET /vehicles/:id
  .get("/:id", ({ params, set }) => {
    const vehicle = getVehicleById(params.id);
    if (!vehicle) {
      set.status = 404;
      return { error: "Vehicle not found." };
    }
    return vehicle;
  })

  // POST /vehicles
  .post("/", ({ body, set }) => {
    try {
      const vehicle = createVehicle(body);
      set.status = 201;
      return vehicle;
    } catch (err: any) {
      set.status = 400;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      registration_number: t.String({ minLength: 1 }),
      name_model: t.String({ minLength: 1 }),
      type: t.String({ minLength: 1 }),
      max_load_capacity: t.Number({ minimum: 0 }),
      odometer: t.Optional(t.Number({ minimum: 0 })),
      acquisition_cost: t.Number({ minimum: 0 }),
      region: t.Optional(t.String()),
    }),
  })

  // PUT /vehicles/:id
  .put("/:id", ({ params, body, set }) => {
    try {
      return updateVehicle(params.id, body);
    } catch (err: any) {
      set.status = 404;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      name_model: t.Optional(t.String()),
      type: t.Optional(t.String()),
      max_load_capacity: t.Optional(t.Number({ minimum: 0 })),
      odometer: t.Optional(t.Number({ minimum: 0 })),
      acquisition_cost: t.Optional(t.Number({ minimum: 0 })),
      region: t.Optional(t.String()),
    }),
  })

  // PATCH /vehicles/:id/status — e.g. manually Retire a vehicle
  .patch("/:id/status", ({ params, body, set }) => {
    try {
      return updateVehicleStatus(params.id, body.status);
    } catch (err: any) {
      set.status = 404;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      status: t.Union([
        t.Literal("Available"),
        t.Literal("On Trip"),
        t.Literal("In Shop"),
        t.Literal("Retired"),
      ]),
    }),
  });