import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CalendarClock, Loader2, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

const schema = z.object({
  name: z.string().min(2, "Enter your university name"),
  academic_year: z.string().min(2, "Enter the academic year"),
  current_semester: z.string().min(1, "Enter the current semester"),
  contact_email: z.string().email("Enter a valid email").optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

function OnboardingPage() {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", academic_year: "", current_semester: "", contact_email: "" },
  });

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) navigate({ to: "/login", replace: true });
  }, [loading, isAuthenticated, navigate]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    const { data: existing } = await supabase
      .from("university_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    const payload = {
      name: values.name,
      academic_year: values.academic_year,
      current_semester: values.current_semester,
      contact_email: values.contact_email || null,
      onboarded: true,
    };

    const { error } = existing
      ? await supabase.from("university_settings").update(payload).eq("id", existing.id)
      : await supabase.from("university_settings").insert(payload);

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["university_settings"] });
    toast.success("Workspace ready!");
    navigate({ to: "/dashboard", replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-xl font-semibold">Setup in progress</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your administrator is still setting up the workspace. Please check back soon.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => navigate({ to: "/dashboard" })}>
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <CalendarClock className="h-6 w-6" />
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> First-time setup
            </p>
            <h1 className="font-display text-xl font-bold">Set up your workspace</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">University / Department name</Label>
            <Input id="name" placeholder="State University — CSE Dept" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="academic_year">Academic year</Label>
              <Input id="academic_year" placeholder="2025 - 2026" {...register("academic_year")} />
              {errors.academic_year && (
                <p className="text-xs text-destructive">{errors.academic_year.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_semester">Current semester</Label>
              <Input id="current_semester" placeholder="Spring 2026" {...register("current_semester")} />
              {errors.current_semester && (
                <p className="text-xs text-destructive">{errors.current_semester.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact email (optional)</Label>
            <Input id="contact_email" type="email" placeholder="dept@university.edu" {...register("contact_email")} />
            {errors.contact_email && (
              <p className="text-xs text-destructive">{errors.contact_email.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Finish setup
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
