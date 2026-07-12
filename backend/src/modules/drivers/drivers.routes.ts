import { Elysia, t } from "elysia";
import {
  getAllDrivers,
  getAvailableDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  updateDriverStatus,
} from "./drivers.service";

export const driverRoutes = new Elysia({ prefix: "/drivers" })

  // GET /drivers?status=Available&license_category=HMV
  .get("/", ({ query }) => {
    return getAllDrivers({
      status: query.status as any,
      license_category: query.license_category,
    });
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      license_category: t.Optional(t.String()),
    }),
  })

  // GET /drivers/available — dispatch-pool only (Available status, unexpired license)
  .get("/available", () => {
    return getAvailableDrivers();
  })

  // GET /drivers/:id
  .get("/:id", ({ params, set }) => {
    const driver = getDriverById(params.id);
    if (!driver) {
      set.status = 404;
      return { error: "Driver not found." };
    }
    return driver;
  })

  // POST /drivers
  .post("/", ({ body, set }) => {
    try {
      const driver = createDriver(body);
      set.status = 201;
      return driver;
    } catch (err: any) {
      set.status = 400;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      user_id: t.Optional(t.String()),
      name: t.String({ minLength: 1 }),
      license_number: t.String({ minLength: 1 }),
      license_category: t.String({ minLength: 1 }),
      license_expiry_date: t.String({ minLength: 1 }),
      contact_number: t.String({ minLength: 1 }),
      safety_score: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
    }),
  })

  // PUT /drivers/:id
  .put("/:id", ({ params, body, set }) => {
    try {
      return updateDriver(params.id, body);
    } catch (err: any) {
      set.status = 404;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      license_category: t.Optional(t.String()),
      license_expiry_date: t.Optional(t.String()),
      contact_number: t.Optional(t.String()),
      safety_score: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
    }),
  })

  // PATCH /drivers/:id/status — e.g. Suspend a driver
  .patch("/:id/status", ({ params, body, set }) => {
    try {
      return updateDriverStatus(params.id, body.status);
    } catch (err: any) {
      set.status = 404;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      status: t.Union([
        t.Literal("Available"),
        t.Literal("On Trip"),
        t.Literal("Off Duty"),
        t.Literal("Suspended"),
      ]),
    }),
  });