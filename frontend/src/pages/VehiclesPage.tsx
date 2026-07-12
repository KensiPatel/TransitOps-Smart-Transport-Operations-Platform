import { useEffect, useMemo, useState } from "react";
import { vehiclesApi } from "@/api/vehicles.api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import type {
  CreateVehicleInput,
  Vehicle,
  VehicleStatus,
} from "@/types";
import { money, num } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select as ShadcnSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";

const STATUSES: VehicleStatus[] = ["Available", "On Trip", "In Shop", "Retired"];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Available: "default",
  "On Trip": "secondary",
  "In Shop": "outline",
  Retired: "outline",
};

const BLANK: CreateVehicleInput = {
  registration_number: "",
  name_model: "",
  type: "Truck",
  max_load_capacity: 0,
  odometer: 0,
  acquisition_cost: 0,
  region: "",
};

export function VehiclesPage() {
  const { user } = useAuthStore();
  const canManage = user?.role === "fleet_manager";

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<CreateVehicleInput>(BLANK);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setVehicles(await vehiclesApi.list());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (statusFilter && v.status !== statusFilter) return false;
      if (!q) return true;
      return (
        v.registration_number.toLowerCase().includes(q) ||
        v.name_model.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        (v.region ?? "").toLowerCase().includes(q)
      );
    });
  }, [vehicles, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(BLANK);
    setModalOpen(true);
  }
  function openEdit(v: Vehicle) {
    setEditing(v);
    setForm({
      registration_number: v.registration_number,
      name_model: v.name_model,
      type: v.type,
      max_load_capacity: v.max_load_capacity,
      odometer: v.odometer,
      acquisition_cost: v.acquisition_cost,
      region: v.region ?? "",
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await vehiclesApi.update(editing.id, {
          name_model: form.name_model,
          type: form.type,
          max_load_capacity: form.max_load_capacity,
          odometer: form.odometer,
          acquisition_cost: form.acquisition_cost,
          region: form.region || undefined,
        });
        toast.success("Vehicle updated.");
      } else {
        await vehiclesApi.create({ ...form, region: form.region || undefined });
        toast.success("Vehicle registered.");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(v: Vehicle, status: VehicleStatus) {
    try {
      await vehiclesApi.setStatus(v.id, status);
      toast.success(`${v.registration_number} → ${status}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status change failed");
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Vehicle Registry
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Master list of every asset in the fleet.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add vehicle
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search registration, model, region…"
            className="pl-9 w-full sm:w-64"
          />
        </div>
        <div className="w-40">
          <ShadcnSelect
            value={statusFilter || "all"}
            onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </ShadcnSelect>
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} vehicle{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No vehicles match your filters.
        </div>
      ) : (
        <ShadcnTable>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Odometer</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Acq. Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <p className="font-semibold text-foreground">{v.name_model}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {v.registration_number}
                  </p>
                </TableCell>
                <TableCell>{v.type}</TableCell>
                <TableCell>{num(v.max_load_capacity, "kg")}</TableCell>
                <TableCell>{num(v.odometer, "km")}</TableCell>
                <TableCell>{v.region ?? "—"}</TableCell>
                <TableCell>{money(v.acquisition_cost)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[v.status] ?? "outline"}>
                    {v.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canManage ? (
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(v)}
                      >
                        Edit
                      </Button>
                      {v.status !== "Retired" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => changeStatus(v, "Retired")}
                        >
                          Retire
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => changeStatus(v, "Available")}
                        >
                          Reinstate
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ShadcnTable>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit vehicle" : "Register vehicle"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? editing.registration_number
                : "Registration number must be unique."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="vehicle-form"
            onSubmit={save}
            className="grid grid-cols-2 gap-4"
          >
            <div className="col-span-2">
              <div className="space-y-2">
                <Label>Registration number</Label>
                <Input
                  value={form.registration_number}
                  disabled={!!editing}
                  onChange={(e) =>
                    setForm({ ...form, registration_number: e.target.value })
                  }
                  placeholder="GJ01AB0000"
                  required
                  className="disabled:opacity-60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name / model</Label>
              <Input
                value={form.name_model}
                onChange={(e) =>
                  setForm({ ...form, name_model: e.target.value })
                }
                placeholder="TRUCK-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <ShadcnSelect
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Truck", "Van", "Mini", "Bike", "Other"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </ShadcnSelect>
            </div>
            <div className="space-y-2">
              <Label>Max load capacity (kg)</Label>
              <Input
                type="number"
                min={0}
                value={form.max_load_capacity || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    max_load_capacity: Number(e.target.value),
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Odometer (km)</Label>
              <Input
                type="number"
                min={0}
                value={form.odometer || ""}
                onChange={(e) =>
                  setForm({ ...form, odometer: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Acquisition cost (₹)</Label>
              <Input
                type="number"
                min={0}
                value={form.acquisition_cost || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    acquisition_cost: Number(e.target.value),
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Input
                value={form.region}
                onChange={(e) =>
                  setForm({ ...form, region: e.target.value })
                }
                placeholder="Ahmedabad"
              />
            </div>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" form="vehicle-form" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
