import { useEffect, useState, useCallback } from "react";
import { getWatchlist, markSeen } from "../utils/api.js";
import StockCard from "../components/StockCard.jsx";
import DigestBanner from "../components/DigestBanner.jsx";

// Demo user id — in a real app this comes from auth. For the hackathon
// demo, seed.js prints this to the console after `npm run seed`.
const DEMO_USER_ID = "6a9ac2227961cbaec7146dc2";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await getWatchlist(DEMO_USER_ID);
      setData(result);
      setError(null);
    } catch (err) {
      setError("couldn't load watchlist — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    markSeen(DEMO_USER_ID).catch(() => {});
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <p className="status-text">loading watchlist…</p>;
  if (error) return <p className="status-text status-text--error">{error}</p>;
  if (!data) return null;

  const portfolioValue = data.yourHoldings.reduce((sum, i) => sum + i.price, 0);
  const avgChange =
    data.yourHoldings.length > 0
      ? data.yourHoldings.reduce((sum, i) => sum + i.pctChange, 0) / data.yourHoldings.length
      : 0;

  return (
    <div className="dashboard">
      <div className="stats-row">
        <div className="stat-card">
          <p className="stat-card__label">portfolio value</p>
          <p className="stat-card__value">₹{portfolioValue.toFixed(0)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">today</p>
          <p className={`stat-card__value ${avgChange >= 0 ? "price--up" : "price--down"}`}>
            {avgChange >= 0 ? "+" : ""}
            {avgChange.toFixed(1)}%
          </p>
        </div>
      </div>

      <DigestBanner digest={data.digest} />

      <section>
        <h2 className="section-label">your holdings</h2>
        {data.yourHoldings.map((item) => (
          <StockCard key={item.symbol} item={item} prominent />
        ))}
      </section>

      <section>
        <h2 className="section-label">market watch</h2>
        {data.marketWatch.map((item) => (
          <StockCard key={item.symbol} item={item} />
        ))}
      </section>
    </div>
  );
}
