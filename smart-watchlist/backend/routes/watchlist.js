import express from "express";
import Holding from "../models/Holding.js";
import WatchlistItem from "../models/WatchlistItem.js";
import StockSnapshot from "../models/StockSnapshot.js";
import ChangeEvent from "../models/ChangeEvent.js";
import { computeBaseScore, computeSectorContext, timeDecay } from "../services/scoringService.js";
import { generateDigestNarrative } from "../services/narrativeService.js";

const router = express.Router();

/**
 * GET /api/watchlist/:userId
 * Returns the two-tier view: holdings (priority) + market watch.
 * Each item carries a decayed meaningful-change score, a reason,
 * an isNew flag (changed since lastSeenAt), and staleness info.
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [holdings, watchlistItems] = await Promise.all([
      Holding.find({ userId }),
      WatchlistItem.find({ userId })
    ]);

    const holdingSymbols = holdings.map((h) => h.symbol);
    const watchSymbols = watchlistItems.map((w) => w.symbol);
    const allSymbols = [...new Set([...holdingSymbols, ...watchSymbols])];

    const snapshots = await StockSnapshot.find({ symbol: { $in: allSymbols } });
    const snapshotMap = Object.fromEntries(snapshots.map((s) => [s.symbol, s]));

    const buildItem = async (symbol, isHolding) => {
      const snap = snapshotMap[symbol];
      if (!snap) return null;

      const base = computeBaseScore(snap);
      const latestEvent = await ChangeEvent.findOne({ symbol }).sort({ createdAt: -1 });
      const decayedScore = latestEvent ? timeDecay(latestEvent.score, latestEvent.createdAt) : base.score;

      const watchItem = watchlistItems.find((w) => w.symbol === symbol);
      const isNew = watchItem ? new Date(snap.fetchedAt) > new Date(watchItem.lastSeenAt) : true;

      const sectorContext = isHolding
        ? computeSectorContext(snap, snapshots, holdings)
        : null;

      return {
        symbol,
        sector: snap.sector,
        price: snap.price,
        pctChange: Number(base.pctChange.toFixed(2)),
        score: Number(decayedScore.toFixed(1)),
        reason: base.reason,
        sectorContext,
        isNew,
        isStale: snap.isStale,
        sparkline: snap.history.slice(-12).map((h) => h.price)
      };
    };

    const yourHoldings = (
      await Promise.all(holdingSymbols.map((s) => buildItem(s, true)))
    )
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const marketWatch = (
      await Promise.all(
        watchSymbols.filter((s) => !holdingSymbols.includes(s)).map((s) => buildItem(s, false))
      )
    )
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

        const flaggedItems = [...yourHoldings, ...marketWatch].filter((i) => i.score >= 1.5);
    const flaggedCount = flaggedItems.length;
    const narrative = await generateDigestNarrative(flaggedItems);

    res.json({
      yourHoldings,
      marketWatch,
      digest: {
        flaggedCount,
        summary:
          flaggedCount > 0
            ? `${flaggedCount} stock${flaggedCount > 1 ? "s" : ""} need attention today`
            : "no significant moves right now",
        narrative
      }
    });
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to load watchlist" });
  }
});

/** POST /api/watchlist/:userId/add  { symbol, sector } */
router.post("/:userId/add", async (req, res) => {
  try {
    const { userId } = req.params;
    const { symbol } = req.body;
    if (!symbol) return res.status(400).json({ error: "symbol is required" });

    const item = await WatchlistItem.findOneAndUpdate(
      { userId, symbol: symbol.toUpperCase() },
      { $setOnInsert: { lastSeenAt: new Date(0) } },
      { upsert: true, new: true }
    );
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "failed to add to watchlist" });
  }
});

/** DELETE /api/watchlist/:userId/:symbol */
router.delete("/:userId/:symbol", async (req, res) => {
  try {
    const { userId, symbol } = req.params;
    await WatchlistItem.deleteOne({ userId, symbol: symbol.toUpperCase() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "failed to remove from watchlist" });
  }
});

/**
 * POST /api/watchlist/:userId/mark-seen
 * Called when the user opens the app — updates lastSeenAt so the
 * "what changed" diff resets for the next visit.
 */
router.post("/:userId/mark-seen", async (req, res) => {
  try {
    const { userId } = req.params;
    await WatchlistItem.updateMany(
      { userId },
      { $set: { lastSeenAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "failed to mark seen" });
  }
});

export default router;
