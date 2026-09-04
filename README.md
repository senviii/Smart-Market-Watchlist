# Smart Market Watchlist
Most watchlists just show numbers whereas this one tells you what's actually worth our attention. Every stock gets a volatility-normalized "meaningful-change" score instead of a flat % threshold, so a 2% move on a calm stock ranks higher than 2% on a naturally volatile one. Holdings surface first where supposedly our money matters most but market-watch stocks are never suppressed, only contextualized (e.g., "correlated with your SBI holding"). A plain-English digest explains *why* things moved, backed by a stale-while-revalidate cache and single-poller architecture so it scales without hammering the market API. Built end-to-end: React frontend, Express/MongoDB backend, live NSE data.

A watchlist that surfaces *what changed and why it matters*, instead of a flat list of prices.

## Core idea

Two-layer relevance:
1. **Base meaningful-change score** — universal, volatility-normalized (a 2% move on a low-vol stock scores higher than 2% on a volatile one), combined with volume-spike detection and 52-week breakout detection. Every tracked stock gets this fairly, whether it's a holding or not.
2. **Portfolio context** — a non-suppressing boost that tags holdings correlated with other sector moves ("also affects your SBI holding"). It never hides a stock, only adds explanation.

Holdings are shown first (your actual money), market-watch stocks below — but nothing is hidden, and scores decay over time (exponential half-life) so a 3-day-old spike doesn't stay "urgent" forever.

## Stack

- **Backend**: Node.js, Express, MongoDB (Mongoose), node-cron for polling
- **Frontend**: React + Vite (no UI framework — hand-styled to keep bundle light)
- **Market data**: Yahoo Finance public chart endpoint (no API key needed), symbol format `SYMBOL.NS` for NSE

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# make sure MongoDB is running locally, or set MONGO_URI to Atlas
npm run seed        # creates a demo user + seeded holdings/watchlist, prints userId
npm run dev          # starts server on :5000 and the polling cron job
```

Copy the printed `userId` from the seed step.

### 2. Frontend

```bash
cd frontend
npm install
echo "VITE_DEMO_USER_ID=<paste the userId here>" > .env
npm run dev          # starts on :5173, proxies /api to :5000
```

Open `http://localhost:5173`.

## How "meaningful change" is scored

See `backend/services/scoringService.js` — fully commented with the reasoning behind each weight and the fairness trade-off around portfolio context.

## Design decisions worth defending

- **Stale-while-revalidate caching**: the backend polls once per interval and serves all users from cache — never blocks a request on a live upstream call. Snapshots are flagged `isStale` if they're older than 5 minutes, and the UI shows this transparently rather than pretending data is always live.
- **One poller, not per-user polling**: avoids hammering the free market data API and scales independently of user count.
- **Time-decayed scores**: an event's urgency halves every 6 hours, so the "digest" reflects what's fresh, not a lifetime high-water mark.
- **Fairness in scoring**: portfolio correlation only adds a contextual tag, never boosts/suppresses the base score — a stock the user is "just tracking" gets the same fair shot at being flagged as a stock they hold.

## What's demo-simplified (and why)

- Holdings are seeded (`seed.js`) rather than pulled from a real brokerage — but all price/volume/volatility data is **live** from Yahoo Finance.
- Sector mapping is a small hardcoded table (`pollScheduler.js`) rather than a full sector-classification service — reasonable trade-off for a 10-stock demo watchlist.
- Auth is skipped (single demo user) — the schema already supports multi-user via `userId` on every collection, so adding real auth is additive, not a rewrite.
