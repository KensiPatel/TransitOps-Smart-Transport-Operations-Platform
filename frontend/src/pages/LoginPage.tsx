import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { AuthShell } from "@/components/layout/AuthShell";
import { Field } from "@/components/ui/Field";

// Seeded accounts (see backend seed.ts). Password is the same for all.
const DEMO = [
  { role: "Fleet Manager", email: "meera.s@transitops.in" },
  { role: "Safety Officer", email: "karan.v@transitops.in" },
  { role: "Financial Analyst", email: "anjali.t@transitops.in" },
  { role: "Driver / Dispatcher", email: "raven.k@transitops.in" },
];
const DEMO_PASSWORD = "password123";

export function LoginPage() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
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
        <Field label="Email">
          <input
            type="email"
            className="input"
            placeholder="you@transitops.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-400">
        Don't have an account?{" "}
        <Link to="/signup" className="font-semibold text-accent hover:underline">
          Register now
        </Link>
      </p>

      {/* Demo accounts — quick role switching for the seeded data. */}
      <div className="mt-8 rounded-xl border border-ink-600/70 bg-ink-800/60 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Demo accounts · password{" "}
          <span className="font-mono text-accent">{DEMO_PASSWORD}</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => fillDemo(d.email)}
              className="rounded-lg border border-ink-600 bg-ink-700 px-3 py-2 text-left text-xs hover:border-accent/50"
            >
              <span className="block font-semibold text-zinc-200">{d.role}</span>
              <span className="block truncate text-zinc-500">{d.email}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
