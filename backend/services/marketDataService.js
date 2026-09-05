import axios from "axios";
import StockSnapshot from "../models/StockSnapshot.js";
import ChangeEvent from "../models/ChangeEvent.js";
import { computeBaseScore } from "./scoringService.js";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min

/**
 * Fetches a live quote from Yahoo Finance's public chart endpoint.
 * No API key needed — good fit for a hackathon demo.
 * Symbol format for NSE stocks: "RELIANCE.NS", "TCS.NS", etc.
 */
async function fetchQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`;
  const { data } = await axios.get(url, { timeout: 8000 });
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const meta = result.meta;
  return {
    price: meta.regularMarketPrice,
    prevClose: meta.previousClose ?? meta.chartPreviousClose,
    dayHigh: meta.regularMarketDayHigh,
    dayLow: meta.regularMarketDayLow,
    week52High: meta.fiftyTwoWeekHigh,
    week52Low: meta.fiftyTwoWeekLow,
    volume: meta.regularMarketVolume
  };
}

/**
 * Refreshes one symbol's snapshot: fetch live data, update rolling
 * history, recompute avgVolume20d, and log a ChangeEvent if the
 * score crossed a meaningful threshold.
 */
async function fetchIndexQuote() {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI`;
  const { data } = await axios.get(url, { timeout: 8000 });
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error("No index data");
  return {
    price: meta.regularMarketPrice,
    prevClose: meta.previousClose ?? meta.chartPreviousClose
  };
}

async function refreshIndex() {
  let snapshot = await StockSnapshot.findOne({ symbol: "NIFTY50" });
  if (!snapshot) {
    snapshot = new StockSnapshot({ symbol: "NIFTY50", sector: "index", price: 0, prevClose: 0 });
  }
  try {
    const quote = await fetchIndexQuote();
    snapshot.price = quote.price;
    snapshot.prevClose = quote.prevClose;
    snapshot.isStale = false;
    snapshot.fetchedAt = new Date();
    await snapshot.save();
  } catch (err) {
    console.error("[marketData] failed to refresh index:", err.message);
  }
  return snapshot;
}
async function refreshSymbol(symbol, sector) {
  let snapshot = await StockSnapshot.findOne({ symbol });
  if (!snapshot) {
    snapshot = new StockSnapshot({ symbol, sector, price: 0, prevClose: 0 });
  }

  try {
    const quote = await fetchQuote(symbol);
    snapshot.price = quote.price;
    snapshot.prevClose = quote.prevClose;
    snapshot.dayHigh = quote.dayHigh;
    snapshot.dayLow = quote.dayLow;
    snapshot.week52High = quote.week52High;
    snapshot.week52Low = quote.week52Low;
    snapshot.volume = quote.volume;

    snapshot.history.push({ price: quote.price, at: new Date() });
    if (snapshot.history.length > 30) snapshot.history.shift();

    // simple rolling average volume proxy from history length we have
    const volumes = snapshot.history.length;
    snapshot.avgVolume20d = snapshot.avgVolume20d
      ? snapshot.avgVolume20d * 0.9 + quote.volume * 0.1
      : quote.volume;

    snapshot.isStale = false;
    snapshot.fetchedAt = new Date();
    await snapshot.save();

    const { score, reason, eventType } = computeBaseScore(snapshot);
    if (score >= 1.5) {
      await ChangeEvent.create({
        symbol,
        type: eventType,
        score,
        reason,
        priceAtEvent: snapshot.price
      });
    }
  } catch (err) {
    // Upstream failed — serve last known snapshot but flag it stale.
    snapshot.isStale = true;
    await snapshot.save();
    console.error(`[marketData] failed to refresh ${symbol}:`, err.message);
  }

  return snapshot;
}

/**
 * Read path used by API routes — returns cached data immediately,
 * never blocks a request on a live fetch. If the cache is older than
 * the stale threshold, it's marked isStale but still served
 * (stale-while-revalidate — the cron job handles revalidation).
 */
async function getSnapshot(symbol) {
  const snapshot = await StockSnapshot.findOne({ symbol });
  if (!snapshot) return null;
  const age = Date.now() - new Date(snapshot.fetchedAt).getTime();
  if (age > STALE_THRESHOLD_MS) snapshot.isStale = true;
  return snapshot;
}

export { refreshSymbol, refreshIndex, getSnapshot, fetchQuote };
