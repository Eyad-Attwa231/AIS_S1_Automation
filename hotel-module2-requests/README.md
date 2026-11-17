# Hotel Management System: Module 2, Guest Requests & Feedback

**Owner:** Eyad Mostafa (إياد مصطفى)
**Stack:** React 18, Vite, Tailwind (CDN), Supabase (Auth, Postgres, Webhooks), n8n, Groq

## 1. What this module does

Guests submit service requests, complaints and feedback. Supabase database webhooks call two n8n workflows that classify each request and analyse each feedback entry with Groq, then write the result back. Module 3 picks up rows once they are `classified`.

**Frontend (bilingual Arabic / English with RTL and LTR):**
- **Create Request:** category selection, room selection (the current booking is pre-selected), and an English prefix `[Guest selected: <type>]` added to the description. The browser inserts only `guest_id`, `room_id` and `description`.
- **My Requests:** search, filters (status, category, priority), pagination, detail drawer, "Classification pending" until n8n has classified the row.
- **Complaints:** complaint list with priority and sentiment ("Analysis pending" while sentiment is null).
- **Feedback & Rating:** 1 to 5 stars, optional comment, optional booking link, sentiment filled in by n8n.
- **Auth:** Supabase email and password. The guest id is resolved with `guests.profile_id = auth.uid()`.
- **Roles:** guests see only their own data. Users with role `admin` or `employee` get a read-only staff view of every guest's requests, complaints and feedback, without the Create Request tab, the complaint button or the feedback form.

**n8n workflows (`n8n_workflows/`):**
- `HOTEL_M2_REQUEST_CLASSIFICATION.json`: runs on INSERT into `guest_requests`, proceeds only if `status = 'new'`, asks Groq for category, priority, summary and sentiment, validates the enums, applies safety rules (leak, flood, fire, smoke, spark, electric, lockout and Arabic equivalents force `urgent`; complaints are never below `normal`; only complaints carry a sentiment), then updates the row with `status = 'classified'`. If the model answer is not valid JSON, keyword rules are used instead and the workflow still completes.
- `HOTEL_M2_FEEDBACK_ANALYSIS.json`: runs on INSERT into `feedback`. Without a comment the sentiment comes from the rating (4 to 5 positive, 3 neutral, 1 to 2 negative). With a comment Groq decides, and the rating and comment keywords are the fallback. The update only applies where `sentiment IS NULL`.

## 2. Project structure

```
.
├── n8n_workflows/
│   ├── HOTEL_M2_REQUEST_CLASSIFICATION.json
│   ├── HOTEL_M2_FEEDBACK_ANALYSIS.json
│   └── README_N8N_SETUP.md
├── src/
│   ├── components/
│   │   ├── AuthModal.jsx
│   │   ├── Complaints.jsx
│   │   ├── CreateRequest.jsx
│   │   ├── FeedbackRating.jsx
│   │   ├── MyRequests.jsx
│   │   ├── StatusBadge.jsx
│   │   └── TopNavbar.jsx
│   ├── App.jsx
│   ├── i18n.js
│   ├── main.jsx
│   └── supabaseClient.js
├── scripts/
│   └── build-preview.mjs
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── preview.html
└── vite.config.js
```

## 3. Run the frontend

Requires Node.js 18 or newer.

```bash
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell use `Copy-Item .env.example .env`. Edit `.env` and set:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Open http://localhost:5173. Restart `npm run dev` after changing `.env`. If the variables are missing the app shows "The service is temporarily unavailable".

Only the publishable (anon) key belongs in the frontend.

### Standalone preview (no install)

`preview.html` is the same app as one self-contained file, so it can be opened by double-clicking it in a browser. It is generated from `src/` and contains the project URL and publishable key from `.env`. After changing anything in `src/`, regenerate it:

```bash
npm run build:preview
```

## 4. Set up n8n

Follow `n8n_workflows/README_N8N_SETUP.md`: import both workflows, select the Groq credential on each Groq Chat Model node, replace the Supabase placeholders in the first Code node of each workflow, create the two Supabase database webhooks (INSERT only), and activate the workflows. The webhook URLs must be reachable from the internet.

## 5. Roles and test accounts

New sign-ups become guests through the database trigger that creates their `profiles` and `guests` rows. To create a staff account, sign up normally, then set `role` to `admin` (or `employee`) on that user's row in the `profiles` table and sign in again. An admin only sees other guests' rows if the row-level security policies on `guest_requests` and `feedback` allow it.

## 6. Security

- `.env` is ignored by git. Do not commit it.
- The `service_role` key is used only inside n8n and must never appear in this repository. The workflow files contain placeholders.
- `preview.html` embeds the publishable key on purpose. It is safe to expose because row-level security protects the data, but regenerate the file if the key changes.

## 7. Verification checklist

- [ ] The browser inserts only `guest_id`, `room_id` and `description` into `guest_requests`.
- [ ] The prefix `[Guest selected: ...]` is in English.
- [ ] A new request goes from "Classification pending" to `classified` with category, priority and an AI summary.
- [ ] "The AC is leaking water" is classified as `maintenance` with `urgent` priority.
- [ ] Complaints are never below `normal` priority and have a sentiment; other categories have `sentiment = null`.
- [ ] Feedback without a comment gets a sentiment from the rating; feedback with a comment gets one from Groq.
- [ ] A duplicate webhook delivery does not change an already classified row.
- [ ] A refusal or invalid answer from the model still produces a classified row.
- [ ] Admin and employee accounts see the staff view and cannot create requests.
- [ ] Module 3 picks up rows with `status = 'classified'`.
