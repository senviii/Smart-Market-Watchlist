import cron from "node-cron";
import Holding from "../models/Holding.js";
import WatchlistItem from "../models/WatchlistItem.js";
import { refreshSymbol, refreshIndex } from "./marketDataService.js";

const SECTOR_MAP = {
  RELIANCE: "energy",
  TCS: "it",
  INFY: "it",
  HDFCBANK: "banking",
  SBIN: "banking",
  ICICIBANK: "banking",
  TATASTEEL: "metal",
  MARUTI: "auto",
  HINDUNILVR: "fmcg",
  SUNPHARMA: "pharma"
};

async function getAllTrackedSymbols() {
  const [holdingSymbols, watchlistSymbols] = await Promise.all([
    Holding.distinct("symbol"),
    WatchlistItem.distinct("symbol")
  ]);
  return [...new Set([...holdingSymbols, ...watchlistSymbols])];
}

async function pollOnce() {
  const symbols = await getAllTrackedSymbols();
  await refreshIndex();
  if (symbols.length === 0) return;
  console.log(`[poller] refreshing ${symbols.length} symbols`);
  // batched sequentially with small stagger to be gentle on the free API
  for (const symbol of symbols) {
    await refreshSymbol(symbol, SECTOR_MAP[symbol] || "unknown");
  }
}

function startPolling(intervalSeconds = 60) {
  // run once immediately on boot
  pollOnce().catch((e) => console.error("[poller] initial run failed", e));

  const cronExpr = `*/${Math.max(1, Math.round(intervalSeconds / 60))} * * * *`;
  cron.schedule(cronExpr, () => {
    pollOnce().catch((e) => console.error("[poller] scheduled run failed", e));
  });
}

export { startPolling, pollOnce, SECTOR_MAP };
