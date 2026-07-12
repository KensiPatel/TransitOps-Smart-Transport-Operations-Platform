import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";

import { authRoutes } from "./modules/auth/auth.routes";
import { vehicleRoutes } from "./modules/vehicles/vehicles.routes";
import { driverRoutes } from "./modules/drivers/drivers.routes";
import { tripRoutes } from "./modules/trips/trips.routes";
import { maintenanceRoutes } from "./modules/maintenance/maintenance.routes";
import { fuelRoutes } from "./modules/fuel-expenses/fuel-expenses.routes";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";
import { reportRoutes } from "./modules/reports/reports.routes";

const PORT = Number(Bun.env.PORT ?? 4000);
const JWT_SECRET = Bun.env.JWT_SECRET ?? "change-this-in-production";

const app = new Elysia()
  .use(
    cors({
      origin: Bun.env.FRONTEND_URL ?? "http://localhost:5173",
      credentials: true,
    })
  )
  .use(
    jwt({
      name: "jwt",
      secret: JWT_SECRET,
    })
  )

  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))

  .use(authRoutes)
  .use(vehicleRoutes)
  .use(driverRoutes)
  .use(tripRoutes)
  .use(maintenanceRoutes)
  .use(fuelRoutes)
  .use(dashboardRoutes)
  .use(reportRoutes)

  .listen(PORT);

console.log(`TransitOps backend running at http://localhost:${app.server?.port}`);
