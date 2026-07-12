import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { vehiclesApi } from "@/api/vehicles.api";
import { tripsApi } from "@/api/trips.api";
import { maintenanceApi } from "@/api/maintenance.api";
import { fuelApi, expensesApi } from "@/api/fuelExpenses.api";
import type { Vehicle, Trip, MaintenanceLog, FuelLog, Expense } from "@/types";
import { money, num, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { DonutChart, TrendArea } from "@/components/ui/Charts";
import { toast } from "sonner";
import {
  IndianRupee,
  Fuel,
  Wrench,
  Receipt,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

interface VehicleFinancials {
  vehicle: Vehicle;
  tripsCompleted: number;
  revenue: number;
  fuelCost: number;
  maintenanceCost: number;
  expenseCost: number;
  profit: number;
}

interface ActivityItem {
  id: string;
  type: "fuel" | "expense" | "maintenance";
  label: string;
  amount: number;
  date: string;
  category: string;
}

export function FinancialAnalystDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [v, t, f, e, m] = await Promise.all([
          vehiclesApi.list(),
          tripsApi.list(),
          fuelApi.list(),
          expensesApi.list(),
          maintenanceApi.list(),
        ]);
        setVehicles(v);
        setTrips(t);
        setFuelLogs(f);
        setExpenses(e);
        setMaintenanceLogs(m);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load financial data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const completedTrips = useMemo(
    () => trips.filter((t) => t.status === "Completed"),
    [trips]
  );

  const totalRevenue = useMemo(
    () => completedTrips.reduce((s, t) => s + (t.revenue ?? 0), 0),
    [completedTrips]
  );

  const totalFuelCost = useMemo(
    () => fuelLogs.reduce((s, f) => s + (f.cost ?? 0), 0),
    [fuelLogs]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + (e.amount ?? 0), 0),
    [expenses]
  );

  const totalMaintenanceCost = useMemo(
    () => maintenanceLogs.reduce((s, m) => s + (m.cost ?? 0), 0),
    [maintenanceLogs]
  );

  const netProfit = totalRevenue - totalFuelCost - totalExpenses - totalMaintenanceCost;

  const vehicleFinancials: VehicleFinancials[] = useMemo(() => {
    const map = new Map<string, VehicleFinancials>();
    for (const v of vehicles) {
      map.set(v.id, {
        vehicle: v,
        tripsCompleted: 0,
        revenue: 0,
        fuelCost: 0,
        maintenanceCost: 0,
        expenseCost: 0,
        profit: 0,
      });
    }
    for (const t of completedTrips) {
      if (!t.vehicle_id) continue;
      const vf = map.get(t.vehicle_id);
      if (vf) {
        vf.tripsCompleted += 1;
        vf.revenue += t.revenue ?? 0;
      }
    }
    for (const f of fuelLogs) {
      const vf = map.get(f.vehicle_id);
      if (vf) vf.fuelCost += f.cost ?? 0;
    }
    for (const e of expenses) {
      const vf = map.get(e.vehicle_id);
      if (vf) vf.expenseCost += e.amount ?? 0;
    }
    for (const m of maintenanceLogs) {
      const vf = map.get(m.vehicle_id);
      if (vf) vf.maintenanceCost += m.cost ?? 0;
    }
    for (const vf of map.values()) {
      vf.profit = vf.revenue - vf.fuelCost - vf.maintenanceCost - vf.expenseCost;
    }
    return Array.from(map.values())
      .filter((v) => v.revenue > 0 || v.tripsCompleted > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [vehicles, completedTrips, fuelLogs, expenses, maintenanceLogs]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const recentActivity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = fuelLogs.map((f) => ({
      id: f.id,
      type: "fuel" as const,
      label: `Fuel — ${num(f.liters, "L")}`,
      amount: f.cost,
      date: f.log_date,
      category: "Fuel",
    }));
    for (const e of expenses) {
      items.push({
        id: e.id,
        type: "expense" as const,
        label: e.category,
        amount: e.amount,
        date: e.expense_date,
        category: e.category,
      });
    }
    for (const m of maintenanceLogs) {
      items.push({
        id: m.id,
        type: "maintenance" as const,
        label: m.type,
        amount: m.cost,
        date: m.started_at,
        category: "Maintenance",
      });
    }
    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [fuelLogs, expenses, maintenanceLogs]);

  const revenueExpenseBreakdown = [
    { name: "Revenue", value: totalRevenue },
    { name: "Fuel", value: totalFuelCost },
    { name: "Maintenance", value: totalMaintenanceCost },
    { name: "Expenses", value: totalExpenses },
  ];

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { revenue: number; expenses: number }>();
    for (const t of completedTrips) {
      const key = t.completed_at?.slice(0, 7) ?? t.created_at.slice(0, 7);
      const entry = map.get(key) ?? { revenue: 0, expenses: 0 };
      entry.revenue += t.revenue ?? 0;
      map.set(key, entry);
    }
    for (const f of fuelLogs) {
      const key = f.log_date.slice(0, 7);
      const entry = map.get(key) ?? { revenue: 0, expenses: 0 };
      entry.expenses += f.cost ?? 0;
      map.set(key, entry);
    }
    for (const e of expenses) {
      const key = e.expense_date.slice(0, 7);
      const entry = map.get(key) ?? { revenue: 0, expenses: 0 };
      entry.expenses += e.amount ?? 0;
      map.set(key, entry);
    }
    for (const m of maintenanceLogs) {
      const key = m.started_at.slice(0, 7);
      const entry = map.get(key) ?? { revenue: 0, expenses: 0 };
      entry.expenses += m.cost ?? 0;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([month, v]) => ({
        month,
        revenue: v.revenue,
        expenses: v.expenses,
      }));
  }, [completedTrips, fuelLogs, expenses, maintenanceLogs]);

  if (loading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  const profitColor =
    netProfit >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Financial Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue, costs and profitability across your fleet.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="ring-1 ring-accent/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-accent" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Revenue
              </p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-accent">
              {money(totalRevenue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {num(completedTrips.length)} completed trips
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Fuel Cost
              </p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {money(totalFuelCost)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {num(fuelLogs.length)} fuel logs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Expenses
              </p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {money(totalExpenses)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {num(expenses.length)} expense entries
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {netProfit >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              )}
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Net Profit
              </p>
            </div>
            <p className={`mt-2 font-display text-3xl font-bold tabular-nums ${profitColor}`}>
              {money(netProfit)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalRevenue > 0
                ? `${pct(Math.round((netProfit / totalRevenue) * 100))} margin`
                : "No revenue yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-1 font-display font-semibold text-foreground">
            Revenue vs Costs
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Financial breakdown
          </p>
          <DonutChart
            data={revenueExpenseBreakdown}
            centerLabel="net"
            centerValue={money(netProfit)}
          />
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-display font-semibold text-foreground">
              Monthly Trend
            </h3>
            <span className="text-xs text-muted-foreground">revenue vs expenses</span>
          </div>
          {monthlyTrend.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No data available
            </div>
          ) : (
            <div className="space-y-4">
              <TrendArea data={monthlyTrend} dataKey="revenue" xKey="month" />
              <TrendArea data={monthlyTrend} dataKey="expenses" xKey="month" />
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-3 font-display font-semibold text-foreground">
            Costs Summary
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Fuel Costs</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {money(totalFuelCost)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Maintenance</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {money(totalMaintenanceCost)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Other Expenses</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {money(totalExpenses)}
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Total Costs</span>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {money(totalFuelCost + totalMaintenanceCost + totalExpenses)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 font-display font-semibold text-foreground">
            Top Vehicles by Revenue
          </h3>
          {vehicleFinancials.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No completed trip data yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="text-xs font-medium text-muted-foreground">
                    Vehicle
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium text-muted-foreground">
                    Trips
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium text-muted-foreground">
                    Revenue
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium text-muted-foreground">
                    Fuel Cost
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium text-muted-foreground">
                    Profit
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleFinancials.map((vf) => (
                  <TableRow key={vf.vehicle.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {vf.vehicle.registration_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {vf.vehicle.name_model}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(vf.tripsCompleted)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {money(vf.revenue)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {money(vf.fuelCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`tabular-nums font-medium ${
                          vf.profit >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {money(vf.profit)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-3 font-display font-semibold text-foreground">
            Expenses by Category
          </h3>
          {expenseByCategory.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No expenses recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {expenseByCategory.map(({ category, amount }) => (
                <div
                  key={category}
                  className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5"
                >
                  <span className="text-sm text-foreground">{category}</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {money(amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <h3 className="font-display font-semibold text-foreground">
              Recent Financial Activity
            </h3>
          </div>
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No financial activity yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((item) => (
                <li
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(item.date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant={
                        item.type === "fuel"
                          ? "secondary"
                          : item.type === "maintenance"
                            ? "outline"
                            : "default"
                      }
                    >
                      {item.category}
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {money(item.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
