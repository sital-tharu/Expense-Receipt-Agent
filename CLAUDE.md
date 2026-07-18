@AGENTS.md

# Expense & Receipt Agent

Personal AI agent that turns scattered receipts (photos + email) into a weekly
spending dashboard — auto-categorizing expenses and flagging recurring
subscriptions. Solo hackathon build for the **AI Agent Builder Series 2026
Grand Finale** (submission due **5 Aug 2026** at app.hidevs.xyz/nominate/google).
Optimize for a strong, clear demo over production robustness.

## Commands

- `npm run dev` — start dev server (localhost:3000)
- `npm run build` / `npm run start` — production build/serve
- `npm run lint` — ESLint
- `npm run test:extract -- samples/<file>` — run Gemini extraction on a receipt image and save to Firestore
- `npm run seed` — seed mock historical receipts (for demoing subscription detection)

## Architecture

- **Next.js 16 App Router + TypeScript + Tailwind v4**, `src/` dir, `@/*` alias.
- **Extraction**: Gemini multimodal via `@google/genai` (`src/lib/gemini.ts` holds the client + `GEMINI_MODEL` constant; `src/lib/extract.ts` does image → structured JSON via `responseJsonSchema`, validated with zod).
  Model is pinned to `gemini-3.1-flash-lite` (~2s/receipt, accurate): `gemini-2.5-flash`
  404s for new API keys and `gemini-3.5-flash` times out (headers never arrive) on the
  free tier as of Jul 2026. If extraction hangs or 404s, probe model latency first.
- **Storage**: Firestore via `firebase-admin`, **server-side only** (no client SDK, no security rules). Init + queries in `src/lib/firestore.ts`. Receipts live in the `receipts` collection; raw images (base64, ≤700KB) in `receiptImages/{receiptId}` — a deliberate demo-grade choice to avoid the Blaze plan Firebase Storage needs. Served by `GET /api/receipts/[id]/image`. Receipt docs carry `hasImage` and provenance (`source` + `seeded`).
- **Schema** (`src/lib/types.ts`): `merchant`, `date` (YYYY-MM-DD), `total` (number, INR), `lineItems: {name, price}[]` (often **empty** — see below), `category` (one of `Food, Transport, Subscriptions, Shopping, Utilities, Other`), `confidence` (`high | low`, model self-assessment → "Needs review" badge), plus `source: 'photo' | 'email'` and `createdAt` on stored docs.
- **Gmail intake**: dependency-free OAuth + REST (`src/lib/gmail-auth.ts`, `src/lib/gmail.ts`). Read-only scope; reads the `receipts` label (`GMAIL_LABEL`); refresh token stored in Firestore `config/gmailToken` (serverless-safe; legacy `secrets/gmail-token.json` auto-migrates); dedup via `processedEmails/{messageId}` with stale-marker recovery. On public deploys, `GMAIL_ROUTES_SECRET` is the single **owner passcode** (`src/lib/owner.ts` server, `src/lib/owner-key.ts` client, `x-owner-key` header): it gates Gmail connect/sync, saving uploads, and deleting receipts (`DELETE /api/receipts/[id]`; deleted email receipts flag their `processedEmails` marker so sync won't reimport). Unset locally = all open. Visitors get read-only dashboard + try-it extraction (nothing stored). Image attachments reuse the multimodal path (+ stored image); HTML/text bodies go through `extractReceiptFromText`. Sync is triggered by the dashboard button → `POST /api/gmail/sync`.
- **Dashboard**: fully server-rendered. `?week=YYYY-MM-DD` (Monday) navigates weeks, `?cat=` filters the table — helpers in `src/lib/urls.ts`. Category bars are a CSS bar list (`src/components/CategoryBars.tsx`, no chart lib); per-category colors are CSS vars in `globals.css` (validated palette — keep text labels on anything colored). Anomaly detection (`categoryAnomaly` in `src/lib/stats.ts`): week vs 4-week average, ≥1.3×, ₹200 baseline floor — all three tunable via `ANOMALY_MIN_AVG` / `ANOMALY_THRESHOLD` / `ANOMALY_LOOKBACK_WEEKS` env vars or a per-call opts param. UI shows a multiplier ("5.2× your usual") for ≥2× spikes, percent below that.
- **Subscription detection** (`src/lib/subscriptions.ts`): rule-based — same merchant, ~monthly cadence (±5 days), similar amount (±10%).

## Important context

- **npm scripts must call JS entry points via `node node_modules/...` directly**
  (e.g. `node node_modules/next/dist/bin/next dev`). The local project path
  contains `&`, which breaks npm's Windows `.cmd` shims — never rely on
  `node_modules/.bin` names in package.json scripts.

- Test data is **Google Pay transaction screenshots**, not paper receipts:
  merchant = UPI payee name, line items usually absent, amounts in ₹.
  The extraction prompt is tuned for this — keep it working for both cases.
- **Never commit**: `.env.local`, `secrets/` (Firebase service account JSON),
  `samples/` (personal financial screenshots). All are gitignored.
- Currency: totals are stored in INR. Foreign-currency receipts keep `originalAmount`/`originalCurrency`; `total` is recomputed in code (`applyExchangeRate` in `src/lib/extract.ts`) from `EXCHANGE_RATE_<ISO>` env vars (`src/lib/rates.ts`, USD/EUR/GBP fallbacks). Rates apply at extraction time only — never retroactively.
- GitHub remote: https://github.com/sital-tharu/Expense-Receipt-Agent.git — commit and push after each working milestone.

## Environment (.env.local)

```
GEMINI_API_KEY=            # aistudio.google.com/apikey
FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/serviceAccount.json
```

See PLAN.md for the full feature roadmap and submission requirements.
