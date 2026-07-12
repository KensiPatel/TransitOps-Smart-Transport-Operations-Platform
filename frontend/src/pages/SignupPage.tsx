import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { AuthShell } from "@/components/layout/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

function safeRedirect(path: unknown): string {
  return typeof path === "string" && path.startsWith("/") ? path : "/dashboard";
}

export function SignupPage() {
  const { user, signup } = useAuthStore();
  const toastNotify = toast;
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = safeRedirect(location.state?.from);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("driver");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={redirectTo} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toastNotify.error("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      toastNotify.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await signup(name.trim(), email.trim(), password, role);
      toastNotify.success("Account created.");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toastNotify.error(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      heading="Create your account"
      sub="Fill in the details and start your own TransitOps journey. Build your fleet, manage your vehicles and drive smarter operations."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>I am a</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fleet_manager">
                Fleet Manager — own and manage your vehicles
              </SelectItem>
              <SelectItem value="dispatcher">
                Dispatcher — assign drivers to vehicles
              </SelectItem>
              <SelectItem value="safety_officer">
                Safety Officer — track compliance and driving licenses
              </SelectItem>
              <SelectItem value="financial_analyst">
                Financial Analyst — manage expenses and revenue
              </SelectItem>
              <SelectItem value="driver">
                Driver — operate vehicles and log trips
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose the role that best describes your responsibilities.
          </p>
        </div>

        <div className="relative my-2">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            or
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => toastNotify.info("Google auth coming soon.")}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Register using Google
        </Button>

        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={agree}
            onCheckedChange={(v) => setAgree(v === true)}
          />
          <span className="pt-0.5">I agree to the terms and conditions</span>
        </label>

        <Button type="submit" className="w-full" disabled={busy || !agree}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {busy ? "Creating..." : "Register"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Sign in here
        </Link>
      </p>
    </AuthShell>
  );
}
