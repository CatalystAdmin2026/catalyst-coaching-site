-- ─────────────────────────────────────────────────────────────
-- Catalyst OS — Auth Integration Migration
-- Sprint 5B.2
-- Generated: 2026-07-12
--
-- This migration:
--   1. Adds FK: public.users.id → auth.users.id (CASCADE)
--   2. Creates trigger function to auto-insert into public.users
--      on new auth.users row
--   3. Enables Row Level Security on all 10 public tables
--   4. Adds permissive SELECT policies for authenticated clients
--      on: users, client_profiles, coaching_enrollments
--   5. All other tables: RLS enabled, no permissive policies = deny all
--      browser access (Drizzle server connections bypass RLS)
--
-- CONTAINS NO DESTRUCTIVE STATEMENTS (no DROP, ALTER COLUMN DROP,
-- TRUNCATE, DELETE, or DROP POLICY).
-- Safe to apply to an empty database.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- 1. Foreign key: public.users.id → auth.users.id
--
-- ON DELETE CASCADE: if a Supabase auth user is hard-deleted
-- (rare, admin-level action), the public.users row is removed.
-- The RESTRICT FKs from other tables (enrollments, profiles)
-- will prevent this unless all coaching records are removed first —
-- which is the desired safe behavior.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.users
  ADD CONSTRAINT users_id_fk_auth
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 2. Trigger function: auto-create public.users on new auth user
--
-- SECURITY DEFINER: runs as the function owner (postgres role)
-- which has INSERT access to public.users. Required because the
-- trigger fires in the auth schema context.
--
-- SET search_path = public: prevents search_path injection.
--
-- Status defaults to 'invited': the server sync helper in
-- lib/auth/sync.ts transitions this to 'active' on first login.
--
-- Role defaults to 'client': coach and admin roles are granted
-- only through trusted server-side or manual administrative actions.
-- The trigger never reads user_metadata to assign role — that field
-- is user-editable and cannot be trusted for access control.
--
-- ON CONFLICT (id) DO NOTHING: idempotent — safe if the trigger
-- fires more than once for the same auth user (e.g. after restore).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    normalized_email,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    lower(trim(COALESCE(NEW.email, ''))),
    'client',
    'invited',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- The trigger fires AFTER the auth.users row is committed,
-- satisfying the FK constraint at trigger execution time.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ─────────────────────────────────────────────────────────────
-- 3. Enable Row Level Security on all 10 public tables
--
-- Enabling RLS without any permissive policies = deny all
-- browser/client requests through the Supabase Data API.
-- Drizzle ORM (direct Postgres connection, postgres user) bypasses
-- RLS entirely — all server-side reads and writes are unaffected.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 4. RLS policies: authenticated client read access
--
-- Only three tables grant any browser access.
-- All writes remain server-side only in this sprint.
-- ─────────────────────────────────────────────────────────────

-- users: authenticated user can SELECT only their own record.
-- No INSERT, UPDATE, or DELETE allowed through the Data API.
-- Role and status changes happen only via server-side Drizzle calls.
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- client_profiles: authenticated client can SELECT only their own profile.
CREATE POLICY "client_profiles_select_own"
  ON public.client_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- coaching_enrollments: client can SELECT only their own enrollments.
-- coach_id enrollments are not visible to the client via this policy.
CREATE POLICY "enrollments_select_client_own"
  ON public.coaching_enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

-- ─────────────────────────────────────────────────────────────
-- 5. Tables intentionally left with no permissive policies
--    (RLS enabled = deny all Data API access):
--
--   coach_profiles        — coach-only, no client read needed yet
--   external_identities   — internal vendor mapping, never client-readable
--   enrollment_events     — append-only audit log, internal only
--   timeline_events       — coach-facing, not client-readable yet
--   drive_workspaces      — internal Drive mapping, not client-readable
--   program_templates     — template library, client access via enrollment
--   workout_templates     — template library, client access via enrollment
--
-- Policies will be added as future sprints require client-facing
-- program visibility, check-in access, and progress data.
-- ─────────────────────────────────────────────────────────────
