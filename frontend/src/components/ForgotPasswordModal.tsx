import { useState } from "react";
import { useAuth } from "../lib/auth-context";

export function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
    const { forgotPassword, resetPassword } = useAuth();
    const [step, setStep] = useState<"email" | "otp">("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [displayedOtp, setDisplayedOtp] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [busy, setBusy] = useState(false);

    async function handleRequestOtp(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            const otpValue = await forgotPassword(email);
            setDisplayedOtp(otpValue);
            setStep("otp");
        } catch (err: any) {
            setError(err.message ?? "Something went wrong");
        } finally {
            setBusy(false);
        }
    }

    async function handleReset(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            await resetPassword(email, otp, newPassword);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message ?? "Something went wrong");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-900">Reset password</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {success ? (
                    <div className="text-center py-4">
                        <p className="text-green-600 font-medium mb-4">
                            Password reset successful.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800"
                        >
                            Back to sign in
                        </button>
                    </div>
                ) : step === "email" ? (
                    <form onSubmit={handleRequestOtp} className="flex flex-col gap-3">
                        <p className="text-sm text-slate-500">
                            Enter your account email — we'll show you a one-time code.
                        </p>
                        <input
                            type="email"
                            required
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                        {error && <p className="text-red-500 text-xs">{error}</p>}
                        <button
                            type="submit"
                            disabled={busy}
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50"
                        >
                            {busy ? "Sending..." : "Send code"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleReset} className="flex flex-col gap-3">
                        {displayedOtp && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
                                Your OTP: <span className="font-mono font-bold">{displayedOtp}</span>
                                <p className="text-xs text-amber-600 mt-1">
                                    (Shown here since email delivery isn't set up yet — expires in 5 minutes)
                                </p>
                            </div>
                        )}
                        <input
                            type="text"
                            required
                            maxLength={6}
                            placeholder="6-digit code"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                        <input
                            type="password"
                            required
                            minLength={8}
                            placeholder="New password (min 8 characters)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                        {error && <p className="text-red-500 text-xs">{error}</p>}
                        <button
                            type="submit"
                            disabled={busy}
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50"
                        >
                            {busy ? "Resetting..." : "Reset password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}