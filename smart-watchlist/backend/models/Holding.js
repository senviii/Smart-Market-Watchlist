import mongoose from "mongoose";

const holdingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    symbol: { type: String, required: true, uppercase: true },
    sector: { type: String, required: true },
    quantity: { type: Number, required: true },
    avgBuyPrice: { type: Number, required: true }
  },
  { timestamps: true }
);

holdingSchema.index({ userId: 1, symbol: 1 }, { unique: true });

export default mongoose.model("Holding", holdingSchema);
