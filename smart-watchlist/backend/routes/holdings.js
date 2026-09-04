import express from "express";
import Holding from "../models/Holding.js";

const router = express.Router();

router.get("/:userId", async (req, res) => {
  const holdings = await Holding.find({ userId: req.params.userId });
  res.json(holdings);
});

router.post("/:userId", async (req, res) => {
  try {
    const { symbol, sector, quantity, avgBuyPrice } = req.body;
    const holding = await Holding.findOneAndUpdate(
      { userId: req.params.userId, symbol: symbol.toUpperCase() },
      { sector, quantity, avgBuyPrice },
      { upsert: true, new: true }
    );
    res.json(holding);
  } catch (err) {
    res.status(500).json({ error: "failed to add holding" });
  }
});

export default router;
