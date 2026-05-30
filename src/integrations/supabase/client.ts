import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

import { createClient } from "@supabase/supabase-js";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "./types";

type DemoRole = Database["public"]["Enums"]["app_role"];

type DemoAccount = {
  email: string;
  password: string;
  role: DemoRole;
  userId: string;
};

type DemoRow = Record<string, unknown>;

type DemoTables = {
  days: DemoRow[];
  time_slots: DemoRow[];
  subjects: DemoRow[];
  teachers: DemoRow[];
  rooms: DemoRow[];
  schedule_entries: DemoRow[];
  university_settings: DemoRow[];
  user_roles: DemoRow[];
};

type DemoState = {
  session: Session | null;
  tables: DemoTables;
};

type DemoAuthCallback = (event: string, session: Session | null) => void;

type QueryState = {
  operation: "select" | "insert" | "update" | "delete" | "maybeSingle";
  filters: Array<{ column: string; value: unknown }>;
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
  head?: boolean;
  count?: boolean;
  payload?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const DEMO_STORAGE_KEY = "class-rotin-demo-state";

const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "admin@demo.edu", password: "demoadmin", role: "super_admin", userId: "demo-super-admin" },
  { email: "admin2@demo.edu", password: "demoadmin", role: "admin", userId: "demo-admin" },
  { email: "teacher@demo.edu", password: "demoteacher", role: "teacher", userId: "demo-teacher" },
  { email: "student@demo.edu", password: "demostudent", role: "student", userId: "demo-student" },
];

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T);
}

function createDemoState(): DemoState {
  const createdAt = nowIso();

  const days = [
    { id: "demo-day-mon", name: "Monday", short_name: "Mon", color: "#6366f1", is_active: true, position: 0 },
    { id: "demo-day-tue", name: "Tuesday", short_name: "Tue", color: "#0ea5e9", is_active: true, position: 1 },
    { id: "demo-day-wed", name: "Wednesday", short_name: "Wed", color: "#10b981", is_active: true, position: 2 },
    { id: "demo-day-thu", name: "Thursday", short_name: "Thu", color: "#f59e0b", is_active: true, position: 3 },
    { id: "demo-day-fri", name: "Friday", short_name: "Fri", color: "#ef4444", is_active: true, position: 4 },
  ];

  const timeSlots = [
    { id: "demo-slot-1", label: "Period 1", start_time: "09:00", end_time: "10:00", is_break: false, position: 0 },
    { id: "demo-slot-2", label: "Period 2", start_time: "10:15", end_time: "11:15", is_break: false, position: 1 },
    { id: "demo-slot-break", label: "Lunch", start_time: "11:15", end_time: "12:00", is_break: true, position: 2 },
    { id: "demo-slot-3", label: "Period 3", start_time: "12:00", end_time: "01:00", is_break: false, position: 3 },
  ];

  const subjects = [
    { id: "demo-subject-cse101", name: "Introduction to Programming", code: "CSE-101", category: "Core", credits: 3, color: "#6366f1", description: "Fundamentals of programming.", created_at: createdAt },
    { id: "demo-subject-mth101", name: "Discrete Mathematics", code: "MTH-101", category: "Core", credits: 3, color: "#0ea5e9", description: "Sets, logic, and combinatorics.", created_at: createdAt },
    { id: "demo-subject-lab", name: "Programming Lab", code: "CSE-103", category: "Lab", credits: 1, color: "#10b981", description: "Hands-on coding practice.", created_at: createdAt },
    { id: "demo-subject-elec", name: "UI Design Basics", code: "DES-150", category: "Elective", credits: 2, color: "#f59e0b", description: "Visual hierarchy and interface fundamentals.", created_at: createdAt },
  ];

  const teachers = [
    { id: "demo-teacher-1", name: "Dr. Ayesha Rahman", email: "ayesha@demo.edu", designation: "Professor", department: "CSE", max_weekly_hours: 12 },
    { id: "demo-teacher-2", name: "Dr. Imran Hossain", email: "imran@demo.edu", designation: "Associate Professor", department: "CSE", max_weekly_hours: 10 },
    { id: "demo-teacher-3", name: "M. R. Karim", email: "karim@demo.edu", designation: "Lecturer", department: "Math", max_weekly_hours: 14 },
    { id: "demo-teacher-4", name: "Nadia Sultana", email: "nadia@demo.edu", designation: "Lecturer", department: "Design", max_weekly_hours: 8 },
  ];

  const rooms = [
    { id: "demo-room-a101", room_number: "A-101", building: "Main Block", capacity: 60, type: "classroom" },
    { id: "demo-room-a203", room_number: "A-203", building: "Main Block", capacity: 40, type: "lab" },
    { id: "demo-room-b110", room_number: "B-110", building: "Annex", capacity: 30, type: "seminar" },
    { id: "demo-room-c301", room_number: "C-301", building: "Tech Wing", capacity: 50, type: "classroom" },
  ];

  const scheduleEntries = [
    { id: "demo-entry-1", day_id: "demo-day-mon", time_slot_id: "demo-slot-1", subject_id: "demo-subject-cse101", teacher_id: "demo-teacher-1", room_id: "demo-room-a101", section: "A" },
    { id: "demo-entry-2", day_id: "demo-day-tue", time_slot_id: "demo-slot-2", subject_id: "demo-subject-mth101", teacher_id: "demo-teacher-2", room_id: "demo-room-a203", section: "A" },
    { id: "demo-entry-3", day_id: "demo-day-wed", time_slot_id: "demo-slot-3", subject_id: "demo-subject-lab", teacher_id: "demo-teacher-1", room_id: "demo-room-a203", section: "B" },
    { id: "demo-entry-4", day_id: "demo-day-thu", time_slot_id: "demo-slot-2", subject_id: "demo-subject-elec", teacher_id: "demo-teacher-4", room_id: "demo-room-c301", section: "C" },
  ];

  return {
    session: null,
    tables: {
      university_settings: [
        {
          id: "demo-settings-1",
          name: "Routine Manager Demo Campus",
          academic_year: "2025 - 2026",
          current_semester: "Spring 2026",
          contact_email: "dept@demo.edu",
          onboarded: true,
        },
      ],
      user_roles: DEMO_ACCOUNTS.map((account) => ({ id: `${account.userId}-role`, user_id: account.userId, role: account.role })),
      days,
      time_slots: timeSlots,
      subjects,
      teachers,
      rooms,
      schedule_entries: scheduleEntries,
    },
  };
}

let memoryDemoState = createDemoState();
const demoListeners = new Set<DemoAuthCallback>();

function readDemoState(): DemoState {
  if (typeof window === "undefined") {
    return memoryDemoState;
  }

  const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
  if (!raw) {
    return memoryDemoState;
  }

  try {
    const parsed = JSON.parse(raw) as DemoState;
    memoryDemoState = {
      session: parsed.session ?? null,
      tables: {
        ...createDemoState().tables,
        ...(parsed.tables ?? {}),
      },
    };
  } catch {
    window.localStorage.removeItem(DEMO_STORAGE_KEY);
  }

  return memoryDemoState;
}

function getDemoState() {
  return readDemoState();
}

function writeDemoState(state: DemoState) {
  memoryDemoState = clone(state);
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore persistence failures in demo mode.
  }
}

function getDemoAccount(email: string, password: string) {
  return DEMO_ACCOUNTS.find((account) => account.email === email && account.password === password);
}

function getDemoAccountByUserId(userId: string) {
  return DEMO_ACCOUNTS.find((account) => account.userId === userId);
}

function createDemoSession(account: DemoAccount): Session {
  const createdAt = nowIso();
  return {
    access_token: `demo-${account.userId}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    expires_in: 60 * 60 * 24,
    refresh_token: `demo-refresh-${account.userId}`,
    token_type: "bearer",
    user: {
      id: account.userId,
      email: account.email,
      app_metadata: { provider: "demo", role: account.role },
      user_metadata: { label: account.userId, role: account.role },
      aud: "authenticated",
      role: "authenticated",
      created_at: createdAt,
    } as User,
  } as Session;
}

function notifyDemoAuth(event: string, session: Session | null) {
  for (const listener of demoListeners) {
    listener(event, session);
  }
}

function buildAuthResponse(session: Session | null) {
  return { data: { session }, error: null };
}

function compareValues(left: unknown, right: unknown) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
}

function createDemoQueryBuilder(table: keyof DemoState["tables"]) {
  const state = getDemoState();
  const queryState: QueryState = {
    operation: "select",
    filters: [],
  };

  const execute = () => {
    const rows = state.tables[table] ?? [];
    const filteredRows = queryState.filters.reduce(
      (currentRows, filter) => currentRows.filter((row) => row[filter.column] === filter.value),
      rows,
    );

    const orderedRows = queryState.orderBy
      ? [...filteredRows].sort((left, right) => {
          const result = compareValues(left[queryState.orderBy!.column], right[queryState.orderBy!.column]);
          return queryState.orderBy!.ascending ? result : -result;
        })
      : filteredRows;

    const limitedRows = typeof queryState.limit === "number" ? orderedRows.slice(0, queryState.limit) : orderedRows;

    if (queryState.operation === "maybeSingle") {
      return { data: limitedRows[0] ?? null, error: null };
    }

    if (queryState.operation === "insert") {
      const payloadRows = Array.isArray(queryState.payload) ? queryState.payload : [queryState.payload ?? {}];
      const insertedRows = payloadRows.map((values) => {
        const base = { ...(values ?? {}) } as DemoRow;
        const row: DemoRow = {
          ...base,
          id: (base.id as string | undefined) ?? createId(String(table)),
          created_at: (base.created_at as string | undefined) ?? nowIso(),
        };

        if (table === "days" && row.position == null) {
          row.position = rows.length;
        }

        if (table === "time_slots" && row.position == null) {
          row.position = rows.length;
        }

        if (table === "university_settings" && row.onboarded == null) {
          row.onboarded = true;
        }

        rows.push(row);
        return clone(row);
      });

      return {
        data: insertedRows.length === 1 ? insertedRows[0] : insertedRows,
        error: null,
      };
    }

    if (queryState.operation === "update") {
      const updates = (queryState.payload ?? {}) as DemoRow;
      const updatedRows: DemoRow[] = [];

      rows.forEach((row, index) => {
        const matches = queryState.filters.every((filter) => row[filter.column] === filter.value);
        if (!matches) return;

        const nextRow = { ...row, ...clone(updates) };
        rows[index] = nextRow;
        updatedRows.push(clone(nextRow));
      });

      return { data: updatedRows, error: null };
    }

    if (queryState.operation === "delete") {
      const deletedRows = rows.filter((row) => queryState.filters.every((filter) => row[filter.column] === filter.value));
      state.tables[table] = rows.filter((row) => !deletedRows.includes(row));
      return { data: deletedRows.map((row) => clone(row)), error: null };
    }

    if (queryState.head) {
      return { data: null, count: filteredRows.length, error: null };
    }

    return {
      data: limitedRows.map((row) => clone(row)),
      error: null,
      count: queryState.count ? filteredRows.length : undefined,
    };
  };

  const builder = {
    select(_columns?: string, options?: { head?: boolean; count?: string }) {
      queryState.operation = "select";
      queryState.head = options?.head ?? false;
      queryState.count = Boolean(options?.count);
      return builder;
    },
    eq(column: string, value: unknown) {
      queryState.filters.push({ column, value });
      return builder;
    },
    order(column: string, options?: { ascending?: boolean }) {
      queryState.orderBy = { column, ascending: options?.ascending ?? true };
      return builder;
    },
    limit(value: number) {
      queryState.limit = value;
      return builder;
    },
    maybeSingle() {
      queryState.operation = "maybeSingle";
      const result = execute();
      writeDemoState(state);
      return Promise.resolve(result);
    },
    insert(values: Record<string, unknown> | Array<Record<string, unknown>>) {
      queryState.operation = "insert";
      queryState.payload = values;
      const result = execute();
      writeDemoState(state);
      return Promise.resolve(result);
    },
    update(values: Record<string, unknown>) {
      queryState.operation = "update";
      queryState.payload = values;
      return builder;
    },
    delete() {
      queryState.operation = "delete";
      return builder;
    },
    then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
      try {
        const result = execute();
        writeDemoState(state);
        return Promise.resolve(result).then(onFulfilled, onRejected);
      } catch (error) {
        return Promise.reject(error).then(onFulfilled, onRejected);
      }
    },
  };

  return builder;
}

function createDemoSupabaseClient(message: string) {
  const unavailableError = new Error(message);

  const auth = {
    getSession: async () => buildAuthResponse(getDemoState().session),
    onAuthStateChange: (callback: DemoAuthCallback) => {
      demoListeners.add(callback);
      callback("INITIAL_SESSION", getDemoState().session);
      return {
        data: {
          subscription: {
            unsubscribe() {
              demoListeners.delete(callback);
            },
          },
        },
      };
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const account = getDemoAccount(email, password);
      if (!account) {
        return {
          data: { user: null, session: null },
          error: new Error("Invalid demo credentials. Use one of the demo accounts shown on the page."),
        };
      }

      const session = createDemoSession(account);
      const nextState = getDemoState();
      nextState.session = session;
      writeDemoState(nextState);
      notifyDemoAuth("SIGNED_IN", session);

      return { data: { user: session.user, session }, error: null };
    },
    signUp: async ({ email }: { email: string }) => {
      const account =
        DEMO_ACCOUNTS.find((item) => item.email === email) ??
        ({ email, password: "", role: "student", userId: createId("demo-user") } as DemoAccount);

      const session = createDemoSession(account);
      const nextState = getDemoState();
      nextState.session = session;
      writeDemoState(nextState);
      notifyDemoAuth("SIGNED_IN", session);

      return { data: { user: session.user, session }, error: null };
    },
    signOut: async () => {
      const nextState = getDemoState();
      nextState.session = null;
      writeDemoState(nextState);
      notifyDemoAuth("SIGNED_OUT", null);
      return { error: null };
    },
    getClaims: async () => {
      const session = getDemoState().session;
      if (!session) {
        return { data: null, error: unavailableError };
      }

      const account = getDemoAccountByUserId(session.user.id);
      return {
        data: {
          claims: {
            sub: session.user.id,
            email: session.user.email,
            role: account?.role ?? "student",
          },
        },
        error: null,
      };
    },
  };

  return {
    auth,
    from(table: string) {
      return createDemoQueryBuilder(table as keyof DemoTables);
    },
  } as unknown as ReturnType<typeof createSupabaseClient>;
}

function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Connect Supabase in Lovable Cloud.`;
    console.warn(`[Supabase] ${message}`);
    return createDemoSupabaseClient(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
