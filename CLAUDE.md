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
- **Extraction**: Gemini multimodal via `@google/genai` (`src/lib/gemini.ts` holds the client + `MODEL` constant; `src/lib/extract.ts` does image → structured JSON via `responseSchema`, validated with zod).
- **Storage**: Firestore via `firebase-admin`, **server-side only** (no client SDK, no security rules). Init + queries in `src/lib/firestore.ts`. Receipts live in the `receipts` collection.
- **Schema** (`src/lib/types.ts`): `merchant`, `date` (YYYY-MM-DD), `total` (number, INR), `lineItems: {name, price}[]` (often **empty** — see below), `category` (one of `Food, Transport, Subscriptions, Shopping, Utilities, Other`), plus `source: 'photo' | 'email'` and `createdAt` on stored docs.
- **Dashboard**: server components fetch from Firestore; charts use Recharts.
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
- Currency is INR-only by design (confirmed decision — no currency field).
- GitHub remote: https://github.com/sital-tharu/Expense-Receipt-Agent.git — commit and push after each working milestone.

## Environment (.env.local)

```
GEMINI_API_KEY=            # aistudio.google.com/apikey
FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/serviceAccount.json
```

See PLAN.md for the full feature roadmap and submission requirements.
