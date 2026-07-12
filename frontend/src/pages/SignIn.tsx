import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

export default function SignIn() {
    const { loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900">TransitOps</h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Sign in to manage your fleet
                    </p>
                </div>

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
        </div>
    );
}