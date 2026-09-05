import mongoose from "mongoose";

const interactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  symbol: { type: String, required: true, uppercase: true },
  eventType: { type: String, required: true },
  action: { type: String, enum: ["clicked", "dismissed"], required: true },
  createdAt: { type: Date, default: Date.now }
});

interactionSchema.index({ userId: 1, eventType: 1 });

export default mongoose.model("Interaction", interactionSchema);