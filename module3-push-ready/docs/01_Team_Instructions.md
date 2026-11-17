# تعليمات الفريق (النسخة المعدلة)

**للفريق كله:** التعليمات دي بتحل محل القديمة. كل واحد ياخد **الجزء المشترك** + **تعليمات موديوله** بس، ويبعتهم للأداة اللي بيبني بيها (Lovable أو Antigravity أو Bolt أو غيرها). مش لازم نستخدم نفس الأداة، لكن لازم نلتزم بنفس القواعد والأسماء.

## 3 قواعد أساسية

1. كل واحد يبني موديوله بس، ومينفذش وظايف زميله.
2. كل الواجهات بتتصل بنفس مشروع Supabase، وبنفس الجداول والأعمدة والحالات.
3. ممنوع أي أداة تغيّر الجداول أو الحماية أو تعمل جداول بديلة. لو الأداة طلبت ده، ارفضوا وابعتوا لعبد الرحمن.

**الملف `02_Shared_Contract.md` فيه القرارات المتفق عليها. لو في تعارض مع الـ PDF القديمة، الـ Contract هو الصح.**

---

# الجزء المشترك + تعليمات الموديولات الخمسة

(انسخ الجزء المشترك + تعليمات موديولك مع بعض)

## 0. SHARED BLOCK (يتنسخ مع كل برومبت)

```
You are building ONE module of a 5-module Hotel Management System (graduation project). Other developers build the other modules independently with other tools. All modules share ONE existing Supabase project. Follow this contract exactly.

GLOBAL RULES
- Connect to the existing Supabase project using environment variables for Project URL and Publishable Key. Never use or expose service_role/secret keys.
- Do NOT create a new Supabase project. Do NOT create, rename, or alter tables, columns, constraints, or RLS policies. If you believe a change is needed, stop and explain; do not do it.
- Respect RLS. If an operation is blocked, show/report the exact error. Never bypass security.
- Never hardcode user IDs, employee IDs, guest IDs, or webhook URLs. Never invent n8n URLs.
- The browser must NEVER call n8n directly. Trusted operations go through the Supabase Edge Function `workflow-gateway`:
  supabase.functions.invoke('workflow-gateway', { body: { action, payload } })
  If the function is not deployed or returns an error, show a clear "Pending integration" state and disable the action. NEVER fake a successful result, never simulate AI output.
- Use real Supabase data. No fabricated KPIs, tasks, or AI results.

ROLES (profiles.role): guest, employee, admin. The UI label "Staff" means role = employee. Users must never choose or change their own role.

EXACT ENUM VALUES (lowercase, do not rename or add):
- rooms.status: available, occupied, dirty, cleaning, ready, maintenance
- bookings.status: pending, confirmed, checked_in, checked_out, cancelled
- guest_requests.status: new, classified, processing, resolved, cancelled
- tasks.status: pending, assigned, in_progress, completed, cancelled
- priority: low, normal, high, urgent
- guest_requests.category: housekeeping, maintenance, room_service, complaint, other
- sentiment: positive, neutral, negative
Show localized labels in the UI but keep stored values unchanged.

STATUS BADGE COLORS
- Green: completed, confirmed, ready, resolved, available, checked_out
- Amber: pending, new
- Blue: in_progress, processing, assigned, classified, cleaning, checked_in
- Red: cancelled, urgent, maintenance
- Dark amber: dirty; Primary navy: occupied; Gray: unknown/inactive

SYSTEM FLOW (for context; you only build your own part)
Guest creates request -> n8n classifies it (M2) -> n8n creates and assigns tasks (M3) -> employee completes task -> M4 manages room status. Booking: guest inserts pending booking -> n8n validates, sets total_price, confirms. Check-out -> n8n marks room dirty and creates a cleaning task.

SHARED DB OBJECTS YOU MAY USE
- RPC get_available_rooms(p_check_in date, p_check_out date, p_room_type text default null)
- RPC get_front_desk_bookings(p_from date, p_to date) (employee/admin only)
- Table hotel_services (category service|facility|policy; name_en, name_ar, description_en, description_ar, hours, is_active, sort_order). Public read; admin can write.
- guest_requests.sentiment (positive|neutral|negative), set only by automation.

DESIGN
- Primary #16324F, Secondary #267C83, Background #F4F7FA, Surface #FFFFFF, Text #263445, Muted #64748B, Border #E2E8F0, Success #16A34A, Warning #D97706, Danger #DC2626, Info #2563EB.
- Fonts: Cairo (Arabic), Inter (English). Arabic = RTL, English = LTR. Use CSS logical properties. Language toggle required.
- Responsive. Every list needs loading, empty, and error states. Forms need labels, validation, loading state, and success/error feedback. Destructive actions need a confirm dialog.
- Build reusable components: StatusBadge, DataTable (search, filters, pagination), StatCard, FormInput, EmptyState, ErrorState, LoadingState.

AT THE END, report: pages built, tables/RPCs used, features working for real, features pending integration, and any permission errors you hit.
```

---

## 1. M1 — Guest Experience & Booking (عبد الرحمن)

```
MODULE: M1 — Guest Experience & Booking. Build a modern, premium Guest Portal (simple top navbar, NO admin sidebar). You own ONLY this module.

TABLES/RPCs: profiles, guests, rooms, bookings, hotel_services, get_available_rooms.
Columns: profiles(id, full_name, phone, role); guests(id, profile_id); rooms(id, room_number, room_type, floor, capacity, price_per_night, status); bookings(id, guest_id, room_id, check_in, check_out, total_price, status, created_at).

AUTH
- Email + password sign up / log in with Supabase Auth. Sign-up must not let the user choose a role (a database trigger creates profile and guest rows).
- Home and Hotel Services are viewable without login. Booking, My Bookings and AI Concierge require login.
- Resolve guest_id dynamically: auth user -> guests.profile_id = auth.uid().

PAGES
A. Guest Home: welcome, hotel overview, quick links to services, featured room types (built from rooms, grouped by room_type with "from" price; rooms are readable without login), CTA to book. If logged in and a current/upcoming booking exists, show it.
B. Hotel Services: cards from hotel_services where category in (service, facility), plus a policies section for category = policy. Show name/description in the active language, and hours.
C. AI Concierge: chat UI. Send messages with workflow-gateway action "concierge_chat" payload {message, language}. Render the returned reply. The assistant may only use hotel_services data; if unknown it must tell the guest to contact reception (this is enforced in the workflow, but also show that guidance in the empty state). If the gateway is unavailable, show "AI Concierge is not connected yet" and disable input. Never generate replies in the frontend.
D. Room Booking: pick check-in, check-out (check-out is exclusive, must be after check-in, check-in not in the past), optional room type filter. Call supabase.rpc('get_available_rooms', {p_check_in, p_check_out, p_room_type}). Do NOT compute availability from the bookings table (RLS only lets guests read their own bookings). Show room cards with details, price per night, and an ESTIMATED total (nights x price, labeled "Estimated"). Guest selects a specific room and submits: insert into bookings {guest_id, room_id, check_in, check_out, status: 'pending'}. Do not send total_price. Do not confirm bookings. If the insert fails with Postgres code 23P01 (overlap), tell the guest the room was just booked and refresh results. After submit, show the booking with status "Pending" and explain it will be confirmed automatically.
E. My Bookings: list the guest's bookings (current/upcoming and past) with room number/type, dates, nights, status badge, and price: show total_price only if it is greater than 0, otherwise the estimate labeled "Estimated" (the database default is 0 until the automation confirms the booking). Detail view per booking. Cancel button calls workflow-gateway action "booking_action" {booking_id, action: 'cancel'} for pending/confirmed bookings, with a confirm dialog; if unavailable, show pending integration.
F. Navigation: if env var VITE_M2_URL (or equivalent) is set, add a "Requests & Feedback" link opening that URL in a new tab. Do not hardcode any URL.

LIMITS: no online payment, no employee/admin screens, no direct writes to rooms, no changes to the database.
```

---

## 2. M2 — Guest Requests & Feedback (إياد)

```
MODULE: M2 — Guest Requests & Feedback. You own ONLY this module. Primary users are guests; admins can open the same screens and RLS will show them all rows.

TABLES: profiles, guests, guest_requests, feedback, rooms, bookings (read own only).
guest_requests(id, guest_id, room_id, category, description, priority, status, ai_summary, sentiment, created_at)
feedback(id, guest_id, booking_id, rating, comment, sentiment, created_at)
rooms(id, room_number, room_type, status)

AUTH: Supabase Auth. Resolve guest_id dynamically through guests.profile_id = auth.uid(). Guests see only their own data.

PAGES
A. Create Request: the guest picks a type (Housekeeping, Maintenance, Room Service, Other) and optionally a room, and writes a description. Browser INSERT is allowed ONLY for guest_id, room_id, description. Do NOT send category, priority, status, ai_summary, or sentiment. Because category cannot be sent, put the guest's type choice into the description as a prefix, e.g. "[Guest selected: Housekeeping] Please clean my room". Room options: a guest can read rooms; if the guest has a current booking, preselect that room.
B. My Requests (dashboard): table/cards with description, category, priority, status, created date, ai_summary. Search by text, filter by status/category/priority. Detail drawer. Status "new" with empty category means classification is pending: show a "Classification pending" indicator. When category/priority/ai_summary are present, show them labeled "AI classified". Never generate these yourself.
C. Complaints: a view of requests where category = 'complaint' with priority, status, ai_summary and sentiment (guest_requests.sentiment). If sentiment is null show "Analysis pending".
D. Feedback & Rating: the guest submits rating 1-5 and a comment, optionally linking one of their own bookings (read from bookings). Show their submitted feedback with sentiment when available (otherwise "Analysis pending"). INSERT only guest_id, booking_id, rating, comment.
E. Department/priority/summary of AI classification is produced by the n8n workflow HOTEL_M2_REQUEST_CLASSIFICATION; the UI only displays results.

LIMITS: do not assign tasks, do not touch tasks or room status, no admin analytics, no direct calls to n8n, no database changes.
```

---

## 3. M3 — Staff & Task Management (زياد)

```
MODULE: M3 — Staff & Task Management. Staff dashboard with sidebar, top navbar, stat cards, filters, tables. You own ONLY this module. Roles: employee sees own work; admin sees everything.

TABLES: profiles, employees, departments, tasks, guest_requests, notifications, shifts.
tasks(id, request_id, department_id, assigned_employee_id, title, description, priority, status, due_at, completed_at, created_at)
employees(id, profile_id, department_id, job_title, is_active); departments(id, name, description)
notifications(id, profile_id, title, message, is_read, created_at)

AUTH: Supabase Auth. Resolve the employee through employees.profile_id = auth.uid(). Redirect users whose role is not employee/admin.

PAGES
A. Staff Dashboard: counts for total, pending, assigned, in_progress, completed, cancelled, overdue (due_at < now and status not in completed/cancelled), plus recent task activity and the user's unread notifications.
B. My Tasks: tasks assigned to the logged-in employee with title, description, department, priority, status, due date, created date, and linked request summary when readable (guest_requests are readable only when linked to the employee's tasks/department; if blocked, just hide it). The employee may update ONLY status and completed_at. Allowed transitions: pending/assigned -> in_progress -> completed, and cancel. When status becomes completed, set completed_at = now. Show the task lifecycle timeline inside the task detail (this replaces a separate Task Lifecycle page).
C. Task Assignment (admin): list unassigned tasks (assigned_employee_id is null), employee workloads (open tasks per active employee), and an Assign control that calls workflow-gateway action "assign_task" {task_id, employee_id}. Browser must not write assignments directly. If the gateway is unavailable, show "Pending integration". Explain in the UI that tasks are created and assigned automatically by workflows HOTEL_M3_TASK_CREATION and HOTEL_M3_TASK_ASSIGNMENT.
D. Departments: department name, description, employees in each (employees can now read colleague rows) and task counts.
E. Notifications & Escalation: list the user's notifications, allow marking read (update is_read only), and show overdue/urgent tasks with priority indicators. Escalation itself is automated by HOTEL_M3_NOTIFICATIONS_ESCALATION (not yet connected) — show this as pending integration.

LIMITS: do not create tasks from the browser, do not change room status, do not fake tasks or integrations, no database changes.
```

---

## 4. M4 — Room & Shift Operations (أحمد)

```
MODULE: M4 — Room & Shift Operations. Operations dashboard with sidebar, top navbar, room cards and status indicators. You own ONLY this module. Desktop and tablet focus.

TABLES/RPCs: rooms, employees, departments, shifts, tasks, guest_requests, profiles, get_front_desk_bookings.
rooms(id, room_number, room_type, floor, capacity, price_per_night, status, created_at)
shifts(id, employee_id, start_time, end_time, notes, created_at)

AUTH: Supabase Auth. Allowed roles: employee and admin. Resolve the employee dynamically.

PAGES
A. Rooms Dashboard: all rooms with number, type, floor, capacity, price, status; search by room number; filters by type and status; statistics per status.
B. Room Status Management: change rooms.status among available, occupied, dirty, cleaning, ready, maintenance. Update ONLY the status column. Only employees in the Housekeeping or Maintenance departments (and admin) can update; for others hide/disable the control with an explanation. If RLS rejects, show the exact error.
C. Housekeeping: rooms in dirty, cleaning and ready status in clear columns with quick actions (dirty -> cleaning -> ready).
D. Maintenance Tracking: rooms in maintenance status, and the related requests/tasks where readable (guest_requests are readable only when linked to a task for the user's department). Mark the "log new issue" form as pending integration.
E. Shift Management: list shifts with employee name (join employees -> profiles), department, start, end, notes; filter by date and department; employees can see all shifts. Creating or editing shifts is pending integration (gateway action "manage_shift"); build the form but disable submit when the gateway is unavailable.
F. Shift Handover: UI draft only (current shift summary, pending operational work, maintenance notes, room updates). Do not store anything in the database; label it "Draft".
G. Front Desk: arrivals and departures from supabase.rpc('get_front_desk_bookings', {p_from, p_to}) with guest name, room, dates and status. Buttons Check-in (for confirmed) and Check-out (for checked_in) call workflow-gateway action "booking_action" {booking_id, action}, with a confirm dialog; visible only to employees in the Reception department and admin. If the gateway is unavailable, show pending integration. This page is only a UI: the booking logic belongs to M1 workflows. After Check-out, automation (HOTEL_M4_HOUSEKEEPING_TRIGGER) marks the room dirty and creates a cleaning task for M3 to assign.

LIMITS: do not create or assign tasks, do not edit price/capacity/type, do not manage bookings directly, no database changes.
```

---

## 5. M5 — Admin & Management (عبد الله)

```
MODULE: M5 — Admin & Management. Admin-only dashboard with sidebar, top navbar, KPI cards, charts and tables. You own ONLY this module.

TABLES: profiles, employees, departments, guests, rooms, bookings, guest_requests, tasks, feedback, shifts, notifications, hotel_services.

AUTH: Supabase Auth. Read profiles.role for the current user; only role = 'admin' may open any screen (others see an access-denied page). Never let anyone change their own role. Admin RLS gives read access to all tables.

PAGES
A. Admin Dashboard (real data only): total rooms, occupied rooms (rooms.status = 'occupied'), available rooms, total bookings, pending bookings, total guest requests, pending tasks, completed tasks, overdue tasks, average guest rating.
B. Analytics & Reports: bookings by status and over time, room occupancy by status, requests by category/priority/status, task completion by department, feedback ratings distribution and sentiment (feedback.sentiment, guest_requests.sentiment), department performance. Charts plus a date-range filter.
C. AI Insights: interface that calls workflow-gateway action "generate_insights" {from, to} and renders the returned text (summary, most frequent problems, suggestions). If the gateway is unavailable show "AI workflow not connected yet". Never fabricate insights; any sample content must be clearly labeled "Sample".
D. Employees Management: table with name, department, job title, active status. Add/edit/activate forms call gateway action "manage_employee" and are disabled with "Pending integration" if unavailable. Never write profiles.role from the browser.
E. Departments: list departments with their employees; allow create/edit only if the existing RLS permits it; otherwise show the exact error.
F. Hotel Settings: manage the hotel_services table (admin can create, edit, deactivate, reorder directly through RLS), with English and Arabic fields. This is the content the AI Concierge uses. Role & access overview (admin, employee, guest) is read-only.
G. Daily Report: the report is produced by the HOTEL_M5_DAILY_REPORT workflow and delivered as notifications to admins; show the admin's notifications titled "Daily Report" and allow marking read.

LIMITS: do not execute staff tasks or manage bookings, no invented numbers, no database schema changes.
```


---

# رسالة عامة ابعتها للجروب مع الملفات

يا شباب، التعليمات اللي بعتّها قبل كده اتعدلت. ارموا القديمة واشتغلوا بالجديدة.

كل واحد يبعت لأداة الـ AI بتاعته: **الجزء المشترك + تعليمات موديوله** (من ملف `01_Team_Instructions.md`)، وكمان يقرا ملف `02_Shared_Contract.md` وملف `04_PDF_Corrections.md`.

قواعد مهمة:
1. ابعتوا التعليمات كاملة للأداة، ومتخلوهاش تختصر أو تغير من نفسها.
2. كل واحد يبني موديوله بس.
3. نفس Supabase ونفس الجداول. ممنوع تغيير الجداول أو الحماية من غير ما ترجعوا لعبد الرحمن.
4. استخدموا Publishable Key بس في الواجهة.
5. لو الأداة طلبت تنشئ جداول جديدة، ارفضوا.
6. لو ظهر Error في الاتصال أو الصلاحيات، ابعتوا رسالة الـ Error بدل ما تحاولوا تتجاوزوها.
7. أي زر محتاج n8n مش جاهز، يظهر معطل وعليه "Pending integration". ممنوع نخلي الواجهة تدّعي إنه شغال.
8. الواجهة متكلمش n8n مباشرة، كل حاجة بتعدي على `workflow-gateway` (هيجهزها عبد الرحمن).

في النهاية كل واحد يسلّم:
- رابط أو نسخة المشروع.
- الصفحات اللي اتنفذت.
- الجداول اللي بيتصل بيها.
- اللي شغال فعلا، واللي محتاج n8n أو Backend.
- أي مشاكل أو تعديلات مطلوبة.

بعد ما كل واحد يخلص النسخة الأساسية، هنجمع الموديولات ونختبر الربط.
