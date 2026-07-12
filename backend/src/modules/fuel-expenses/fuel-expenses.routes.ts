import { Elysia, t } from "elysia";
import {
  getAllFuelLogs,
  getFuelLogById,
  createFuelLog,
  updateFuelLog,
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
} from "./fuel-expenses.service";

// ============================================
// FUEL LOGS — /fuel-logs
// ============================================
export const fuelRoutes = new Elysia({ prefix: "/fuel-logs" })

  // GET /fuel-logs?vehicle_id=...&trip_id=...
  .get("/", ({ query }) => {
    return getAllFuelLogs({
      vehicle_id: query.vehicle_id,
      trip_id: query.trip_id,
    });
  }, {
    query: t.Object({
      vehicle_id: t.Optional(t.String()),
      trip_id: t.Optional(t.String()),
    }),
  })

  // GET /fuel-logs/:id
  .get("/:id", ({ params, set }) => {
    const log = getFuelLogById(params.id);
    if (!log) {
      set.status = 404;
      return { error: "Fuel log not found." };
    }
    return log;
  })

  // POST /fuel-logs
  .post("/", ({ body, set }) => {
    try {
      const log = createFuelLog(body);
      set.status = 201;
      return log;
    } catch (err: any) {
      set.status = err.message.includes("not found") ? 404 : 400;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      vehicle_id: t.String({ minLength: 1 }),
      trip_id: t.Optional(t.String()),
      liters: t.Number({ minimum: 0 }),
      cost: t.Number({ minimum: 0 }),
      log_date: t.String({ minLength: 1 }),
      created_by: t.Optional(t.String()),
    }),
  })

  // PUT /fuel-logs/:id
  .put("/:id", ({ params, body, set }) => {
    try {
      return updateFuelLog(params.id, body);
    } catch (err: any) {
      set.status = err.message === "Fuel log not found." ? 404 : 400;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      liters: t.Optional(t.Number({ minimum: 0 })),
      cost: t.Optional(t.Number({ minimum: 0 })),
      log_date: t.Optional(t.String()),
    }),
  });

// ============================================
// EXPENSES — /expenses
// ============================================
export const expenseRoutes = new Elysia({ prefix: "/expenses" })

  // GET /expenses?vehicle_id=...&trip_id=...&category=toll
  .get("/", ({ query }) => {
    return getAllExpenses({
      vehicle_id: query.vehicle_id,
      trip_id: query.trip_id,
      category: query.category,
    });
  }, {
    query: t.Object({
      vehicle_id: t.Optional(t.String()),
      trip_id: t.Optional(t.String()),
      category: t.Optional(t.String()),
    }),
  })

  // GET /expenses/:id
  .get("/:id", ({ params, set }) => {
    const expense = getExpenseById(params.id);
    if (!expense) {
      set.status = 404;
      return { error: "Expense not found." };
    }
    return expense;
  })

  // POST /expenses
  .post("/", ({ body, set }) => {
    try {
      const expense = createExpense(body);
      set.status = 201;
      return expense;
    } catch (err: any) {
      set.status = err.message.includes("not found") ? 404 : 400;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      vehicle_id: t.String({ minLength: 1 }),
      trip_id: t.Optional(t.String()),
      category: t.String({ minLength: 1 }),
      amount: t.Number({ minimum: 0 }),
      expense_date: t.String({ minLength: 1 }),
      created_by: t.Optional(t.String()),
    }),
  })

  // PUT /expenses/:id
  .put("/:id", ({ params, body, set }) => {
    try {
      return updateExpense(params.id, body);
    } catch (err: any) {
      set.status = err.message === "Expense not found." ? 404 : 400;
      return { error: err.message };
    }
  }, {
    body: t.Object({
      category: t.Optional(t.String()),
      amount: t.Optional(t.Number({ minimum: 0 })),
      expense_date: t.Optional(t.String()),
    }),
  });