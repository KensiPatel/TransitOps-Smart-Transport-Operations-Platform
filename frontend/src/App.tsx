import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { VehiclesPage } from "@/pages/VehiclesPage";
import { DriversPage } from "@/pages/DriversPage";
import { TripsPage } from "@/pages/TripsPage";
import { MaintenancePage } from "@/pages/MaintenancePage";
import { FuelExpensesPage } from "@/pages/FuelExpensesPage";
import { ReportsPage } from "@/pages/ReportsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/fuel-expenses" element={<FuelExpensesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
