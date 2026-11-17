-- ==============================================================================
-- 002: Module 2 -> Module 3 Classification & Feedback Bridge Functions/Triggers
-- ==============================================================================

-- 1. Helper function to map Module 2 category & description to department_id
--    Resolves department ID dynamically by name with fallback to Reception.
CREATE OR REPLACE FUNCTION public.resolve_m2_department_id(p_category text, p_description text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat text := LOWER(TRIM(COALESCE(p_category, '')));
  v_desc text := LOWER(COALESCE(p_description, ''));
  v_combined text := v_cat || ' ' || v_desc;
  v_dept_name text;
  v_dept_id uuid;
BEGIN
  -- Technical / repair keywords (English & Arabic) take precedence
  IF v_combined ~* '\m(maintenance|ac|tv|plumb|leak|light|broken|heater|fridge|door|lock|tap)\M'
     OR v_combined LIKE '%air condition%'
     OR v_combined LIKE '%not working%'
     OR v_combined LIKE '%colors are not seen%'
     OR v_combined LIKE '%تكييف%'
     OR v_combined LIKE '%تلفزيون%'
     OR v_combined LIKE '%شاشة%'
     OR v_combined LIKE '%سباكة%'
     OR v_combined LIKE '%مياه%'
     OR v_combined LIKE '%حنفية%'
     OR v_combined LIKE '%عطل%'
     OR v_combined LIKE '%بايظ%'
     OR v_combined LIKE '%معلق%'
     OR v_combined LIKE '%كهرباء%'
     OR v_combined LIKE '%إضاءة%' THEN
    v_dept_name := 'Maintenance';

  -- Explicit category checks (before generic description keywords)
  ELSIF v_cat IN ('housekeeping') THEN
    v_dept_name := 'Housekeeping';
  ELSIF v_cat IN ('room_service', 'room service', 'food') THEN
    v_dept_name := 'Room Service';
  ELSIF v_cat IN ('reception', 'front_desk', 'front desk') THEN
    v_dept_name := 'Reception';

  -- Housekeeping / cleaning / pest keywords (English & Arabic)
  ELSIF v_desc ~* '\m(housekeeping|clean|towel|towels|sheet|sheets|pillow|pillows|blanket|laundry|trash|soap|cockroach|cockroaches|pest|insects)\M'
     OR v_combined LIKE '%صراصير%'
     OR v_combined LIKE '%حشرات%'
     OR v_combined LIKE '%تنظيف%'
     OR v_combined LIKE '%فوط%'
     OR v_combined LIKE '%مناشف%' THEN
    v_dept_name := 'Housekeeping';

  ELSIF v_desc ~* '\m(room_service|food|meal|drink|water|coffee|tea|breakfast|dinner|menu|order)\M'
     OR v_desc LIKE '%room service%' THEN
    v_dept_name := 'Room Service';

  ELSIF v_desc ~* '\m(reception|key|card|booking|bill|invoice)\M'
     OR v_desc LIKE '%front_desk%'
     OR v_desc LIKE '%front desk%'
     OR v_desc LIKE '%check-in%'
     OR v_desc LIKE '%check-out%' THEN
    v_dept_name := 'Reception';

  -- Complaint / Management fallback
  ELSIF v_cat IN ('complaint', 'management')
     OR v_desc LIKE '%complaint%'
     OR v_desc LIKE '%management%' THEN
    v_dept_name := 'Management';

  ELSE
    v_dept_name := 'Reception';
  END IF;

  SELECT id INTO v_dept_id
  FROM public.departments
  WHERE LOWER(name) = LOWER(v_dept_name)
  LIMIT 1;

  IF v_dept_id IS NULL THEN
    SELECT id INTO v_dept_id
    FROM public.departments
    ORDER BY name ASC
    LIMIT 1;
  END IF;

  RETURN v_dept_id;
END;
$$;

-- 2. Trigger function syncing classified guest_requests into public.tasks
CREATE OR REPLACE FUNCTION public.fn_sync_m2_guest_request_to_m3_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_number text;
  v_department_id uuid;
  v_priority text;
  v_clean_summary text;
  v_title text;
  v_description text;
  v_due_at timestamptz;
  v_existing_task_id uuid;
  v_is_complaint boolean;
BEGIN
  IF LOWER(COALESCE(NEW.status, '')) = 'classified'
     OR NULLIF(TRIM(NEW.category), '') IS NOT NULL
     OR NULLIF(TRIM(NEW.ai_summary), '') IS NOT NULL
     OR COALESCE(NEW.description, '') ILIKE '[Guest selected:%'
  THEN
    IF NEW.room_id IS NOT NULL THEN
      SELECT room_number INTO v_room_number
      FROM public.rooms
      WHERE id = NEW.room_id;
    END IF;

    v_department_id := public.resolve_m2_department_id(NEW.category, NEW.description);

    v_is_complaint := (
      COALESCE(NEW.description, '') ILIKE '%complaint%'
      OR LOWER(COALESCE(NEW.category, '')) = 'complaint'
      OR LOWER(COALESCE(NEW.sentiment, '')) = 'negative'
    );

    v_priority := LOWER(COALESCE(NULLIF(TRIM(NEW.priority), ''), 'normal'));
    IF v_priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
      v_priority := 'normal';
    END IF;
    IF v_priority = 'normal' AND v_is_complaint THEN
      v_priority := 'high';
    END IF;

    v_clean_summary := TRIM(
      REGEXP_REPLACE(
        COALESCE(NULLIF(TRIM(NEW.ai_summary), ''), NULLIF(TRIM(NEW.description), ''), 'Guest Request'),
        '^\s*\[Guest selected:[^\]]*\]\s*',
        '',
        'i'
      )
    );
    IF v_clean_summary IS NULL OR v_clean_summary = '' THEN
      v_clean_summary := 'Guest Request';
    END IF;

    IF v_is_complaint THEN
      IF v_room_number IS NOT NULL THEN
        v_title := '[Complaint • Room ' || v_room_number || '] ' || v_clean_summary;
      ELSE
        v_title := '[Complaint] ' || v_clean_summary;
      END IF;
    ELSE
      IF v_room_number IS NOT NULL THEN
        v_title := '[Room ' || v_room_number || '] ' || v_clean_summary;
      ELSE
        v_title := v_clean_summary;
      END IF;
    END IF;

    v_description := TRIM(
      COALESCE(NEW.description, '') ||
      CASE WHEN NULLIF(TRIM(NEW.ai_summary), '') IS NOT NULL
           THEN E'\nAI Summary: ' || TRIM(NEW.ai_summary)
           ELSE '' END ||
      CASE WHEN NULLIF(TRIM(NEW.category), '') IS NOT NULL
           THEN E'\nCategory: ' || TRIM(NEW.category)
           ELSE '' END ||
      CASE WHEN NULLIF(TRIM(NEW.sentiment), '') IS NOT NULL
           THEN E'\nSentiment: ' || TRIM(NEW.sentiment)
           ELSE '' END
    );

    v_due_at := CASE v_priority
      WHEN 'urgent' THEN now() + interval '30 minutes'
      WHEN 'high'   THEN now() + interval '60 minutes'
      WHEN 'low'    THEN now() + interval '240 minutes'
      ELSE               now() + interval '120 minutes'
    END;

    SELECT id INTO v_existing_task_id
    FROM public.tasks
    WHERE request_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_task_id IS NULL THEN
      INSERT INTO public.tasks (
        request_id,
        department_id,
        title,
        description,
        priority,
        status,
        due_at
      ) VALUES (
        NEW.id,
        v_department_id,
        v_title,
        v_description,
        v_priority,
        'pending',
        v_due_at
      );
    ELSE
      UPDATE public.tasks
      SET
        department_id = v_department_id,
        title = v_title,
        description = v_description,
        priority = v_priority
      WHERE id = v_existing_task_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER hms_m2_m3_request_to_task
AFTER INSERT OR UPDATE ON public.guest_requests
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_m2_guest_request_to_m3_task();

-- 3. Trigger function syncing negative or low-rating feedback into Management tasks
CREATE OR REPLACE FUNCTION public.fn_sync_m2_feedback_to_m3_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_task_id uuid;
  v_management_dept_id uuid;
BEGIN
  IF LOWER(COALESCE(NEW.sentiment, '')) = 'negative'
     OR COALESCE(NEW.rating, 5) <= 2
  THEN
    SELECT id INTO v_existing_task_id
    FROM public.tasks
    WHERE description LIKE '%' || NEW.id::text || '%'
    LIMIT 1;

    IF v_existing_task_id IS NULL THEN
      SELECT id INTO v_management_dept_id
      FROM public.departments
      WHERE LOWER(name) = 'management'
      LIMIT 1;

      IF v_management_dept_id IS NULL THEN
        SELECT id INTO v_management_dept_id
        FROM public.departments
        ORDER BY name ASC
        LIMIT 1;
      END IF;

      INSERT INTO public.tasks (
        department_id,
        title,
        description,
        priority,
        status,
        due_at
      ) VALUES (
        v_management_dept_id,
        'Guest Feedback Follow-up (Rating: ' || COALESCE(NEW.rating::text, 'N/A') || '/5)',
        'Comment: ' || COALESCE(NULLIF(TRIM(NEW.comment), ''), 'No comment provided') ||
          E'\nSentiment: ' || COALESCE(NEW.sentiment, 'negative') ||
          E'\nFeedback ID: ' || NEW.id::text,
        'high',
        'pending',
        now() + interval '60 minutes'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER hms_m2_m3_feedback_to_task
AFTER INSERT OR UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_m2_feedback_to_m3_task();
