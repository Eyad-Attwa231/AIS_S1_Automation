-- ==============================================================================
-- 001: Module 3 Helper Functions, RLS Policies & Realtime Publication
-- ==============================================================================

-- 1. Security-definer helper functions used by RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id
  FROM public.employees
  WHERE profile_id = (SELECT auth.uid())
    AND is_active
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_department_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT department_id
  FROM public.employees
  WHERE profile_id = (SELECT auth.uid())
    AND is_active
  LIMIT 1;
$$;

-- 2. Enable Row Level Security on Module 3 and related tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 3. Idempotent RLS Policies for Module 3
DO $$
BEGIN
  -- Departments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'departments' AND policyname = 'Authenticated users view departments') THEN
    CREATE POLICY "Authenticated users view departments"
      ON public.departments FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'departments' AND policyname = 'Admins manage departments') THEN
    CREATE POLICY "Admins manage departments"
      ON public.departments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;

  -- Employees
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employees' AND policyname = 'Employees view own record or admins view all') THEN
    CREATE POLICY "Employees view own record or admins view all"
      ON public.employees FOR SELECT TO authenticated USING ((profile_id = (SELECT auth.uid())) OR is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employees' AND policyname = 'staff_read_colleagues') THEN
    CREATE POLICY "staff_read_colleagues"
      ON public.employees FOR SELECT TO authenticated USING (current_employee_id() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employees' AND policyname = 'Admins manage employees') THEN
    CREATE POLICY "Admins manage employees"
      ON public.employees FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;

  -- Tasks
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'Employees view assigned tasks or admins view all') THEN
    CREATE POLICY "Employees view assigned tasks or admins view all"
      ON public.tasks FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = tasks.assigned_employee_id
            AND employees.profile_id = (SELECT auth.uid())
        )
        OR is_admin()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'Employees update their assigned tasks') THEN
    CREATE POLICY "Employees update their assigned tasks"
      ON public.tasks FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.id = tasks.assigned_employee_id
            AND e.profile_id = (SELECT auth.uid())
            AND e.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.id = tasks.assigned_employee_id
            AND e.profile_id = (SELECT auth.uid())
            AND e.is_active = true
        )
        AND (status <> 'completed'::text OR completed_at IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'Admins can insert tasks') THEN
    CREATE POLICY "Admins can insert tasks"
      ON public.tasks FOR INSERT TO authenticated WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'Admins can update all tasks') THEN
    CREATE POLICY "Admins can update all tasks"
      ON public.tasks FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;

  -- Notifications
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users view own notifications') THEN
    CREATE POLICY "Users view own notifications"
      ON public.notifications FOR SELECT TO authenticated USING ((profile_id = (SELECT auth.uid())) OR is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users update own notification read status') THEN
    CREATE POLICY "Users update own notification read status"
      ON public.notifications FOR UPDATE TO authenticated
      USING (profile_id = (SELECT auth.uid()))
      WITH CHECK (profile_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Admins can insert notifications') THEN
    CREATE POLICY "Admins can insert notifications"
      ON public.notifications FOR INSERT TO authenticated WITH CHECK (is_admin());
  END IF;

  -- Related guest_requests & rooms visibility for staff
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'guest_requests' AND policyname = 'staff_read_related_requests') THEN
    CREATE POLICY "staff_read_related_requests"
      ON public.guest_requests FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.tasks t
          WHERE t.request_id = guest_requests.id
            AND (t.assigned_employee_id = current_employee_id() OR t.department_id = current_department_id())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rooms' AND policyname = 'Authenticated users view rooms') THEN
    CREATE POLICY "Authenticated users view rooms"
      ON public.rooms FOR SELECT TO authenticated USING (true);
  END IF;
END
$$;

-- 4. Enable Realtime Replication for tasks & notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;
