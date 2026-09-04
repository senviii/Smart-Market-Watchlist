import mongoose from "mongoose";

const changeEventSchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true },
  type: {
    type: String,
    enum: ["price_move", "volume_spike", "breakout_high", "breakout_low", "sector_ripple"],
    required: true
  },
  score: { type: Number, required: true }, // base meaningful-change score, 0-10
  reason: { type: String, required: true }, // human readable explanation
  priceAtEvent: Number,
  createdAt: { type: Date, default: Date.now }
});

changeEventSchema.index({ symbol: 1, createdAt: -1 });

export default mongoose.model("ChangeEvent", changeEventSchema);
