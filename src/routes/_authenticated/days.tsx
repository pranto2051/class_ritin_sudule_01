import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/days")({
  component: DaysPage,
});

type Day = Tables<"days">;

const PRESET_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function DaysPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Day | null>(null);
  const [form, setForm] = useState({ name: "", short_name: "", color: PRESET_COLORS[0], is_active: true });

  const { data: days = [], isLoading } = useQuery({
    queryKey: ["days"],
    queryFn: async () => {
      const { data, error } = await supabase.from("days").select("*").order("position");
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase
          .from("days")
          .update({ name: form.name, short_name: form.short_name || null, color: form.color, is_active: form.is_active })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("days").insert({
          name: form.name,
          short_name: form.short_name || null,
          color: form.color,
          is_active: form.is_active,
          position: days.length,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["days"] });
      toast.success(editing ? "Day updated" : "Day added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("days").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["days"] });
      toast.success("Day removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", short_name: "", color: PRESET_COLORS[0], is_active: true });
    setOpen(true);
  };
  const openEdit = (d: Day) => {
    setEditing(d);
    setForm({ name: d.name, short_name: d.short_name ?? "", color: d.color, is_active: d.is_active });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Days"
        description="Manage the working days of your weekly routine."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> Add day
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit day" : "Add day"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Monday" />
                </div>
                <div className="space-y-2">
                  <Label>Short name</Label>
                  <Input value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} placeholder="Mon" />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className="h-8 w-8 rounded-full ring-offset-2 transition-transform hover:scale-110"
                        style={{ background: c, outline: form.color === c ? "2px solid var(--ring)" : "none", outlineOffset: 2 }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label>Active</Label>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => upsert.mutate()} disabled={!form.name || upsert.isPending}>
                  {editing ? "Save" : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : days.length === 0 ? (
        <EmptyState onAdd={openNew} />
      ) : (
        <div className="space-y-2">
          {days.map((d, i) => (
            <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="flex items-center gap-3 p-4 shadow-[var(--shadow-card)]">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="h-4 w-4 rounded-full" style={{ background: d.color }} />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{d.name}</p>
                  {d.short_name && <p className="text-xs text-muted-foreground">{d.short_name}</p>}
                </div>
                {d.is_active ? (
                  <Badge variant="secondary" className="bg-success/15 text-success">Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
                <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove.mutate(d.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center shadow-[var(--shadow-card)]">
      <p className="font-medium text-foreground">No days yet</p>
      <p className="text-sm text-muted-foreground">Add your first working day to start building the routine.</p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" /> Add day
      </Button>
    </Card>
  );
}
