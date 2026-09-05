import { useState } from "react";
import Sparkline from "./Sparkline.jsx";
import ScoreRing from "./ScoreRing.jsx";
import { logInteraction, removeFromWatchlist } from "../utils/api.js";

const DEMO_USER_ID = "6a9ac2227961cbaec7146dc2";

const SECTOR_ACCENT = {
  banking: "#4f7cff",
  it: "#7c5cff",
  energy: "#ff9a4f",
  metal: "#ff6b6b",
  auto: "#4fd1c5",
  fmcg: "#8bd450",
  pharma: "#e57ee5",
  unknown: "#8a8f9c"
};

export default function StockCard({ item, prominent, onRemoved }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const positive = item.pctChange >= 0;
  const accent = SECTOR_ACCENT[item.sector] || SECTOR_ACCENT.unknown;

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      logInteraction(DEMO_USER_ID, item.symbol, item.eventType, "clicked").catch(() => {});
    }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
    logInteraction(DEMO_USER_ID, item.symbol, item.eventType, "dismissed").catch(() => {});
  };
  const handleRemove = async (e) => {
  e.stopPropagation();
  await removeFromWatchlist(DEMO_USER_ID, item.symbol).catch(() => {});
  if (onRemoved) onRemoved(item.symbol);
};

  if (dismissed) {
    return (
      <div className="stock-card stock-card--dismissed">
        <p className="stock-card__dismissed-note">{item.symbol} — noted, showing less like this</p>
      </div>
    );
  }

  return (
    <div
      className={`stock-card ${prominent ? "stock-card--prominent" : ""} ${expanded ? "stock-card--expanded" : ""}`}
      style={{ "--accent": accent }}
      onClick={handleExpand}
    >
      <div className="stock-card__row">
        <ScoreRing score={item.score} />
        <div className="stock-card__main">
          <p className="stock-card__symbol">
            {item.symbol}
            <span className="chip" style={{ color: accent }}>{item.sector}</span>
            {item.isNew && <span className="dot dot--pulse" title="new since last visit" />}
          </p>
          <p className="stock-card__reason">{item.reason}</p>
        </div>
        <div className="stock-card__price">
          <p className={`price ${positive ? "price--up" : "price--down"}`}>
            {positive ? "+" : ""}
            {item.pctChange}%
          </p>
        </div>
        <button className="dismiss-btn" onClick={handleDismiss} title="not interested in this type of alert">
          ×
        </button>
      </div>

      {item.sparkline?.length > 1 && (
        <Sparkline points={item.sparkline} positive={positive} />
      )}

      {expanded && (
        <div className="stock-card__detail">
          <div className="detail-row">
            <span>current price</span>
            <span>₹{item.price?.toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span>meaningful-change score</span>
            <span>{item.score.toFixed(1)} / 10</span>
          </div>
          {item.sectorContext && (
            <div className="detail-note">{item.sectorContext}</div>
          )}
          {item.isStale && <p className="stale-note">data may be delayed</p>}
          {!prominent && (
  <button className="remove-link" onClick={handleRemove}>
    remove from watchlist
  </button>
          )}
        </div>
      )}
    </div>
  );
}