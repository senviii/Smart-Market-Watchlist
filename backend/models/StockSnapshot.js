import mongoose from "mongoose";

const stockSnapshotSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true, uppercase: true },
  sector: { type: String, default: "unknown" },
  price: { type: Number, required: true },
  prevClose: { type: Number, required: true },
  dayHigh: Number,
  dayLow: Number,
  week52High: Number,
  week52Low: Number,
  volume: { type: Number, default: 0 },
  avgVolume20d: { type: Number, default: 0 },
  // rolling recent price history for volatility calc + sparkline, capped at 30 points
  history: [
    {
      price: Number,
      at: Date
    }
  ],
  isStale: { type: Boolean, default: false },
  fetchedAt: { type: Date, default: Date.now }
});

export default mongoose.model("StockSnapshot", stockSnapshotSchema);
