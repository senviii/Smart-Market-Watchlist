# Smart Market Watchlist

**100-word pitch**: Most watchlists just show numbers — this one tells you what's actually worth your attention. Every stock gets a market-relative, volatility-normalized "meaningful-change" score (a move is judged against both the stock's own typical volatility *and* the day's Nifty move) instead of a flat % threshold. Holdings surface first, but market-watch stocks are never suppressed — only contextualized. A feedback loop learns per-user, per-event-type engagement from clicks/dismissals, personalizing future scores. A plain-English digest explains *why* things moved, backed by stale-while-revalidate caching and a single-poller architecture that scales without hammering the market API. Built end-to-end: React frontend, Express/MongoDB backend, live NSE data.

A watchlist that surfaces *what changed and why it matters*, instead of a flat list of prices.

## Core idea

Three-layer relevance:
1. **Base meaningful-change score** — volatility-normalized (a 2% move on a low-vol stock scores higher than 2% on a volatile one) *and* market-relative (a stock moving with the whole Nifty isn't as meaningful as one moving against it) — combined with volume-spike detection and 52-week breakout detection. Every tracked stock gets this fairly, whether it's a holding or not.
2. **Portfolio context** — a non-suppressing boost that tags holdings correlated with other sector moves ("also affects your SBI holding"). It never hides a stock, only adds explanation.
3. **Personalized feedback loop** — every card click (genuine interest) or dismiss (not interested) is logged per event type (`price_move`, `volume_spike`, `breakout_high/low`). Over time, a user who consistently engages with volume-spike alerts but ignores plain price moves gets volume spikes weighted higher for them — a running click/dismiss ratio, not a black-box model. Cold start is safe: under 3 interactions for an event type, the multiplier stays neutral (1.0).

Holdings are shown first (your actual money), market-watch stocks below — but nothing is hidden, and scores decay over time (exponential half-life) so a 3-day-old spike doesn't stay "urgent" forever.

## Stack

- **Backend**: Node.js, Express, MongoDB (Mongoose), node-cron for polling
- **Frontend**: React + Vite (no UI framework — hand-styled to keep bundle light)
- **Market data**: Yahoo Finance public chart endpoint (no API key needed), symbol format `SYMBOL.NS` for NSE stocks, `^NSEI` for the Nifty 50 benchmark
- **Narrative digest**: optional Claude API call for a plain-English summary; falls back to a rule-based template if no key is set — the feature degrades gracefully instead of breaking the demo

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# make sure MongoDB is running locally, or set MONGO_URI to Atlas
# ANTHROPIC_API_KEY is optional — narrative digest falls back to a template without it
npm run seed        # creates a demo user + seeded holdings/watchlist, prints userId
npm run dev          # starts server on :5000 and the polling cron job
```

Copy the printed `userId` from the seed step — it's also hardcoded as `DEMO_USER_ID` in the frontend for this demo (see "What's demo-simplified" below).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev          # starts on :5173, proxies /api to :5000
```

If you re-seed and get a new userId, update `DEMO_USER_ID` in `frontend/src/pages/Dashboard.jsx`, `StockCard.jsx`, and `AddStock.jsx`.

Open `http://localhost:5173`.

## Features

- **Add/remove stocks** from the watchlist (minimum requirement: "create and manage")
- **Two-tier view**: your holdings (priority) vs. market watch
- **"What changed since last visit"**: `lastSeenAt` timestamp per user diffed against snapshot `fetchedAt`, surfaced as an `isNew` pulse indicator
- **Dismiss** (not full removal) — a lightweight per-card "less like this" signal that feeds the feedback loop without deleting the stock from the watchlist
- **Expand-on-click** cards reveal price, raw score, and sector-correlation context
- **Loading skeletons and an empty state** instead of a blank screen or spinner-only UX

## How "meaningful change" is scored

See `backend/services/scoringService.js` — fully commented with the reasoning behind each weight and the fairness trade-off around portfolio context. The feedback loop lives in `backend/services/feedbackService.js`.

## Design decisions worth defending

- **Stale-while-revalidate caching**: the backend polls once per interval and serves all users from cache — never blocks a request on a live upstream call. Snapshots are flagged `isStale` if they're older than 5 minutes, and the UI shows this transparently rather than pretending data is always live.
- **One poller, not per-user polling**: avoids hammering the free market data API and scales independently of user count. The Nifty benchmark is refreshed in the same cycle.
- **Time-decayed scores**: an event's urgency halves every 6 hours, so the digest reflects what's fresh, not a lifetime high-water mark.
- **Fairness in scoring**: portfolio correlation only adds a contextual tag, never boosts/suppresses the base score — a stock the user is "just tracking" gets the same fair shot at being flagged as a stock they hold. The feedback loop follows the same principle: an under-engaged event type's weight floors at 0.6, never zero — it's deprioritized, not silenced.
- **Divide-by-zero / invalid-symbol resilience**: a newly added or invalid symbol has no price data yet; the scorer and the API route both guard against this (skipped until a valid snapshot exists) instead of returning `NaN`/crashing the UI.
- **Graceful LLM degradation**: the narrative digest calls Claude if a key is configured, and falls back to a deterministic template on any failure (missing key, rate limit, timeout) — the feature never breaks the core experience.

## What's demo-simplified (and why)

- Holdings are seeded (`seed.js`) rather than pulled from a real brokerage — but all price/volume/volatility data is **live** from Yahoo Finance.
- Sector mapping is a small hardcoded table (`pollScheduler.js`) rather than a full sector-classification service — reasonable trade-off for a demo-sized watchlist. Symbols added at runtime default to `sector: "unknown"` until manually mapped.
- Auth is skipped (single hardcoded demo user) — the schema already supports multi-user via `userId` on every collection (`Holding`, `WatchlistItem`, `Interaction` all key on it), so adding real auth is additive, not a rewrite.
- Newly added symbols appear after the next poll cycle (up to 60s), since scoring requires at least one successful price fetch — this is a deliberate simplicity trade-off over triggering an immediate on-demand fetch per add.