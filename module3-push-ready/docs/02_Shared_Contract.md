# HMS Shared Contract v1

**الوثيقة دي تغلب أي تعارض مع الـ 4 PDFs أو مع البرومبتات القديمة.** أي تغيير فيها يتم بموافقة عبد الرحمن (مسؤول المشروع) فقط.

---

## 1. القرارات اللي اتحسمت

| # | الموضوع | القرار |
|---|---|---|
| 1 | حالات المهمة | 5 حالات: `pending, assigned, in_progress, completed, cancelled` (الـ DB هي المرجع، مش PDF الموديول 3) |
| 2 | الأدوار | في الـ DB: `guest, employee, admin`. كلمة "Staff" في الواجهة والـ PDFs = `employee` |
| 3 | الحجز | الضيف يحجز **غرفة محددة** (`room_id`)، و Room Type مجرد فلتر للبحث |
| 4 | حساب التوافر | عن طريق دالة `get_available_rooms` (الضيف مش بيقرأ حجوزات غيره بسبب RLS). Check-out حصري (exclusive) |
| 5 | تأكيد الحجز | تلقائي من n8n بعد التحقق وحساب `total_price`. المتصفح لا يؤكد ولا يحسب سعر |
| 6 | Check-in / Check-out | المنطق عند M1 (Workflow). الواجهة (Front Desk) داخل M4. التنفيذ بواسطة employee أو admin |
| 7 | مين يعمل تنظيف بعد الخروج | M4 (`HOTEL_M4_HOUSEKEEPING_TRIGGER`) ينشئ Task، و M3 يسندها |
| 8 | الأقسام | M3 عرض فقط، M5 إدارة |
| 9 | Task Lifecycle | جزء من My Tasks في M3 مش صفحة مستقلة |
| 10 | معلومات الفندق والـ Concierge | جدول جديد `hotel_services` (read للكل، الكتابة admin). الـ Concierge يرد منه فقط |
| 11 | شكاوى الضيوف | `guest_requests` بـ `category = 'complaint'`. عمود جديد `sentiment` |
| 12 | Shift Handover | UI Draft فقط، لا يُخزَّن في الـ DB لحد ما نقرر |
| 13 | Daily Report | يتبعت كـ Notification لكل admin (مفيش جدول تقارير) |
| 14 | AI Insights | تتولد عند الطلب عن طريق الـ Gateway وتتعرض بدون تخزين |
| 15 | الإشعارات | داخل النظام عبر جدول `notifications` (Telegram اختياري لاحقًا) |
| 16 | الـ AI | Gemini عبر n8n فقط. المفتاح داخل n8n Credentials |
| 17 | اللغة | عربي RTL + إنجليزي LTR في كل الموديولات |
| 18 | الـ Auth | Email + Password. الضيف يسجل بنفسه (Trigger ينشئ profile + guest). الموظف والأدمن حسابات محضّرة |
| 19 | من يوافق على تغييرات الـ DB / RLS / الـ Gateway | عبد الرحمن |
| 20 | شكل التسليم | تطبيقات منفصلة حاليًا (نفس الحسابات، تسجيل دخول لكل تطبيق). الدمج في تطبيق واحد يتقرر بعد أول نسخة |

---

## 2. القيم المعتمدة (Enums) — lowercase بالظبط

| الحقل | القيم |
|---|---|
| `profiles.role` | `guest`, `employee`, `admin` |
| `rooms.status` | `available`, `occupied`, `dirty`, `cleaning`, `ready`, `maintenance` |
| `bookings.status` | `pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled` |
| `guest_requests.status` | `new`, `classified`, `processing`, `resolved`, `cancelled` |
| `tasks.status` | `pending`, `assigned`, `in_progress`, `completed`, `cancelled` |
| `priority` (requests + tasks) | `low`, `normal`, `high`, `urgent` |
| `guest_requests.category` (مقترح — يتأكد من الـ Diagnostics) | `housekeeping`, `maintenance`, `room_service`, `complaint`, `other` |
| `sentiment` | `positive`, `neutral`, `negative` |
| `hotel_services.category` | `service`, `facility`, `policy` |

**ألوان الحالات (StatusBadge):**
- Green: `completed, confirmed, ready, resolved, available, checked_out`
- Amber: `pending, new`
- Blue: `in_progress, processing, assigned, classified, cleaning, checked_in`
- Red: `cancelled, urgent, maintenance`
- Orange/Amber-dark: `dirty`
- Gray: أي قيمة غير معروفة / `inactive`
- `occupied`: Blue غامق (Primary)

الأسماء تفضل زي ما هي في الـ DB، وتتعرض مترجمة في الواجهة فقط.

---

## 3. الـ Flows الأساسية

**Flow A — حجز**
1. الضيف يبحث (`get_available_rooms`) ويختار غرفة ويرسل INSERT (`pending`).
2. DB Webhook (INSERT على bookings) ← `HOTEL_M1_BOOKING_PROCESS`: يتحقق إن الحالة لسه `pending`، يحسب `total_price = عدد الليالي × price_per_night`، يحدّث الحالة لـ `confirmed`، ويضيف Notification للضيف.
3. لو الغرفة اتحجزت في نفس اللحظة، الـ Exclusion Constraint يرفض الـ INSERT (error code `23P01`) والواجهة تعرض رسالة واضحة.

**Flow B — دخول وخروج**
1. موظف Reception أو admin يضغط Check-in/Check-out في M4 ← Gateway (`booking_action`) ← `HOTEL_M1_BOOKING_LIFECYCLE`.
2. Check-in: الحجز `checked_in` والغرفة `occupied`.
3. Check-out: الحجز `checked_out`.
4. DB Webhook (UPDATE على bookings إلى `checked_out`) ← `HOTEL_M4_HOUSEKEEPING_TRIGGER`: الغرفة `dirty`، وإنشاء Task (قسم Housekeeping، `pending`، `request_id = NULL`).
5. INSERT على tasks بدون موظف ← `HOTEL_M3_TASK_ASSIGNMENT`.
6. الموظف ينفذ ويحدّث حالة الغرفة (`cleaning` ثم `ready`) من M4، ويحدّث المهمة من M3.

**Flow C — طلب ضيف**
1. الضيف ينشئ طلب (INSERT: `guest_id, room_id, description` فقط) ← الحالة `new`.
2. DB Webhook ← `HOTEL_M2_REQUEST_CLASSIFICATION` (Gemini): يحدّث `category, priority, ai_summary, sentiment (للشكاوى)` وتبقى الحالة `classified`.
3. DB Webhook (UPDATE إلى `classified`) ← `HOTEL_M3_TASK_CREATION`: ينشئ Task أو أكثر (قسم حسب الـ category).
4. `HOTEL_M3_TASK_ASSIGNMENT` يسند.

**ربط الـ category بالقسم:** housekeeping ← Housekeeping، maintenance ← Maintenance، room_service ← Room Service، complaint ← Management، other ← Reception.

**قاعدة الإسناد (M3):** موظف نشط في القسم، يفضّل اللي في وردية دلوقتي، وأقل عدد مهام مفتوحة. لو مفيش، المهمة تفضل `pending` ويتبعت Notification للـ admin.

**الـ due_at الافتراضي:** urgent +1h، high +4h، normal +24h، low +48h.

---

## 4. مين يكتب إيه؟

| العملية | من المتصفح | عن طريق n8n (service role) |
|---|---|---|
| إنشاء حجز Pending | الضيف | — |
| تأكيد الحجز وحساب السعر | ❌ | ✅ |
| Check-in / Check-out / إلغاء | ❌ | ✅ عبر Gateway |
| إنشاء طلب | الضيف (3 أعمدة) | — |
| تصنيف الطلب | ❌ | ✅ |
| إنشاء وإسناد المهام | ❌ | ✅ |
| تحديث حالة المهمة | الموظف (status, completed_at) | — |
| تحديث حالة الغرفة | Housekeeping / Maintenance | ✅ (Check-in/out) |
| إضافة تقييم | الضيف | تحليل المشاعر ✅ |
| إدارة الموظفين والورديات | ❌ | ✅ عبر Gateway |
| إدارة `hotel_services` | admin مباشرة | — |
| الإشعارات | تعليم كمقروء فقط | إنشاؤها ✅ |

---

## 5. الـ Gateway (Edge Function: `workflow-gateway`)

الواجهة **لا تنادي n8n مباشرة** ولا تحتوي على أي Webhook URL. بتنادي:

```js
supabase.functions.invoke('workflow-gateway', { body: { action, payload } })
```

الـ Function (مسؤول عنها عبد الرحمن) تتحقق من الـ JWT والدور، وبعدين تنادي n8n بسر مخزن في Secrets.

| action | payload | من يقدر | الـ Workflow | الموديول |
|---|---|---|---|---|
| `concierge_chat` | `{message, language}` | أي مستخدم مسجل | HOTEL_M1_AI_CONCIERGE | M1 |
| `booking_action` | `{booking_id, action: check_in/check_out/cancel}` | check_in/out: employee أو admin. cancel: صاحب الحجز أو admin | HOTEL_M1_BOOKING_LIFECYCLE | M1 (واجهة في M4) |
| `assign_task` | `{task_id, employee_id}` | admin | HOTEL_M3_TASK_ASSIGNMENT | M3 |
| `manage_employee` | `{operation, ...}` | admin | HOTEL_M5_EMPLOYEE_ADMIN | M5 |
| `manage_shift` | `{operation, ...}` | admin | HOTEL_M5_SHIFT_ADMIN | M4 (واجهة) / M5 |
| `generate_insights` | `{from, to}` | admin | HOTEL_M5_AI_INSIGHTS | M5 |

**لحد ما الـ Gateway يتنشر:** الواجهة تعرض "Pending integration" وتعطّل الزر. ممنوع تزييف نجاح العملية.

---

## 6. الـ Workflows

| الاسم | Trigger | Owner |
|---|---|---|
| HOTEL_M1_BOOKING_PROCESS | DB Webhook: INSERT على bookings | M1 |
| HOTEL_M1_BOOKING_LIFECYCLE | Gateway: booking_action | M1 |
| HOTEL_M1_AI_CONCIERGE | Gateway: concierge_chat | M1 |
| HOTEL_M2_REQUEST_CLASSIFICATION | DB Webhook: INSERT على guest_requests | M2 |
| HOTEL_M2_FEEDBACK_ANALYSIS | DB Webhook: INSERT على feedback | M2 |
| HOTEL_M3_TASK_CREATION | DB Webhook: UPDATE guest_requests إلى classified | M3 |
| HOTEL_M3_TASK_ASSIGNMENT | DB Webhook: INSERT على tasks بدون موظف + Gateway assign_task | M3 |
| HOTEL_M3_NOTIFICATIONS_ESCALATION | Schedule كل 15 دقيقة | M3 |
| HOTEL_M4_HOUSEKEEPING_TRIGGER | DB Webhook: UPDATE bookings إلى checked_out | M4 |
| HOTEL_M5_DAILY_REPORT | Schedule يومي | M5 |
| HOTEL_M5_AI_INSIGHTS | Gateway: generate_insights | M5 |

**قواعد كل Workflow:** يفحص الحالة الحالية قبل الكتابة (لمنع التكرار)، يسجل الأخطاء، ولا يكتب Task أو Notification مكررة لنفس الحدث.

---

## 7. التغييرات في الـ DB (ملف `HMS_DB_Patch_v1.sql`)

- دالة `get_available_rooms(check_in, check_out, room_type)`
- دالة `get_front_desk_bookings(from, to)` (للموظفين والأدمن)
- جدول `hotel_services` + بيانات تجريبية (استبدلها ببيانات حقيقية قبل العرض)
- عمود `guest_requests.sentiment`
- سياسات قراءة للموظفين: زملاء القسم، profiles الموظفين، كل الورديات، الطلبات المرتبطة بمهامهم
- ملف Step 3: سعر افتراضي 0 للحجز، حالة افتراضية new للطلب، قراءة الغرف للزائر بدون تسجيل

---

## 8. قواعد عامة للواجهات

- متغيرات البيئة فقط للـ URL والـ Publishable Key. ممنوع service_role.
- لو عملية اترفضت بسبب RLS: اعرض الخطأ الحقيقي ولا تحاول تتحايل.
- لو Integration لسه مش متوصل: اعرض "Pending integration" بوضوح.
- الألوان والخطوط من UI Standards. RTL للعربي.
- الضيف يقدر يتصفح الصفحة الرئيسية والخدمات من غير تسجيل دخول، لكن الحجز وباقي الصفحات تحتاج تسجيل.
- لازم Supabase Auth يكون **Confirm email مطفي** أثناء التطوير.

---

## 9. نتيجة فحص قاعدة البيانات (اتحسمت)

1. `guest_requests.category` مفيش عليه قيد، فالقيم المعتمدة (housekeeping, maintenance, room_service, complaint, other) اتفاق بينا بس. n8n هو اللي بيكتبها.
2. `tasks.request_id` بيقبل فاضي، فمهام التنظيف بعد الخروج (من غير طلب ضيف) تشتغل عادي.
3. `feedback.sentiment` مفيش عليه قيد، فالقيم المعتمدة positive / neutral / negative اتفاق بينا.
4. `bookings.total_price` سعره الافتراضي **0** لحد ما n8n يأكد الحجز. الواجهة تعرض السعر لو أكبر من 0، وإلا تعرض التقدير.
5. `guest_requests.status` الافتراضي `new`.
6. الغرف مقروءة من غير تسجيل دخول (للصفحة الرئيسية). باقي الجداول لازم تسجيل دخول.
7. الموظف بيشوف المهام المسندة له بس، ومفيش شاشة عرض لمهام القسم كله للموظف العادي (الأدمن بيشوف الكل).
8. دمج الواجهات في تطبيق واحد أو الإبقاء على 5 تطبيقات منفصلة: لسه هنقرر بعد أول نسخة.
