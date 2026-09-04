import mongoose from "mongoose";

const watchlistItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    symbol: { type: String, required: true, uppercase: true },
    lastSeenAt: { type: Date, default: () => new Date(0) },
    lastSeenPrice: { type: Number, default: null }
  },
  { timestamps: true }
);

watchlistItemSchema.index({ userId: 1, symbol: 1 }, { unique: true });

export default mongoose.model("WatchlistItem", watchlistItemSchema);
