# Module 3 n8n Automation Workflows & Setup Guide

**Module:** Module 3 — Staff & Task Management
**Single Source of Truth:** Supabase PostgreSQL

---

## 1. Workflows Included

1. **`n8n/HOTEL_M3_TASK_ASSIGNMENT.json`**
   - **Trigger:** Webhook (`POST /webhook/hotel-m3-task-assignment`) fired by Supabase trigger `hms_m3_task_insert`.
   - **Behavior:** Checks idempotency (`assigned_employee_id IS NULL`), calculates active workload across employees in the task's `department_id`, assigns the task (`status = 'assigned'`), and inserts a notification into `public.notifications`.

2. **`n8n/HOTEL_M3_NOTIFICATIONS_ESCALATION.json`**
   - **Trigger:** Schedule trigger running every 15 minutes.
   - **Behavior:** Detects overdue tasks (`status IN ('assigned', 'in_progress')` and `due_at < now()`), sends SLA warning/breach notifications to the assigned employee and all admins, and performs one-time automatic reassignment to an available colleague with lower workload when eligible.

---

## 2. Import & Credential Setup (Self-Hosted n8n)

Workflow JSON files in this directory are exported **without credentials**. Configure your Postgres credential locally after importing:

1. Start your n8n instance locally (e.g., `http://localhost:5678`).
2. Go to **Workflows** $\rightarrow$ **Import from File** and import:
   - `n8n/HOTEL_M3_TASK_ASSIGNMENT.json`
   - `n8n/HOTEL_M3_NOTIFICATIONS_ESCALATION.json`
3. Open any Postgres node in each workflow and create/select a **Postgres** credential using your Supabase Database connection parameters:
   - **Host:** `<your-supabase-pooler-host>`
   - **Database:** `postgres`
   - **User:** `postgres.<your-project-ref>`
   - **Password:** `<your-database-password>`
   - **Port:** `6543` (or `5432`)
   - **SSL:** `Require`
4. Test the connection, save credentials on each Postgres node, and switch both workflows to **Active** / **Published**.
5. Replace `<YOUR_N8N_PUBLIC_URL>` in `supabase/migrations/003_module3_n8n_webhook_trigger.sql` with your public HTTPS n8n webhook base URL before applying that trigger in Supabase.
