import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [dark, setDark] = useState(false);
  const [form, setForm] = useState({ name: "", academic_year: "", current_semester: "", contact_email: "" });

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["university_settings"],
    queryFn: async () => (await supabase.from("university_settings").select("*").limit(1).maybeSingle()).data,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name ?? "",
        academic_year: settings.academic_year ?? "",
        current_semester: settings.current_semester ?? "",
        contact_email: settings.contact_email ?? "",
      });
    }
  }, [settings]);

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isLoading, isAdmin, navigate]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("university_settings")
      .update({
        name: form.name,
        academic_year: form.academic_year,
        current_semester: form.current_semester,
        contact_email: form.contact_email || null,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["university_settings"] });
    toast.success("Settings saved");
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Manage your workspace preferences." />

      <Card className="mb-4 flex items-center justify-between p-5 shadow-[var(--shadow-card)]">
        <div>
          <p className="font-medium text-foreground">Appearance</p>
          <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
        </div>
        <Button variant="outline" onClick={toggleTheme}>
          {dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {dark ? "Light" : "Dark"}
        </Button>
      </Card>

      <Card className="p-6 shadow-[var(--shadow-card)]">
        <h3 className="font-display text-base font-semibold">University details</h3>
        {isLoading ? (
          <div className="py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Academic year</Label>
                <Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Current semester</Label>
                <Input value={form.current_semester} onChange={(e) => setForm({ ...form, current_semester: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contact email</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
