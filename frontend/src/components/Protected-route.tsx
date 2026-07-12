import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type UserRole } from "../lib/auth-context";

export function ProtectedRoute({
    children,
    allowedRoles,
}: {
    children: ReactNode;
    allowedRoles?: UserRole[];
}) {
    const { user, loading } = useAuth();

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!user) return <Navigate to="/signin" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}