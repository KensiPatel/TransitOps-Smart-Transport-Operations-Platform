import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { ForgotPasswordModal } from "../components/ForgotPasswordModal";

export default function SignIn() {
    const { loginWithGoogle, login, signup } = useAuth();
    const navigate = useNavigate();

    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            if (mode === "signin") {
                await login(email, password);
            } else {
                await signup(name, email, password);
            }
            navigate("/dashboard");
        } catch (err: any) {
            setError(err.message ?? "Something went wrong");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 flex flex-col gap-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900">TransitOps</h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        {mode === "signin" ? "Sign in to manage your fleet" : "Create your account"}
                    </p>
                </div>

                <div className="flex bg-slate-100 rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => { setMode("signin"); setError(""); }}
                        className={`flex-1 py-1.5 text-sm rounded-md transition ${mode === "signin" ? "bg-white shadow-sm font-medium text-slate-900" : "text-slate-500"
                            }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode("signup"); setError(""); }}
                        className={`flex-1 py-1.5 text-sm rounded-md transition ${mode === "signup" ? "bg-white shadow-sm font-medium text-slate-900" : "text-slate-500"
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={async (credentialResponse) => {
                            if (!credentialResponse.credential) return;
                            try {
                                await loginWithGoogle(credentialResponse.credential);
                                navigate("/dashboard");
                            } catch (err) {
                                console.error(err);
                            }
                        }}
                        onError={() => console.error("Google login failed")}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="h-px bg-slate-200 flex-1" />
                    <span className="text-xs text-slate-400">OR</span>
                    <div className="h-px bg-slate-200 flex-1" />
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    {mode === "signup" && (
                        <input
                            type="text"
                            required
                            placeholder="Full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                    )}
                    <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <input
                        type="password"
                        required
                        minLength={8}
                        placeholder="Password (min 8 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />

                    {mode === "signin" && (
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-xs text-slate-500 hover:text-slate-700 text-left"
                        >
                            Forgot password?
                        </button>
                    )}

                    {error && <p className="text-red-500 text-xs">{error}</p>}

                    <button
                        type="submit"
                        disabled={busy}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50"
                    >
                        {busy ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
                    </button>
                </form>
            </div>

            {showForgotPassword && (
                <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
            )}
        </div>
    );
}