import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/schedule")({
  component: SchedulePage,
});

type Entry = Tables<"schedule_entries">;

function fmt(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

function SchedulePage() {
  const qc = useQueryClient();
  const [cell, setCell] = useState<{ dayId: string; slotId: string } | null>(null);
  const [form, setForm] = useState({ subject_id: "", teacher_id: "", room_id: "", section: "A" });

  const { data: days = [] } = useQuery({
    queryKey: ["days"],
    queryFn: async () => (await supabase.from("days").select("*").eq("is_active", true).order("position")).data ?? [],
  });
  const { data: slots = [] } = useQuery({
    queryKey: ["time_slots"],
    queryFn: async () => (await supabase.from("time_slots").select("*").order("start_time")).data ?? [],
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("name")).data ?? [],
  });
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => (await supabase.from("teachers").select("*").order("name")).data ?? [],
  });
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => (await supabase.from("rooms").select("*").order("room_number")).data ?? [],
  });
  const { data: entries = [] } = useQuery({
    queryKey: ["schedule_entries"],
    queryFn: async () => (await supabase.from("schedule_entries").select("*")).data ?? [],
  });

  const entryMap = useMemo(() => {
    const m = new Map<string, Entry>();
    entries.forEach((e) => m.set(`${e.day_id}:${e.time_slot_id}`, e));
    return m;
  }, [entries]);

  const conflict = useMemo(() => {
    if (!cell) return null;
    const existingId = entryMap.get(`${cell.dayId}:${cell.slotId}`)?.id;
    const sameSlot = entries.filter(
      (e) => e.time_slot_id === cell.slotId && e.day_id === cell.dayId && e.id !== existingId,
    );
    if (form.teacher_id && sameSlot.some((e) => e.teacher_id === form.teacher_id)) {
      return "This teacher is already assigned in this time slot.";
    }
    if (form.room_id && sameSlot.some((e) => e.room_id === form.room_id)) {
      return "This room is already booked in this time slot.";
    }
    return null;
  }, [cell, form, entries, entryMap]);

  const save = useMutation({
    mutationFn: async () => {
      if (!cell) return;
      const existing = entryMap.get(`${cell.dayId}:${cell.slotId}`);
      const payload = {
        day_id: cell.dayId,
        time_slot_id: cell.slotId,
        subject_id: form.subject_id || null,
        teacher_id: form.teacher_id || null,
        room_id: form.room_id || null,
        section: form.section || "A",
      };
      if (existing) {
        const { error } = await supabase.from("schedule_entries").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("schedule_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule_entries"] });
      toast.success("Class saved");
      setCell(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule_entries"] });
      toast.success("Class removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCell = (dayId: string, slotId: string) => {
    const existing = entryMap.get(`${dayId}:${slotId}`);
    setForm({
      subject_id: existing?.subject_id ?? "",
      teacher_id: existing?.teacher_id ?? "",
      room_id: existing?.room_id ?? "",
      section: existing?.section ?? "A",
    });
    setCell({ dayId, slotId });
  };

  const subjectById = (id: string | null) => subjects.find((s) => s.id === id);
  const teacherById = (id: string | null) => teachers.find((t) => t.id === id);
  const roomById = (id: string | null) => rooms.find((r) => r.id === id);

  if (days.length === 0 || slots.length === 0) {
    return (
      <div>
        <PageHeader title="Schedule" description="Build your weekly class routine." />
        <Card className="flex flex-col items-center gap-2 p-12 text-center shadow-[var(--shadow-card)]">
          <p className="font-medium">Set up days and time slots first</p>
          <p className="text-sm text-muted-foreground">
            Add at least one active day and one time slot to start scheduling.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Schedule" description="Click any cell to assign a class. Conflicts are detected automatically." />

      <Card className="overflow-x-auto p-0 shadow-[var(--shadow-card)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-32 border-b border-r border-border bg-card p-3 text-left text-xs font-semibold text-muted-foreground">
                Time / Day
              </th>
              {days.map((d) => (
                <th key={d.id} className="min-w-[150px] border-b border-border p-3 text-left text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id}>
                <td className="sticky left-0 z-10 border-b border-r border-border bg-card p-3 align-top text-xs">
                  <p className="font-medium text-foreground">{slot.label || (slot.is_break ? "Break" : "Period")}</p>
                  <p className="text-muted-foreground">{fmt(slot.start_time)}–{fmt(slot.end_time)}</p>
                </td>
                {days.map((d) => {
                  const entry = entryMap.get(`${d.id}:${slot.id}`);
                  const subj = subjectById(entry?.subject_id ?? null);
                  if (slot.is_break) {
                    return (
                      <td key={d.id} className="border-b border-l border-border bg-muted/40 p-2 text-center text-xs text-muted-foreground">
                        Break
                      </td>
                    );
                  }
                  return (
                    <td key={d.id} className="border-b border-l border-border p-1.5 align-top">
                      {entry && subj ? (
                        <button
                          onClick={() => openCell(d.id, slot.id)}
                          className="group relative block w-full rounded-lg p-2.5 text-left transition-shadow hover:shadow-md"
                          style={{ background: `color-mix(in oklab, ${subj.color} 14%, transparent)`, borderLeft: `3px solid ${subj.color}` }}
                        >
                          <p className="text-xs font-semibold text-foreground">{subj.code}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{teacherById(entry.teacher_id ?? null)?.name ?? "—"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {roomById(entry.room_id ?? null)?.room_number ?? ""} · Sec {entry.section}
                          </p>
                          <span
                            onClick={(ev) => { ev.stopPropagation(); remove.mutate(entry.id); }}
                            className="absolute right-1 top-1 hidden rounded p-0.5 text-muted-foreground hover:bg-background group-hover:block"
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openCell(d.id, slot.id)}
                          className="flex h-full min-h-[60px] w-full items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground/50 transition-colors hover:border-primary hover:text-primary"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!cell} onOpenChange={(o) => !o && setCell(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={form.room_id} onValueChange={(v) => setForm({ ...form, room_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" />
            </div>
            {conflict && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{conflict}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCell(null)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.subject_id || !!conflict || save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
