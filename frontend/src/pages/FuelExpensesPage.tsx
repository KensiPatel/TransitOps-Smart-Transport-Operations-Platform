import { useEffect, useMemo, useState } from "react";
import { fuelApi, expensesApi } from "@/api/fuelExpenses.api";
import { vehiclesApi } from "@/api/vehicles.api";
import { maintenanceApi } from "@/api/maintenance.api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import type {
  CreateExpenseInput,
  CreateFuelLogInput,
  Expense,
  FuelLog,
  MaintenanceLog,
  Vehicle,
} from "@/types";
import { money, num, formatDate, todayISO } from "@/lib/format";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select as ShadcnSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
}

export function FuelExpensesPage() {
  const { user } = useAuthStore();

  const [tab, setTab] = useState<Tab>("fuel");
  const [fuel, setFuel] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [fuelModal, setFuelModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [fuelForm, setFuelForm] = useState<CreateFuelLogInput>({
    vehicle_id: "",
    liters: 0,
    cost: 0,
    log_date: todayISO(),
  });
  const [expenseForm, setExpenseForm] = useState<CreateExpenseInput>({
    vehicle_id: "",
    category: "toll",
    amount: 0,
    expense_date: todayISO(),
  });
  const [saving, setSaving] = useState(false);

  const vById = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v])),
    [vehicles]
  );

  async function load() {
    setLoading(true);
    try {
      const [f, e, v, m] = await Promise.all([
        fuelApi.list(),
        expensesApi.list(),
        vehiclesApi.list(),
        maintenanceApi.list(),
      ]);
      setFuel(f);
      setExpenses(e);
      setVehicles(v);
      setMaintenance(m);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalFuel = useMemo(() => fuel.reduce((s, f) => s + f.cost, 0), [fuel]);
  const totalExpense = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );
  const totalMaint = useMemo(
    () => maintenance.reduce((s, m) => s + m.cost, 0),
    [maintenance]
  );

  async function saveFuel(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fuelApi.create({ ...fuelForm, created_by: user?.id });
      toast.success("Fuel log recorded.");
      setFuelModal(false);
      setFuelForm({ vehicle_id: "", liters: 0, cost: 0, log_date: todayISO() });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await expensesApi.create({ ...expenseForm, created_by: user?.id });
      toast.success("Expense recorded.");
      setExpenseModal(false);
      setExpenseForm({
        vehicle_id: "",
        category: "toll",
        amount: 0,
        expense_date: todayISO(),
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const fuelCols: Column<FuelLog>[] = [
    {
      header: "Vehicle",
      cell: (f) => vById.get(f.vehicle_id)?.registration_number ?? "—",
    },
    { header: "Liters", cell: (f) => num(f.liters, "L") },
    { header: "Cost", cell: (f) => money(f.cost) },
    {
      header: "₹ / L",
      cell: (f) => (f.liters > 0 ? money(f.cost / f.liters) : "—"),
    },
    { header: "Date", cell: (f) => formatDate(f.log_date) },
  ];

  const expenseCols: Column<Expense>[] = [
    {
      header: "Vehicle",
      cell: (e) => vById.get(e.vehicle_id)?.registration_number ?? "—",
    },
    {
      header: "Category",
      cell: (e) => <span className="capitalize">{e.category}</span>,
    },
    { header: "Amount", cell: (e) => money(e.amount) },
    { header: "Date", cell: (e) => formatDate(e.expense_date) },
  ];

  const openVehicle = vehicles.filter((v) => v.status !== "Retired");

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Fuel & Expenses
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fuel logs, tolls, fines and the running operational cost.
          </p>
        </div>
        <Button
          onClick={() =>
            tab === "fuel" ? setFuelModal(true) : setExpenseModal(true)
          }
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {tab === "fuel" ? "Log fuel" : "Add expense"}
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="ring-1 ring-accent/40">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total Fuel Cost
            </p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-accent">
              {money(totalFuel)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total Maintenance
            </p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {money(totalMaint)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Other Expenses
            </p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {money(totalExpense)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Operational Cost
            </p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
              {money(totalFuel + totalMaint + totalExpense)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              fuel + maintenance + expenses
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="fuel">Fuel logs</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "fuel" ? (
        loading ? (
          <div className="rounded-xl border border-border py-10 text-center text-muted-foreground">
            Loading…
          </div>
        ) : fuel.length === 0 ? (
          <div className="rounded-xl border border-border py-10 text-center text-muted-foreground">
            No fuel logs yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <ShadcnTable>
              <TableHeader>
                <TableRow>
                  {fuelCols.map((c, i) => (
                    <TableHead key={i}>{c.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuel.map((row) => (
                  <TableRow key={row.id}>
                    {fuelCols.map((c, i) => (
                      <TableCell key={i}>{c.cell(row)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </ShadcnTable>
          </div>
        )
      ) : loading ? (
        <div className="rounded-xl border border-border py-10 text-center text-muted-foreground">
          Loading…
        </div>
      ) : expenses.length === 0 ? (
        <div className="rounded-xl border border-border py-10 text-center text-muted-foreground">
          No expenses yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <ShadcnTable>
            <TableHeader>
              <TableRow>
                {expenseCols.map((c, i) => (
                  <TableHead key={i}>{c.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((row) => (
                <TableRow key={row.id}>
                  {expenseCols.map((c, i) => (
                    <TableCell key={i}>{c.cell(row)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </ShadcnTable>
        </div>
      )}

      {/* Fuel modal */}
      <Dialog open={fuelModal} onOpenChange={setFuelModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Log fuel</DialogTitle>
          </DialogHeader>
          <form id="fuel-form" onSubmit={saveFuel} className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <ShadcnSelect
                value={fuelForm.vehicle_id}
                onValueChange={(v) =>
                  setFuelForm({ ...fuelForm, vehicle_id: v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select vehicle…" />
                </SelectTrigger>
                <SelectContent>
                  {openVehicle.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number} · {v.name_model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </ShadcnSelect>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Liters</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={fuelForm.liters || ""}
                  onChange={(e) =>
                    setFuelForm({
                      ...fuelForm,
                      liters: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Cost (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={fuelForm.cost || ""}
                  onChange={(e) =>
                    setFuelForm({ ...fuelForm, cost: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={fuelForm.log_date}
                  onChange={(e) =>
                    setFuelForm({ ...fuelForm, log_date: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setFuelModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="fuel-form" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense modal */}
      <Dialog open={expenseModal} onOpenChange={setExpenseModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
          </DialogHeader>
          <form id="expense-form" onSubmit={saveExpense} className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <ShadcnSelect
                value={expenseForm.vehicle_id}
                onValueChange={(v) =>
                  setExpenseForm({ ...expenseForm, vehicle_id: v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select vehicle…" />
                </SelectTrigger>
                <SelectContent>
                  {openVehicle.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number} · {v.name_model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </ShadcnSelect>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <ShadcnSelect
                  value={expenseForm.category}
                  onValueChange={(v) =>
                    setExpenseForm({ ...expenseForm, category: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["toll", "fine", "parking", "misc"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </ShadcnSelect>
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={expenseForm.amount || ""}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      amount: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      expense_date: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setExpenseModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="expense-form" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
