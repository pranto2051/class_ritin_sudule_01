# Smart Academic Routine Manager — Phase 1 (Foundation MVP)

A production-grade SaaS foundation built on the platform stack (TanStack Start / React 19 / Tailwind v4 / Shadcn / Lovable Cloud). Later phases will add exam module, 6 layouts, widgets board, notifications, exports, AI optimizer, and multi-department/semester. This plan delivers the spine everything else hangs off of.

## What Phase 1 delivers

1. **Backend (Lovable Cloud / Supabase)** — full schema, RLS, and roles.
2. **Auth + RBAC** — email/password + magic link, role-based route guards, first-signup-becomes-Super-Admin onboarding.
3. **Dashboard** — animated KPI cards, charts, today's schedule widget, quick actions.
4. **Routine Builder core** — Day Manager, Time Slot Manager, Subject/Teacher/Room managers, and the Schedule grid with drag-and-drop assignment + conflict detection.
5. **Design system** — premium tokens, dark/light, Framer Motion transitions.

## Roles
`super_admin`, `admin`, `teacher`, `student` — stored in a dedicated `user_roles` table (never on profiles) with a `has_role()` security-definer function. First user to sign up is auto-promoted to `super_admin` and sent through onboarding.

## Database schema (Lovable Cloud)
- `profiles` — id (→auth.users), full_name, email, avatar_url
- `user_roles` — user_id, role (enum: super_admin/admin/teacher/student)
- `app_role` enum
- `university_settings` — name, logo_url, academic_year, current_semester, address, contact_email (single active row for Phase 1)
- `days` — name, short_name, color, position, is_active
- `time_slots` — label, start_time, end_time, position, is_break
- `subjects` — code, name, credits, category, color, description
- `teachers` — name, designation, email, max_weekly_hours, department
- `teacher_subjects` — teacher_id, subject_id (assignment join)
- `rooms` — room_number, building, capacity, type (lab/classroom/seminar), facilities[]
- `schedule_entries` — day_id, time_slot_id, subject_id, teacher_id, room_id, section, span (slots covered)
- `audit_logs` — user_id, action, entity, entity_id, before (jsonb), after (jsonb), created_at

Every `public` table gets explicit GRANTs + RLS policies scoped via `has_role()` (admins/super_admins write, all authenticated read what they're allowed). Audit log writes happen server-side.

## Auth & onboarding flow
- `/login` and `/signup` (email/password + magic link) — public routes.
- `_authenticated` layout guard redirects unauthenticated users to `/login`.
- On signup, a trigger creates the profile; a server function checks if any super_admin exists — if not, the new user becomes super_admin.
- Super Admin onboarding wizard: university name → academic year → first department/semester defaults. Stored in `university_settings`.
- Profile page: avatar upload to Supabase Storage bucket `avatars` (public), name/email edit.

## Routes
```
/login, /signup                 public auth
/onboarding                     first-run Super Admin wizard
/_authenticated/                 (guarded)
  dashboard                      KPIs, charts, today widget, quick actions
  builder/days                   Day Manager (dnd reorder, color, active toggle)
  builder/slots                  Time Slot Manager (dnd, break flag, 12/24h)
  builder/subjects               Subject Manager
  builder/teachers               Teacher Manager + subject assignment
  builder/rooms                  Room Manager
  schedule                       Schedule grid builder + conflict detection
  profile                        avatar/name/email
  settings                       General tab (university info)
```

## Dashboard (Phase 1)
- **KPI cards** (count-up via Framer Motion): Total Subjects, Total Credits, Class Days, Sessions/Week, Active Teachers, Room Utilization %.
- **Charts (Recharts)**: bar chart classes-per-day, donut subject-category distribution, line chart credit-load-per-teacher.
- **Today's Schedule widget**: live timeline of the current day, highlight active class, next-class countdown.
- **Quick Actions**: Add Subject / Schedule / Day / Time Slot.

## Routine builder details
- **Day Manager**: CRUD, dnd-kit reorder, color picker, active/inactive toggle.
- **Time Slot Manager**: CRUD, dnd-kit reorder, mark break/lunch, 12/24h display toggle.
- **Subject Manager**: code, name, credits, category, color, description. React Hook Form + Zod.
- **Teacher Manager**: name, designation, department, email, max weekly hours, assigned subjects (multi-select).
- **Room Manager**: room number, building, capacity, type, facilities.
- **Schedule grid**: rows = time slots, columns = active days. Click a cell or drag a class block to assign Day+Slot+Subject+Teacher+Room+Section. **Conflict Detection Engine** flags when the same teacher, room, or section is double-booked at a slot, with a clear error card + resolution hint. (Resize/copy-paste/duplicate-day and AI optimizer deferred to a later phase.)

## State & data
- React Query v5 for all server state (queryOptions + server functions calling Supabase).
- Zustand for UI/global state (active view, format toggles, appearance preview).
- All mutations invalidate relevant query keys and write an audit log entry.

## Design system
- Premium token set in `src/styles.css` (oklch): refined neutral base, single confident accent, elegant shadows, consistent radius/spacing scale. Light + dark.
- Distinctive type pairing (display + body) — not default Inter-on-white.
- Framer Motion: page transitions, card entrance, KPI count-up, list reordering.
- All Shadcn components themed via tokens; no hardcoded colors.

## Out of scope for Phase 1 (planned next phases)
Exam module · 6 timetable layouts + switcher · live appearance panel (theme/accent/radius/density/font/animation) · drag-drop widget board · monthly/agenda/timeline calendar views · notification system + realtime + web push · PDF/PNG/Excel export + print + share link · AI Schedule Optimizer · multi-department/multi-semester + cloning + academic calendar · backup/restore · full audit-log viewer UI.

## Technical notes
- Lovable Cloud will be enabled first (creates Supabase project, auth, storage).
- Server-only logic via `createServerFn` (no Supabase Edge Functions); admin writes use authenticated server functions with `requireSupabaseAuth`.
- `attachSupabaseAuth` verified in `src/start.ts` so protected server fns receive the bearer token.
- Storage bucket `avatars` created via migration with RLS.

I'll start by enabling Lovable Cloud and laying down the schema + auth, then build the dashboard and routine builder modules.