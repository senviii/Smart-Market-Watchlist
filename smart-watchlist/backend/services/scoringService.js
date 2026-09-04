/**
 * Scoring engine — the "smart" part of the watchlist.
 *
 * Design decisions (defend these in the pitch):
 * 1. Score is volatility-normalized, not a flat % threshold — a 2% move
 *    means different things for different stocks.
 * 2. Volume spikes are scored independently of price — volume often
 *    leads price.
 * 3. Score decays with time so a move from 3 days ago doesn't stay
 *    "urgent" forever.
 * 4. Sector correlation is a separate boost, applied only to holdings,
 *    never suppressing the base score of unrelated stocks (fairness).
 */

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Rough historical daily volatility per sector (stddev of daily % move).
// In production this would be computed from `history`; hardcoded here
// as a reasonable default so cold-start stocks still get sane scores.
const SECTOR_VOLATILITY = {
  banking: 1.4,
  it: 1.2,
  energy: 1.8,
  auto: 1.6,
  fmcg: 0.9,
  pharma: 1.3,
  metal: 2.0,
  unknown: 1.5
};

function priceMoveScore(snapshot) {
  const pctChange = ((snapshot.price - snapshot.prevClose) / snapshot.prevClose) * 100;
  const expectedVol = SECTOR_VOLATILITY[snapshot.sector] || SECTOR_VOLATILITY.unknown;
  // z-score-ish: how many "typical days" of movement happened today
  const zScore = Math.abs(pctChange) / expectedVol;
  const score = clamp(zScore * 3, 0, 10);
  return { score, pctChange, zScore };
}

function volumeSpikeScore(snapshot) {
  if (!snapshot.avgVolume20d || snapshot.avgVolume20d === 0) return { score: 0, ratio: 1 };
  const ratio = snapshot.volume / snapshot.avgVolume20d;
  // ratio 1x = normal = 0 score, 3x+ = max score
  const score = clamp((ratio - 1) * 5, 0, 10);
  return { score, ratio };
}

function breakoutScore(snapshot) {
  if (snapshot.week52High && snapshot.price >= snapshot.week52High) {
    return { score: 8, type: "breakout_high", reason: "broke above 52-week high" };
  }
  if (snapshot.week52Low && snapshot.price <= snapshot.week52Low) {
    return { score: 8, type: "breakout_low", reason: "broke below 52-week low" };
  }
  return null;
}

/**
 * Applies exponential time decay so old events lose urgency.
 * halfLifeHours: score halves every N hours.
 */
function timeDecay(score, eventTime, halfLifeHours = 6) {
  const hoursElapsed = (Date.now() - new Date(eventTime).getTime()) / (1000 * 60 * 60);
  const decayFactor = Math.pow(0.5, hoursElapsed / halfLifeHours);
  return score * decayFactor;
}

/**
 * Computes the base meaningful-change score for a snapshot.
 * This is universal — same formula for every stock, portfolio or not.
 */
function computeBaseScore(snapshot) {
  const price = priceMoveScore(snapshot);
  const volume = volumeSpikeScore(snapshot);
  const breakout = breakoutScore(snapshot);

  let finalScore = price.score * 0.5 + volume.score * 0.3;
  let reasons = [];

  if (Math.abs(price.pctChange) > 0.5) {
    reasons.push(`${price.pctChange > 0 ? "+" : ""}${price.pctChange.toFixed(1)}% vs sector-typical ${(price.zScore).toFixed(1)}x`);
  }
  if (volume.ratio > 1.3) {
    reasons.push(`volume ${volume.ratio.toFixed(1)}x avg`);
  }
  if (breakout) {
    finalScore = Math.max(finalScore, breakout.score);
    reasons.push(breakout.reason);
  }

  return {
    score: clamp(finalScore, 0, 10),
    pctChange: price.pctChange,
    volumeRatio: volume.ratio,
    reason: reasons.length ? reasons.join(" · ") : "no significant move",
    eventType: breakout ? breakout.type : volume.score > price.score ? "volume_spike" : "price_move"
  };
}

/**
 * Sector correlation boost — only used to tag/explain, per the
 * "fairness" decision: non-portfolio stocks are never suppressed,
 * this only adds context to holdings.
 */
function computeSectorContext(snapshot, allSnapshots, userHoldings) {
  const sameSectorHoldings = userHoldings.filter(
    (h) => h.sector === snapshot.sector && h.symbol !== snapshot.symbol
  );
  if (sameSectorHoldings.length === 0) return null;

  // find the biggest mover among same-sector holdings
  let biggestMover = null;
  for (const h of sameSectorHoldings) {
    const s = allSnapshots.find((sn) => sn.symbol === h.symbol);
    if (!s) continue;
    const pct = ((s.price - s.prevClose) / s.prevClose) * 100;
    if (!biggestMover || Math.abs(pct) > Math.abs(biggestMover.pct)) {
      biggestMover = { symbol: h.symbol, pct };
    }
  }
  if (!biggestMover || Math.abs(biggestMover.pct) < 1.5) return null;

  return `also watch: correlated with your ${biggestMover.symbol} holding (${biggestMover.pct > 0 ? "+" : ""}${biggestMover.pct.toFixed(1)}%)`;
}

export { computeBaseScore, computeSectorContext, timeDecay, SECTOR_VOLATILITY };
