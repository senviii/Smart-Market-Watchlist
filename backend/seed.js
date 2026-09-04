import dotenv from "dotenv";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Holding from "./models/Holding.js";
import WatchlistItem from "./models/WatchlistItem.js";

dotenv.config();

const DEMO_HOLDINGS = [
  { symbol: "RELIANCE", sector: "energy", quantity: 10, avgBuyPrice: 2450 },
  { symbol: "HDFCBANK", sector: "banking", quantity: 15, avgBuyPrice: 1550 },
  { symbol: "TCS", sector: "it", quantity: 5, avgBuyPrice: 3800 }
];

const DEMO_WATCHLIST_ONLY = ["TATASTEEL", "SBIN", "INFY", "MARUTI"];

async function seed() {
  await connectDB();

  const user = await User.findOneAndUpdate(
    { email: "demo@smartwatchlist.dev" },
    { name: "Saanvi (demo)", isDemo: true },
    { upsert: true, new: true }
  );
  console.log(`[seed] demo user: ${user._id}`);

  for (const h of DEMO_HOLDINGS) {
    await Holding.findOneAndUpdate(
      { userId: user._id, symbol: h.symbol },
      h,
      { upsert: true }
    );
  }

  const allWatchSymbols = [...DEMO_HOLDINGS.map((h) => h.symbol), ...DEMO_WATCHLIST_ONLY];
  for (const symbol of allWatchSymbols) {
    await WatchlistItem.findOneAndUpdate(
      { userId: user._id, symbol },
      { $setOnInsert: { lastSeenAt: new Date(0) } },
      { upsert: true }
    );
  }

  console.log("[seed] done. Demo userId:", user._id.toString());
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
