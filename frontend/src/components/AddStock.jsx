import { useState } from "react";
import { addToWatchlist } from "../utils/api.js";

const DEMO_USER_ID = "6a9ac2227961cbaec7146dc2";

export default function AddStock({ onChanged }) {
  const [symbol, setSymbol] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;
    setBusy(true);
    setError(null);
    try {
      await addToWatchlist(DEMO_USER_ID, clean);
      setSymbol("");
      onChanged();
    } catch (err) {
      setError("couldn't add — check the symbol and try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="add-stock" onSubmit={handleAdd}>
      <input
        className="add-stock__input"
        placeholder="add symbol, e.g. WIPRO"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        disabled={busy}
      />
      <button className="add-stock__btn" type="submit" disabled={busy || !symbol.trim()}>
        {busy ? "…" : "add"}
      </button>
      {error && <p className="add-stock__error">{error}</p>}
    </form>
  );
}