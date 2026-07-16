# Expense & Receipt Agent — Build Plan

**Event**: AI Agent Builder Series 2026 — Grand Finale Hackathon
Powered by AI House × Google for Developers
**Venue**: Google Office, Bengaluru (Ananta campus)
**Finale Date**: Saturday, 8 August 2026, 9 AM IST
**Submission Deadline**: 5 August 2026, 11:59 PM
**Submit at**: https://app.hidevs.xyz/nominate/google

---

## 1. Project Goal

A personal AI agent that turns scattered receipts (photo + email) into a clean
weekly spending dashboard — automatically categorizing expenses and flagging
forgotten recurring subscriptions. Built as a solo demo/build for the hackathon.

**Track**: Open Innovation / Bring your own challenge

---

## 2. Target User

Just me (personal use / demo). Not building for external users — optimize for
a strong, clear demo over production robustness.

---

## 3. Core Features (v1 scope)

1. **Photo upload** — upload a receipt image in the web app
2. **Email intake** — forward receipts to a dedicated Gmail address; agent
   pulls and parses them
3. **Extraction (Gemini multimodal)** — pulls structured data per receipt:
   - Merchant
   - Date
   - Total amount
   - Line items
   - Category
4. **Categorization** — Gemini assigns a category from a fixed list (e.g.
   Food, Transport, Subscriptions, Shopping, Utilities, Other)
5. **Storage** — Firebase Firestore
6. **Dashboard** — Next.js + Recharts:
   - Total spend this week
   - Spend by category (chart)
   - Recent receipts list
7. **Subscription detection** — rule-based: same merchant + similar amount
   recurring ~monthly → flag as a subscription (e.g. "Netflix — ₹649/mo,
   3 months in a row")

### Stretch goals (only if time allows)
- Conversational Q&A box ("How much did I spend on food this week?")
- Week-over-week trend chart
- Auto-email weekly summary

---

## 4. Tech Stack

| Layer | Choice |
|---|---|
| Extraction | Gemini API (multimodal — images + text) |
| Email intake | Gmail API (dedicated forwarding address/label) |
| Storage | Firebase Firestore |
| Frontend | Next.js + Recharts |
| Hosting | Vercel |

---

## 5. Decisions (confirmed 16 Jul 2026)

- [x] Core schema only: merchant, date, total, line items, category (INR assumed, no currency/tax fields)
- [x] Test data: Google Pay transaction screenshots (line items usually absent)
- [x] Firestore via firebase-admin, server-side only
- [x] Build in phases by dependency order, not day-by-day
- [ ] Dedicated Gmail alias vs. main email + filter/label for receipt forwarding
- [ ] Gmail API OAuth consent setup (deferred to Phase 6)
- [ ] Subscription "similar amount" tolerance — starting at ±10%
- [ ] Seed/mock historical data for subscription demo — yes, via `npm run seed`

---

## 6. Build Phases

- **Phase 0**: Scaffold Next.js + git repo + docs, push to GitHub ✅
- **Phase 1**: Credentials — Firebase project + Firestore + service account; Gemini API key
- **Phase 2**: Extraction pipeline (Gemini → zod → Firestore) + CLI test script
- **Phase 3**: Photo upload flow (API route + upload page)
- **Phase 4**: Dashboard — weekly total, category chart (Recharts), recent receipts
- **Phase 5**: Subscription detection + seed data
- **Phase 6**: Gmail intake (OAuth consent, forward → parse → same pipeline)
- **Then**: polish, demo video, submission copy, gather votes

---

## 7. Submission Requirements

Submission is a 3-step form on app.hidevs.xyz/nominate/google:

1. **About you** — builder/contact info
2. **Your agent** — project name, description, tech stack
3. **Links & demos**:
   - Demo video
   - GitHub repo (public, clean README, clear setup instructions)
   - Problem statement & pitch

**Scoring**: Analysis 50% + Votes 25% + Feedback 25%
**Public voting page**: auto-generated instantly on submission — share it to
gather votes toward the Top 100 cutoff.
