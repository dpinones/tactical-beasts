import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { walletPool } from "./walletPool.js";
import { startBotSession } from "./botRunner.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    availableWallets: walletPool.availableCount,
    activeGames: walletPool.activeCount,
  });
});

app.post("/api/practice", async (req, res) => {
  const { gameId } = req.body;

  if (!gameId || typeof gameId !== "number") {
    res.status(400).json({ error: "gameId (number) is required" });
    return;
  }

  try {
    const result = await startBotSession(gameId);
    res.json({ success: true, botAddress: result.botAddress });
  } catch (err: any) {
    console.error("[API] /api/practice error:", err);
    res.status(503).json({ error: err.message || "Failed to start bot session" });
  }
});

app.listen(config.port, () => {
  console.log(`[Bot API] Running on port ${config.port}`);
  console.log(`[Bot API] RPC: ${config.starknetRpcUrl}`);
  console.log(`[Bot API] Torii: ${config.toriiGraphqlUrl}`);
  console.log(`[Bot API] Wallets configured: ${config.botWallets.length}`);
});
