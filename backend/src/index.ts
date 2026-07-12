import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./modules/auth/auth.routes";
// ...your other route imports

const app = new Elysia()
    .use(
        cors({
            origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
            credentials: true, // required so the browser sends/receives the session cookie
        })
    )
    .use(authRoutes)
    // .use(vehicleRoutes) etc.
    .listen(3000);

console.log(`Server running at ${app.server?.hostname}:${app.server?.port}`);
import { jwt } from "@elysiajs/jwt";

// ---------- Module imports ----------
// Uncomment each line as your teammate finishes that module.
// Keeping them commented out means this file runs standalone right now,
// without being blocked on modules that don't exist yet.

// import { authRoutes } from "./modules/auth/auth.routes";
import { vehicleRoutes } from "./modules/vehicles/vehicles.routes";
import { driverRoutes } from "./modules/drivers/drivers.routes";
// import { tripRoutes } from "./modules/trips/trip.routes";
// import { maintenanceRoutes } from "./modules/maintenance/maintenance.routes";
// import { fuelRoutes } from "./modules/fuel-expenses/fuel.routes";
// import { expenseRoutes } from "./modules/fuel-expenses/expense.routes";
// import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";
// import { reportRoutes } from "./modules/reports/reports.routes";

const PORT = Number(Bun.env.PORT ?? 4000);
const JWT_SECRET = Bun.env.JWT_SECRET ?? "change-this-in-production";

const app = new Elysia()
  // Allow the frontend (different port) to call this API
  .use(
    cors({
      origin: true, // reflect request origin — fine for hackathon; lock down later if needed
      credentials: true,
    })
  )
  // JWT plugin — makes `jwt.sign(...)` / `jwt.verify(...)` available in route
  // context wherever `.use(jwt(...))` is applied. Your teammate's auth module
  // will use this to issue tokens on login.
  .use(
    jwt({
      name: "jwt",
      secret: JWT_SECRET,
    })
  )

  // ---------- Health check ----------
  // Confirms the server is alive before any real modules are wired in.
  // Test with: curl http://localhost:4000/health
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))

  // ---------- Mount modules here as they're finished ----------
  // .use(authRoutes)
  .use(vehicleRoutes)
  .use(driverRoutes)
  // .use(tripRoutes)
  // .use(maintenanceRoutes)
  // .use(fuelRoutes)
  // .use(expenseRoutes)
  // .use(dashboardRoutes)
  // .use(reportRoutes)

  .listen(PORT);

console.log(`TransitOps backend running at http://localhost:${app.server?.port}`);
