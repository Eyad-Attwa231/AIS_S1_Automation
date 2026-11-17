-- ==============================================================================
-- 003: Module 3 Database Webhook Trigger for n8n Auto-Assignment
-- ==============================================================================
-- Before executing in Supabase SQL Editor, replace <YOUR_N8N_PUBLIC_URL> with
-- your active public n8n HTTPS URL (for example via tunnel or hosted n8n).

CREATE OR REPLACE TRIGGER hms_m3_task_insert
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  '<YOUR_N8N_PUBLIC_URL>/webhook/hotel-m3-task-assignment',
  'POST',
  '{"Content-type":"application/json"}',
  '{}',
  '5000'
);
