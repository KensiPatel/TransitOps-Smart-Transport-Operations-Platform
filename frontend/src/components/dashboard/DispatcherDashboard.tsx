import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { vehiclesApi } from "@/api/vehicles.api";
import { driversApi } from "@/api/drivers.api";
import { tripsApi } from "@/api/trips.api";
import type { Vehicle, Driver, Trip } from "@/types";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { Truck, Users, Zap, FileText, ArrowRight } from "lucide-react";

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

export function DispatcherDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [v, d, t] = await Promise.all([
          vehiclesApi.list(),
          driversApi.list(),
          tripsApi.list(),
        ]);
        setVehicles(v);
        setDrivers(d);
        setTrips(t);
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

  const availableVehicles = vehicles.filter((v) => v.status === "Available");
  const availableDrivers = drivers.filter((d) => d.status === "Available");
  const activeDispatches = trips.filter((t) => t.status === "Dispatched");
  const pendingTrips = trips.filter((t) => t.status === "Draft");

  const vById = new Map(vehicles.map((v) => [v.id, v]));
  const dById = new Map(drivers.map((d) => [d.id, d]));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Dispatcher Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fleet allocation and dispatch operations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="ring-1 ring-accent/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="h-4 w-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Available Vehicles</p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-accent">
              {availableVehicles.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              of {vehicles.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Available Drivers</p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {availableDrivers.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              of {drivers.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Active Dispatches</p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {activeDispatches.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Pending Trips</p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {pendingTrips.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              awaiting dispatch
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-0">
            <div className="px-4 pt-4 pb-2">
              <h3 className="font-display font-semibold text-foreground">
                Vehicle Status Overview
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Registration</TableCell>
                  <TableCell>Model</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Region</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs font-semibold text-accent">
                      {v.registration_number}
                    </TableCell>
                    <TableCell>{v.name_model}</TableCell>
                    <TableCell>{v.type}</TableCell>
                    <TableCell>{v.region ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[v.status] ?? "secondary"}>
                        {v.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {vehicles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No vehicles found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="px-4 pt-4 pb-2">
              <h3 className="font-display font-semibold text-foreground">
                Available Drivers
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>License</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Safety Score</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableDrivers.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-semibold text-foreground">
                      {d.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {d.license_number}
                    </TableCell>
                    <TableCell>{d.contact_number}</TableCell>
                    <TableCell>
                      <span className={d.safety_score >= 80 ? "text-green-600" : d.safety_score >= 50 ? "text-yellow-600" : "text-red-600"}>
                        {d.safety_score}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[d.status] ?? "secondary"}>
                        {d.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {availableDrivers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No drivers available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardContent className="p-0">
            <div className="px-4 pt-4 pb-2">
              <h3 className="font-display font-semibold text-foreground">
                Active Dispatches
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Trip Code</TableCell>
                  <TableCell>Route</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Dispatched</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeDispatches.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs font-semibold text-accent">
                      {t.trip_code}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm">
                        {t.source}
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        {t.destination}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.vehicle_id ? vById.get(t.vehicle_id)?.registration_number ?? "—" : "—"}
                    </TableCell>
                    <TableCell>
                      {t.driver_id ? dById.get(t.driver_id)?.name ?? "—" : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(t.dispatched_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {activeDispatches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No active dispatches.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
