import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import watchlistRoutes from "./routes/watchlist.js";
import holdingsRoutes from "./routes/holdings.js";
import { startPolling } from "./services/pollScheduler.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/watchlist", watchlistRoutes);
app.use("/api/holdings", holdingsRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] listening on port ${PORT}`);
      startPolling(Number(process.env.POLL_INTERVAL_SECONDS) || 60);
    });
  })
  .catch((err) => {
    console.error("[server] failed to start:", err.message);
    process.exit(1);
  });
