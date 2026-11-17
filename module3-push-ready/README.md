# Hotel Management System — Module 3: Staff & Task Management

Frontend dashboard, Supabase RLS/trigger bridge, and n8n automation workflows for **Module 3: Staff & Task Management**.

## Features
- **Staff Dashboard:** Real-time task counts, SLA monitoring, completion metrics, and department performance CSV export (Admin).
- **My Assigned Tasks:** Table and Kanban views (`pending` $\rightarrow$ `assigned` $\rightarrow$ `in_progress` $\rightarrow$ `completed`), SLA countdown badges, and Module 2 AI classification & sentiment display.
- **Task Assignment & Staff Management (Admin):** Manual assignment via `workflow-gateway` Edge Function, task creation, department workload visibility, and staff on-duty toggles.
- **Automated n8n Workflows:** Automatic lowest-workload assignment (`n8n/HOTEL_M3_TASK_ASSIGNMENT.json`) and 15-minute SLA escalation/reassignment (`n8n/HOTEL_M3_NOTIFICATIONS_ESCALATION.json`).

---

## Local Setup & Run Steps

1. **Create your local environment file** from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase project URL (`VITE_SUPABASE_URL`) and publishable anon key (`VITE_SUPABASE_ANON_KEY`). Never commit `.env` or use a `service_role` key on the frontend.

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## Supabase Setup
Apply the numbered SQL files in `supabase/migrations/` in order via the Supabase SQL Editor:
1. `supabase/migrations/001_module3_rls_and_realtime.sql`
2. `supabase/migrations/002_module2_to_module3_classification_bridge.sql`
3. `supabase/migrations/003_module3_n8n_webhook_trigger.sql` (replace `<YOUR_N8N_PUBLIC_URL>` with your n8n webhook URL)

---

## n8n Automation Setup
See [`n8n/README.md`](./n8n/README.md) for instructions on importing `n8n/HOTEL_M3_TASK_ASSIGNMENT.json` and `n8n/HOTEL_M3_NOTIFICATIONS_ESCALATION.json` and connecting your Supabase Postgres credentials.
