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