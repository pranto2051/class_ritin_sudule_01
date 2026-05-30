import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  BookOpen,
  Users,
  DoorOpen,
  Grid3x3,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function useCount(table: "days" | "time_slots" | "subjects" | "teachers" | "rooms" | "schedule_entries") {
  return useQuery({
    queryKey: ["count", table],
    queryFn: async () => {
      const { count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });
}

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const dur = 700;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

const KPI = [
  { key: "days", label: "Active Days", icon: CalendarDays, table: "days" },
  { key: "time_slots", label: "Time Slots", icon: Clock, table: "time_slots" },
  { key: "subjects", label: "Subjects", icon: BookOpen, table: "subjects" },
  { key: "teachers", label: "Teachers", icon: Users, table: "teachers" },
  { key: "rooms", label: "Rooms", icon: DoorOpen, table: "rooms" },
  { key: "schedule_entries", label: "Scheduled Classes", icon: Grid3x3, table: "schedule_entries" },
] as const;

function DashboardPage() {
  const { user } = useAuth();
  const counts = {
    days: useCount("days"),
    time_slots: useCount("time_slots"),
    subjects: useCount("subjects"),
    teachers: useCount("teachers"),
    rooms: useCount("rooms"),
    schedule_entries: useCount("schedule_entries"),
  };

  const { data: byDay } = useQuery({
    queryKey: ["dashboard", "by-day"],
    queryFn: async () => {
      const { data: days } = await supabase
        .from("days")
        .select("id, short_name, name")
        .eq("is_active", true)
        .order("position");
      const { data: entries } = await supabase
        .from("schedule_entries")
        .select("day_id");
      return (days ?? []).map((d) => ({
        name: d.short_name || d.name.slice(0, 3),
        classes: (entries ?? []).filter((e) => e.day_id === d.id).length,
      }));
    },
  });

  const { data: byCategory } = useQuery({
    queryKey: ["dashboard", "by-category"],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("category");
      const map = new Map<string, number>();
      (data ?? []).forEach((s) => {
        const c = s.category || "General";
        map.set(c, (map.get(c) ?? 0) + 1);
      });
      return Array.from(map, ([name, value]) => ({ name, value }));
    },
  });

  const pieColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome${user?.email ? ", " + user.email.split("@")[0] : ""}`}
        description="Here's an overview of your academic routine workspace."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {KPI.map((kpi, i) => {
          const Icon = kpi.icon;
          const value = counts[kpi.key].data ?? 0;
          return (
            <motion.div
              key={kpi.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="flex items-center gap-4 p-5 shadow-[var(--shadow-card)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-foreground">
                    <CountUp value={value} />
                  </p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="p-6 shadow-[var(--shadow-card)] lg:col-span-3">
          <h3 className="font-display text-base font-semibold">Classes per day</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Scheduled classes across active days
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDay ?? []}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="classes" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 shadow-[var(--shadow-card)] lg:col-span-2">
          <h3 className="font-display text-base font-semibold">Subjects by category</h3>
          <p className="mb-4 text-xs text-muted-foreground">Distribution of subjects</p>
          <div className="h-64">
            {byCategory && byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No subjects yet
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
