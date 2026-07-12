import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { AuthShell } from "@/components/layout/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

const DEMO = [
  { role: "Fleet Manager", email: "meera.s@transitops.in" },
  { role: "Safety Officer", email: "karan.v@transitops.in" },
  { role: "Financial Analyst", email: "anjali.t@transitops.in" },
  { role: "Driver", email: "raven.k@transitops.in" },
];
const DEMO_PASSWORD = "password123";

function safeRedirect(path: unknown): string {
  return typeof path === "string" && path.startsWith("/") ? path : "/dashboard";
}

export function LoginPage() {
  const { user, login } = useAuthStore();
  const toastNotify = toast;
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = safeRedirect(location.state?.from);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={redirectTo} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim(), password);
      toastNotify.success("Welcome back.");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toastNotify.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <AuthShell heading="Sign in" sub="Enter your credentials to continue.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@transitops.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => toastNotify.info("Coming soon.")}
              className="text-xs text-accent hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {busy ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
          Demo accounts
        </span>
      </div>

      <p className="mb-2 text-center text-xs text-muted-foreground">
        Password: <span className="font-mono text-accent">{DEMO_PASSWORD}</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DEMO.map((d) => (
          <Button
            key={d.email}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fillDemo(d.email)}
            className="h-auto justify-start px-3 py-2 text-left"
          >
            <div>
              <span className="block text-xs font-semibold">{d.role}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {d.email}
              </span>
            </div>
          </Button>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/signup" className="font-semibold text-accent hover:underline">
          Register now
        </Link>
      </p>
    </AuthShell>
  );
}
