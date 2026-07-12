import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { driversApi } from "@/api/drivers.api";
import { vehiclesApi } from "@/api/vehicles.api";
import { maintenanceApi } from "@/api/maintenance.api";
import type { Driver, Vehicle, MaintenanceLog } from "@/types";
import { money, formatDate, daysUntil } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { Shield, AlertTriangle, XCircle, Ban, CheckCircle, Wrench } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Available: "default",
  "On Trip": "secondary",
  "In Shop": "outline",
  Retired: "outline",
  "Off Duty": "outline",
  Suspended: "destructive",
  Dispatched: "secondary",
  Completed: "default",
  Cancelled: "destructive",
  Active: "outline",
  Closed: "default",
};

const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  critical: "destructive",
  warning: "secondary",
  info: "outline",
};

export function SafetyOfficerDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [d, v, m] = await Promise.all([
          driversApi.list(),
          vehiclesApi.list(),
          maintenanceApi.list(),
        ]);
        setDrivers(d);
        setVehicles(v);
        setMaintenanceLogs(m);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  const expiredLicenses = drivers.filter((d) => daysUntil(d.license_expiry_date) < 0);
  const expiringLicenses = drivers.filter((d) => {
    const days = daysUntil(d.license_expiry_date);
    return days >= 0 && days <= 30;
  });
  const suspendedDrivers = drivers.filter((d) => d.status === "Suspended");
  const validDrivers = drivers.filter((d) => daysUntil(d.license_expiry_date) >= 0);
  const complianceRate = drivers.length > 0 ? Math.round((validDrivers.length / drivers.length) * 100) : 0;

  const driverStatusCounts = {
    Available: drivers.filter((d) => d.status === "Available").length,
    "On Trip": drivers.filter((d) => d.status === "On Trip").length,
    "Off Duty": drivers.filter((d) => d.status === "Off Duty").length,
    Suspended: drivers.filter((d) => d.status === "Suspended").length,
  };

  const activeMaintenance = maintenanceLogs.filter((m) => m.status === "Active");
  const vById = new Map(vehicles.map((v) => [v.id, v]));

  const licenseAlerts = drivers
    .map((d) => {
      const days = daysUntil(d.license_expiry_date);
      return { driver: d, days };
    })
    .filter((item) => item.days <= 30)
    .sort((a, b) => a.days - b.days);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Safety Officer Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            License compliance and driver safety overview
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Total Drivers</p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {drivers.length}
            </p>
          </CardContent>
        </Card>
        <Card className="ring-1 ring-yellow-500/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <p className="text-xs font-medium uppercase tracking-wide">Expiring Soon</p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-yellow-600">
              {expiringLicenses.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">within 30 days</p>
          </CardContent>
        </Card>
        <Card className="ring-1 ring-destructive/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4 text-destructive" />
              <p className="text-xs font-medium uppercase tracking-wide">Expired</p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-destructive">
              {expiredLicenses.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">licenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Ban className="h-4 w-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Suspended</p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {suspendedDrivers.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">drivers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Compliance Rate</p>
            </div>
            <p className={`mt-2 font-display text-3xl font-bold tabular-nums ${complianceRate >= 90 ? "text-green-600" : complianceRate >= 70 ? "text-yellow-600" : "text-destructive"}`}>
              {complianceRate}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">valid licenses</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-0">
            <div className="px-4 pt-4 pb-2">
              <h3 className="font-display font-semibold text-foreground">
                License Expiry Alerts
              </h3>
              <p className="text-xs text-muted-foreground">
                Drivers with expiring or expired licenses
              </p>
            </div>
            {licenseAlerts.length === 0 ? (
              <div className="px-4 pb-4">
                <p className="py-6 text-center text-sm text-muted-foreground">
                  All licenses are valid — nothing needs attention.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Driver</TableCell>
                    <TableCell>License No.</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Days</TableCell>
                    <TableCell>Severity</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenseAlerts.map(({ driver, days }) => {
                    const severity = days < 0 ? "critical" : days <= 7 ? "warning" : "info";
                    return (
                      <TableRow key={driver.id}>
                        <TableCell className="font-semibold text-foreground">
                          {driver.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {driver.license_number}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(driver.license_expiry_date)}
                        </TableCell>
                        <TableCell>
                          <span className={days < 0 ? "text-destructive font-semibold" : days <= 7 ? "text-yellow-600 font-semibold" : "text-muted-foreground"}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={SEVERITY_VARIANT[severity]}>
                            {severity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 font-display font-semibold text-foreground">
              Driver Status Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {(["Available", "On Trip", "Off Duty", "Suspended"] as const).map((status) => (
                <div key={status} className="rounded-lg border border-border bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
                      {status}
                    </Badge>
                    <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                      {driverStatusCounts[status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardContent className="p-0">
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display font-semibold text-foreground">
                  Vehicles in Maintenance
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Active maintenance logs
              </p>
            </div>
            {activeMaintenance.length === 0 ? (
              <div className="px-4 pb-4">
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No active maintenance logs.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Cost</TableCell>
                    <TableCell>Started</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeMaintenance.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs font-semibold text-accent">
                        {vById.get(m.vehicle_id)?.registration_number ?? "—"}
                      </TableCell>
                      <TableCell>{m.type}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {m.description ?? "—"}
                      </TableCell>
                      <TableCell>{money(m.cost)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(m.started_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[m.status] ?? "secondary"}>
                          {m.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
