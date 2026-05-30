import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Coffee, Clock } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/time-slots")({
  component: TimeSlotsPage,
});

type Slot = Tables<"time_slots">;

function fmt(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? "PM" : "AM";
  const h12 = hr % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function TimeSlotsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [form, setForm] = useState({ label: "", start_time: "09:00", end_time: "10:00", is_break: false });

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["time_slots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("time_slots").select("*").order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        label: form.label || null,
        start_time: form.start_time,
        end_time: form.end_time,
        is_break: form.is_break,
      };
      if (editing) {
        const { error } = await supabase.from("time_slots").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("time_slots").insert({ ...payload, position: slots.length });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time_slots"] });
      toast.success(editing ? "Slot updated" : "Slot added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time_slots"] });
      toast.success("Slot removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ label: "", start_time: "09:00", end_time: "10:00", is_break: false });
    setOpen(true);
  };
  const openEdit = (s: Slot) => {
    setEditing(s);
    setForm({ label: s.label ?? "", start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5), is_break: s.is_break });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Time Slots"
        description="Define the daily periods and breaks for your routine."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add slot</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit slot" : "Add slot"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Label (optional)</Label>
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Period 1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start</Label>
                    <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>End</Label>
                    <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label>Mark as break</Label>
                  <Switch checked={form.is_break} onCheckedChange={(v) => setForm({ ...form, is_break: v })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>{editing ? "Save" : "Add"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : slots.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center shadow-[var(--shadow-card)]">
          <p className="font-medium">No time slots yet</p>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add slot</Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {slots.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="flex items-center gap-3 p-4 shadow-[var(--shadow-card)]">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.is_break ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"}`}>
                  {s.is_break ? <Coffee className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{s.label || (s.is_break ? "Break" : "Period")}</p>
                  <p className="text-xs text-muted-foreground">{fmt(s.start_time)} – {fmt(s.end_time)}</p>
                </div>
                {s.is_break && <Badge variant="outline" className="text-warning">Break</Badge>}
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
