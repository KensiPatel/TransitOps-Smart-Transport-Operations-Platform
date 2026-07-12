import { useAuth } from "../lib/auth-context";

export default function Dashboard() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Welcome, {user?.name}
                        </h1>
                        <p className="text-slate-500 text-sm">{user?.email} · {user?.role}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800"
                    >
                        Log out
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <p className="text-slate-600">
                        Dashboard content goes here — KPIs, fleet stats, etc.
                    </p>
                </div>
            </div>
        </div>
    );
}