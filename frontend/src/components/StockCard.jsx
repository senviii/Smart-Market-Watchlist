import { useState } from "react";
import Sparkline from "./Sparkline.jsx";
import ScoreRing from "./ScoreRing.jsx";

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

export default function StockCard({ item, prominent }) {
  const [expanded, setExpanded] = useState(false);
  const positive = item.pctChange >= 0;
  const accent = SECTOR_ACCENT[item.sector] || SECTOR_ACCENT.unknown;

  return (
    <div
      className={`stock-card ${prominent ? "stock-card--prominent" : ""} ${expanded ? "stock-card--expanded" : ""}`}
      style={{ "--accent": accent }}
      onClick={() => setExpanded((e) => !e)}
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
        </div>
      )}
    </div>
  );
}