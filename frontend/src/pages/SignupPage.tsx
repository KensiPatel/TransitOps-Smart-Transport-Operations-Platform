import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { AuthShell } from "@/components/layout/AuthShell";
import { Field } from "@/components/ui/Field";

export function SignupPage() {
  const { user, signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await signup(name.trim(), email.trim(), password);
      toast.success("Account created.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      heading="Create your account"
      sub="Build your fleet and start smarter operations."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <input
            className="input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className="input"
            placeholder="you@transitops.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="Confirm password">
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="h-4 w-4 rounded border-ink-500 bg-ink-700 accent-accent"
            required
          />
          I agree to the terms and conditions
        </label>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={busy || !agree}
        >
          {busy ? "Creating…" : "Register"}
        </button>
      </form>

      <p className="mt-3 text-center text-xs text-zinc-500">
        New accounts are created with the <strong>Driver</strong> role. Other
        roles are assigned by an administrator.
      </p>

      <p className="mt-5 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Sign in here
        </Link>
      </p>
    </AuthShell>
  );
}
