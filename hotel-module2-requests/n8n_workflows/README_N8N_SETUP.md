# n8n Workflows Setup Guide — Module 2: Guest Requests & Feedback

Owner: Eyad Mostafa. AI model provider: Groq.

## Files
1. `HOTEL_M2_REQUEST_CLASSIFICATION.json`: classifies guest requests with Groq, applies deterministic business and safety rules, and updates `guest_requests` to `status = 'classified'`.
2. `HOTEL_M2_FEEDBACK_ANALYSIS.json`: derives sentiment from the rating when there is no comment, runs Groq on written comments, and updates `feedback.sentiment`.

---

## 1. Import Workflows into n8n

1. Open your n8n dashboard.
2. Click **Workflows**, then **Add Workflow**, then **Import from File**.
3. Import `HOTEL_M2_REQUEST_CLASSIFICATION.json`.
4. Repeat for `HOTEL_M2_FEEDBACK_ANALYSIS.json`.

---

## 2. Groq Credential and Model

1. In n8n, create a **Groq** credential and paste your API key from console.groq.com (it starts with `gsk_`).
2. In each workflow, open the **Groq Chat Model** node and select that credential. Re-importing a workflow resets this selection.
3. Model: `openai/gpt-oss-120b`. For a faster and cheaper option use `openai/gpt-oss-20b`. Groq retires models regularly, so if the node reports that the model does not exist, check the current list at console.groq.com/docs/models and replace the name.

---

## 3. Supabase Credentials

Both workflows write to Supabase through its REST API with the `service_role` key (Supabase Dashboard -> Project Settings -> API).

The exported files contain placeholders. After importing, open the first Code node of each workflow (`Validate Webhook Payload` or `Validate Feedback Payload`) and replace them:

```js
const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY';
```

The service_role key bypasses row-level security. Never commit it to the repository, and never put it in the frontend or in `.env`. Export workflows only after replacing the key with the placeholder again.

---

## 4. Configure Supabase Database Webhooks

In Supabase, go to **Database** -> **Webhooks**.

### Webhook 1: Request Classification
- **Name**: `HOTEL_M2_REQUEST_CLASSIFICATION`
- **Table**: `guest_requests`
- **Events**: `Insert` only
- **Method**: `POST`
- **URL**: `https://<your-n8n-host>/webhook/hotel-m2-request-classification`
- **Header**: `Content-Type: application/json`

### Webhook 2: Feedback Analysis
- **Name**: `HOTEL_M2_FEEDBACK_ANALYSIS`
- **Table**: `feedback`
- **Events**: `Insert` only
- **Method**: `POST`
- **URL**: `https://<your-n8n-host>/webhook/hotel-m2-feedback-analysis`
- **Header**: `Content-Type: application/json`

Use the Production URL from the Webhook node (it contains `/webhook/`, not `/webhook-test/`). The host must be reachable from the internet, for example a hosted n8n or an ngrok tunnel.

---

## 5. Activate and Test

1. Switch each workflow to **Active**.
2. Insert a `guest_requests` row with `status = 'new'` and a description such as "The AC is leaking water". It should become `classified` with category `maintenance` and priority `urgent`.
3. Insert a `feedback` row with a rating and an empty sentiment. The sentiment should be filled in.
4. If a row does not change, open the **Executions** tab in n8n. The red node shows where it failed.

---

## 6. Idempotency, Safety and Fallbacks

- **Idempotency**:
  - Classification runs only when `status = 'new'` and updates with `WHERE id = :id AND status = 'new'`, so duplicate webhooks never reclassify.
  - Feedback analysis runs only when `sentiment IS NULL` and updates with `WHERE id = :id AND sentiment IS NULL`.
- **Urgency override**: keywords such as leak, flood, fire, smoke, spark, electric, lockout, and their Arabic equivalents, always set `priority` to `urgent`.
- **Complaints**: priority is never below `normal`, and sentiment is always one of `positive`, `neutral` or `negative`. Non-complaint requests always get `sentiment = null`.
- **Model failure handling (classification)**: if Groq returns something that is not valid JSON, such as a refusal or an empty answer, the workflow does not fail. The category is inferred from English and Arabic keywords (default `other`), priority defaults to `normal`, and the summary is the guest's original text cut to 200 characters. The urgency and complaint rules still apply.
- **Model failure handling (feedback)**: if Groq returns invalid output or an unknown value, sentiment is derived from the rating (4-5 positive, 1-2 negative). For a rating of 3 the comment keywords decide, otherwise `neutral`.
- **Module 3 trigger**: when Module 2 sets `status = 'classified'`, Supabase fires the update webhook that triggers Module 3 (`HOTEL_M3_TASK_CREATION`). Module 2 never touches the `tasks` table.
