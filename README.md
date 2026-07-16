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
3. **Dashboard updates** — weekly spend total, spend-by-category chart, and a
   recent receipts list, live from Firestore.
4. **Subscriptions get flagged** — same merchant + similar amount recurring
   ~monthly triggers a flag like *"Netflix — ₹649/mo, 3 months in a row"*.

## Tech stack

| Layer | Choice |
|---|---|
| Extraction & categorization | Gemini (multimodal, structured output) via `@google/genai` |
| Storage | Firebase Firestore (`firebase-admin`, server-side) |
| App | Next.js 16 (App Router) + TypeScript + Tailwind |
| Charts | Recharts |
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

5. **Run**

   ```bash
   npm run dev          # app at http://localhost:3000
   ```

   Test extraction from the command line with any receipt image:

   ```bash
   npm run test:extract -- samples/my-receipt.png
   ```

## Project status

- [x] Project scaffold (Next.js + Firestore + Gemini wiring)
- [ ] Extraction pipeline (image → structured JSON → Firestore)
- [ ] Photo upload flow
- [ ] Weekly dashboard (totals, category chart, recent receipts)
- [ ] Subscription detection
- [ ] Gmail intake

---

*`secrets/`, `samples/`, and `.env.local` are gitignored — receipts are
personal financial data and never leave your machine except to the Gemini API
and your own Firestore.*
