# 🧾 Expense & Receipt Agent

A personal AI agent that turns scattered receipts — photos, screenshots, and
emails — into a clean weekly spending dashboard. It automatically extracts and
categorizes every expense with Gemini's multimodal API, and flags forgotten
recurring subscriptions before they quietly drain your account.

> 🏆 Built for the **AI Agent Builder Series 2026 — Grand Finale Hackathon**
> (AI House × Google for Developers, Bengaluru)

## What it does

1. **Drop in a receipt** — upload a photo/screenshot (Google Pay transaction
   screenshots work great), or forward a receipt email.
2. **Gemini reads it** — merchant, date, total, and line items are extracted
   as structured data and auto-categorized (Food, Transport, Subscriptions,
   Shopping, Utilities, Other).
3. **Dashboard updates** — weekly spend total with week-over-week delta,
   color-coded spend-by-category bars, and the week's receipts, live from
   Firestore. Flip between past weeks with the week navigator, and click a
   category bar to filter the receipt list.
4. **Subscriptions get flagged** — same merchant + similar amount recurring
   ~monthly triggers a flag like *"Netflix — ₹649/mo, 3 months in a row"*,
   plus a combined "₹1,067/mo in subscriptions" callout.
5. **It reasons about your spending — and shows its work** — anomaly detection
   compares each category against your 4-week average (*"Food spend is 40%
   above your usual weekly average"*) with the baseline and formula one click
   away; every extraction carries a confidence self-assessment ("Needs review"
   badge when unsure); and each receipt keeps its provenance with a link back
   to the original image.

## Tech stack

| Layer | Choice |
|---|---|
| Extraction & categorization | Gemini (multimodal, structured output) via `@google/genai` |
| Storage | Firebase Firestore (`firebase-admin`, server-side) |
| App | Next.js 16 (App Router) + TypeScript + Tailwind |
| Email intake | Gmail API |

## Setup

1. **Clone & install**

   ```bash
   git clone https://github.com/sital-tharu/Expense-Receipt-Agent.git
   cd Expense-Receipt-Agent
   npm install
   ```

2. **Firebase** — create a project at [console.firebase.google.com](https://console.firebase.google.com),
   enable **Cloud Firestore**, then *Project settings → Service accounts →
   Generate new private key*. Save the JSON as `secrets/serviceAccount.json`.

3. **Gemini API key** — create one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

4. **Environment** — copy `.env.example` to `.env.local` and fill in:

   ```
   GEMINI_API_KEY=your-key
   FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/serviceAccount.json
   ```

5. **Gmail intake (optional)** — lets the agent pull receipts straight from
   your inbox:
   1. In [console.cloud.google.com](https://console.cloud.google.com), select
      the same project as your Firebase app → *APIs & Services → Library* →
      enable **Gmail API**.
   2. *APIs & Services → OAuth consent screen* → External → fill the app name,
      add your own Gmail as a **test user**.
   3. *APIs & Services → Credentials → Create credentials → OAuth client ID* →
      type **Web application** → authorized redirect URI
      `http://localhost:3000/api/gmail/callback`. Copy the client ID and
      secret into `.env.local` (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`).
   4. In Gmail, create a label named **receipts** and apply it to the emails
      you want imported (or add a filter that does it automatically).
   5. In the app, click **Connect Gmail** → approve read-only access → click
      **Sync inbox**. Already-imported emails are skipped on every re-sync.

6. **Run**

   ```bash
   npm run dev          # app at http://localhost:3000
   ```

## Deploying to Vercel (free)

1. Push the repo to GitHub, then in [vercel.com](https://vercel.com) → *Add New →
   Project* → import the repo (defaults are fine — Next.js is auto-detected).
2. Under *Environment Variables*, add:
   - `GEMINI_API_KEY`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — the **entire** `serviceAccount.json`
     pasted as one value (used instead of the file path)
   - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`
   - `GMAIL_ROUTES_SECRET` — any passcode; required to connect/sync Gmail on
     the public URL (the dashboard itself stays open)
   - `EXCHANGE_RATE_USD` (and any other rates you use)
3. In the Google Cloud console → your OAuth client → add a second authorized
   redirect URI: `https://<your-app>.vercel.app/api/gmail/callback`.
4. Deploy. On the live site, click **Connect Gmail**, enter your passcode,
   approve — the token is stored in Firestore, so it survives deployments.

## Useful scripts

| Command | What it does |
|---|---|
| `npm run test:extract -- samples/<image>` | Extract a receipt image from the CLI and save it to Firestore (`--dry-run` to skip the write) |
| `npm run seed` | Seed mock receipt history for the demo (`-- --wipe` clears previously seeded docs first) |
| `npm run test:logic` | Regression checks for subscription detection & weekly stats (no credentials needed) |

## Project status

- [x] Project scaffold (Next.js + Firestore + Gemini wiring)
- [x] Extraction pipeline (image → structured JSON → Firestore)
- [x] Photo upload flow
- [x] Weekly dashboard (totals, category chart, recent receipts)
- [x] Subscription detection (rule-based: ~monthly cadence, ±10% amount)
- [x] Gmail intake (label-based, read-only, HTML bodies + image attachments)

---

*`secrets/`, `samples/`, and `.env.local` are gitignored — receipts are
personal financial data and never leave your machine except to the Gemini API
and your own Firestore.*
