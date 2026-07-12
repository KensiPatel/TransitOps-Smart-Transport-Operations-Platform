import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { vehiclesApi } from "@/api/vehicles.api";
import { driversApi } from "@/api/drivers.api";
import { tripsApi } from "@/api/trips.api";
import { fuelApi, expensesApi } from "@/api/fuelExpenses.api";
import type { Driver, Trip, Vehicle, FuelLog, Expense } from "@/types";
import { money, num, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Available: "default",
  "On Trip": "secondary",
  "In Shop": "outline",
  Retired: "outline",
  "Off Duty": "outline",
  Suspended: "destructive",
  Draft: "outline",
  Dispatched: "secondary",
  Completed: "default",
  Cancelled: "destructive",
  Active: "outline",
  Closed: "default",
};

function daysAgo(dateStr: string, days: number): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(now.getDate() - days);
  return d >= cutoff;
}

export function DriverDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [tripList, vehicleList, driverList, fuelList, expenseList] =
          await Promise.all([
            tripsApi.list(),
            vehiclesApi.list(),
            driversApi.list(),
            fuelApi.list(),
            expensesApi.list(),
          ]);
        setTrips(tripList);
        setVehicles(vehicleList);
        setDrivers(driverList);
        setFuelLogs(fuelList);
        setExpenses(expenseList);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const vById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const dById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  const today = new Date().toISOString().slice(0, 10);

  const completedTrips = useMemo(
    () => trips.filter((t) => t.status === "Completed"),
    [trips]
  );

  const todaysEarnings = useMemo(
    () =>
      completedTrips
        .filter((t) => t.completed_at && t.completed_at.slice(0, 10) === today)
        .reduce((s, t) => s + t.revenue, 0),
    [completedTrips, today]
  );

  const weeklyEarnings = useMemo(
    () =>
      completedTrips
        .filter((t) => t.completed_at && daysAgo(t.completed_at, 7))
        .reduce((s, t) => s + t.revenue, 0),
    [completedTrips]
  );

  const totalTrips = trips.length;

  const activeTrip = useMemo(
    () => trips.find((t) => t.status === "Dispatched") ?? null,
    [trips]
  );

  const recentCompleted = useMemo(
    () =>
      completedTrips
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 10),
    [completedTrips]
  );

  const totalFuelCost = useMemo(
    () => fuelLogs.reduce((s, f) => s + f.cost, 0),
    [fuelLogs]
  );

  const totalExpenseAmount = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  if (loading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  const activeVehicle = activeTrip?.vehicle_id
    ? vById.get(activeTrip.vehicle_id)
    : null;
  const activeDriver = activeTrip?.driver_id
    ? dById.get(activeTrip.driver_id)
    : null;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Driver Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user?.name.split("")[0]}. Here's your summary.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="ring-1 ring-accent/40">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Today's Earnings
            </p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-accent">
              {money(todaysEarnings)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">completed today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Weekly Earnings
            </p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {money(weeklyEarnings)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total Trips
            </p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {num(totalTrips)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{completedTrips.length} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Active Trips
            </p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {trips.filter((t) => t.status === "Dispatched").length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">in progress</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 font-display font-semibold text-foreground">
            Current Trip
          </h3>
          {!activeTrip ? (
            <div className="rounded-lg border border-border bg-muted p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No active trip right now. You're off duty.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-lg font-bold text-accent">
                    {activeTrip.trip_code}
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {activeTrip.source} → {activeTrip.destination}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[activeTrip.status] ?? "secondary"}>
                  {activeTrip.status}
                </Badge>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="font-semibold text-foreground">
                    {activeVehicle?.registration_number ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Driver</p>
                  <p className="font-semibold text-foreground">
                    {activeDriver?.name ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-semibold text-foreground">
                    {activeDriver?.contact_number ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="font-semibold text-foreground">
                    {money(activeTrip.revenue)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-display font-semibold text-foreground">
            Trip Health & Summary
          </h3>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Revenue
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {money(completedTrips.reduce((s, t) => s + t.revenue, 0))}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cancelled Trips
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {trips.filter((t) => t.status === "Cancelled").length}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Avg. Revenue / Trip
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {money(
                  completedTrips.length > 0
                    ? Math.round(
                        completedTrips.reduce((s, t) => s + t.revenue, 0) /
                          completedTrips.length
                      )
                    : 0
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 font-display font-semibold text-foreground">
            Recent Trips
          </h3>
          {recentCompleted.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No completed trips yet.
            </p>
          ) : (
            <div className="rounded-md border">
              <ShadcnTable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCompleted.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {t.trip_code}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.source} → {t.destination}
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.vehicle_id
                          ? vById.get(t.vehicle_id)?.registration_number ?? "—"
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[t.status] ?? "secondary"}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {money(t.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ShadcnTable>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-display font-semibold text-foreground">
            Expense Summary
          </h3>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total Fuel Cost
                </p>
                <Badge variant="secondary">{fuelLogs.length} entries</Badge>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {money(totalFuelCost)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total Expenses
                </p>
                <Badge variant="secondary">{expenses.length} entries</Badge>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {money(totalExpenseAmount)}
              </p>
            </div>
            <Separator />
            <div className="rounded-lg bg-accent/10 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Net Earnings
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-accent">
                {money(
                  completedTrips.reduce((s, t) => s + t.revenue, 0) -
                    totalFuelCost -
                    totalExpenseAmount
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                revenue − fuel − expenses
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
