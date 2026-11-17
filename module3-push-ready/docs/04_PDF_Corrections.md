# تعديلات الـ 4 PDF

الـ PDF القديمة تفضل زي ما هي. التعديلات دي بتتضاف عليها، ولو في تعارض **التعديل هو الصح**.

---

## 1) ملف Project Distribution (توزيع الموديولات)

**Module 3 — حالات المهمة**
- القديم: 4 حالات (Pending, Assigned, In Progress, Completed).
- الصح: **5 حالات**، والخامسة **Cancelled**. (قاعدة البيانات فيها الخمسة).

**Module 4 — Workflow التنظيف بعد Check-out**
- القديم: مكتوب إن في Workflow بينشئ مهمة تنظيف عند Check-out، بس مش واضح مين بيسجل الـ Check-out.
- الصح: موظف الاستقبال (أو الأدمن) بيضغط Check-in / Check-out من صفحة **Front Desk** في Module 4. المنطق نفسه (تغيير حالة الحجز والغرفة) بيتعمل في Workflow تبع Module 1. بعد الـ Check-out، Workflow تبع M4 بيخلي الغرفة dirty وينشئ مهمة تنظيف، وM3 يسندها.

---

## 2) ملف Project Foundation (أساسيات المشروع)

**Module 1**
- Room Booking: الضيف بيختار **غرفة محددة** (نوع الغرفة مجرد فلتر للبحث).
- Hotel Services و AI Concierge: بياناتهم من جدول واحد جديد اسمه `hotel_services`. الشات الذكي مبيردش بحاجة مش موجودة فيه، ولو معرفش يقول للضيف يتواصل مع الاستقبال.

**Module 3 — بند 6 "Task Lifecycle"**
- القديم: مكتوب كنقطة مستقلة.
- الصح: ده جزء من صفحة **My Tasks** (جدول زمني جوه تفاصيل المهمة)، مش صفحة لوحدها.

**Module 5 — بند 5 "Departments Management"**
- الصح: **M5 هو اللي يدير الأقسام** (إضافة وتعديل). M3 بيعرضها بس.

**الإشعارات (Telegram)**
- الإشعارات الأساسية **جوه النظام** (جدول notifications). Telegram اختياري ومش مطلوب دلوقتي.

**دخول الضيف (QR Code)**
- التسجيل الأساسي بإيميل وباسورد. الـ QR (لو استُخدم) بيفتح واجهة الضيف بس، ولازم الضيف يسجل دخول برضو.

---

## 3) ملف Integration Standards (الربط)

أضف القاعدة دي:
- الواجهة **متكلمش n8n مباشرة** أبدا. أي عملية موثوقة (تأكيد الحجز، Check-in/out، إسناد المهام، إدارة الموظفين، الشات الذكي، التقارير) بتعدي على Edge Function اسمها `workflow-gateway`.
- الأحداث اللي بتحصل بعد تغيير في الداتا (زي حجز جديد أو طلب جديد) بتتشغل بـ Database Webhook.
- الـ AI: **Gemini** عن طريق n8n بس، والمفتاح جوه n8n ومش في أي واجهة.

---

## 4) ملف UI Standards (التصميم)

أضف جدول ألوان الحالات (كل الموديولات تلتزم بيه):

| اللون | الحالات |
|---|---|
| أخضر | completed, confirmed, ready, resolved, available, checked_out |
| أصفر | pending, new |
| أزرق | in_progress, processing, assigned, classified, cleaning, checked_in |
| أحمر | cancelled, urgent, maintenance |
| برتقالي غامق | dirty |
| كحلي (اللون الأساسي) | occupied |
| رمادي | أي حاجة غير معروفة |

أسماء الحالات تفضل بالإنجليزي صغيرة زي ما هي في قاعدة البيانات، وتتترجم في الشاشة بس.

---

## القيم المعتمدة لكل الموديولات

| الحقل | القيم |
|---|---|
| حالة الحجز | pending, confirmed, checked_in, checked_out, cancelled |
| حالة الغرفة | available, occupied, dirty, cleaning, ready, maintenance |
| حالة الطلب | new, classified, processing, resolved, cancelled |
| حالة المهمة | pending, assigned, in_progress, completed, cancelled |
| الأولوية | low, normal, high, urgent |
| تصنيف الطلب | housekeeping, maintenance, room_service, complaint, other |
