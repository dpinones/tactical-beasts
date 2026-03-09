import { Account } from "starknet";
import { config } from "./config.js";
import { walletPool } from "./walletPool.js";
import * as dojo from "./dojoClient.js";
import * as torii from "./toriiClient.js";
import { computeActions } from "./ai/strategy.js";
import { BOT_TEAM } from "./ai/teamSelect.js";
import { OBSTACLES } from "./ai/hexGrid.js";
import { GameStatus, HexCoord, MapStateModel } from "./types.js";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes max per session

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAddr(addr: string): string {
  if (!addr) return "0x" + "0".repeat(64);
  const hex = addr.replace("0x", "").toLowerCase();
  return "0x" + hex.padStart(64, "0");
}

function mapStateToObstacles(ms: MapStateModel): HexCoord[] {
  return [
    { row: ms.obstacle_1_row, col: ms.obstacle_1_col },
    { row: ms.obstacle_2_row, col: ms.obstacle_2_col },
    { row: ms.obstacle_3_row, col: ms.obstacle_3_col },
    { row: ms.obstacle_4_row, col: ms.obstacle_4_col },
    { row: ms.obstacle_5_row, col: ms.obstacle_5_col },
    { row: ms.obstacle_6_row, col: ms.obstacle_6_col },
  ];
}

export async function startBotSession(gameId: number): Promise<{ botAddress: string }> {
  const wallet = walletPool.acquire(gameId);
  if (!wallet) {
    throw new Error("No available bot wallets. Try again later.");
  }

  const { account, index } = wallet;
  const botAddress = walletPool.getAddressByIndex(index);
  console.log(`[Bot] Starting session for game ${gameId} with wallet ${index} (${botAddress.slice(0, 10)}...)`);

  // Run the game loop in the background
  runGameLoop(account, gameId, index).catch((err) => {
    console.error(`[Bot] Game ${gameId} loop error:`, err);
    walletPool.release(index);
  });

  return { botAddress };
}

async function runGameLoop(account: Account, gameId: number, walletIndex: number): Promise<void> {
  const startTime = Date.now();

  try {
    // Step 1: Join the game
    console.log(`[Bot] Joining game ${gameId}...`);
    await dojo.joinGame(account, gameId);
    console.log(`[Bot] Joined game ${gameId}`);

    // Step 2: Wait for player 1 to set their team, then set bot's team
    await waitForCondition(
      async () => {
        const game = await torii.fetchGame(gameId);
        return game?.p1_team_set === true;
      },
      startTime,
      "p1 team set"
    );

    console.log(`[Bot] Setting team for game ${gameId}...`);
    await dojo.setTeamDynamic(account, gameId, BOT_TEAM);
    console.log(`[Bot] Team set for game ${gameId}`);

    // Step 3: Main battle loop
    const botAddress = normalizeAddr(walletPool.getAddressByIndex(walletIndex));

    while (Date.now() - startTime < TIMEOUT_MS) {
      const game = await torii.fetchGame(gameId);
      if (!game) {
        await sleep(config.pollIntervalMs);
        continue;
      }

      // Game finished
      if (game.status === GameStatus.FINISHED) {
        console.log(`[Bot] Game ${gameId} finished. Winner: ${game.winner?.slice(0, 10)}...`);
        break;
      }

      // Not playing yet
      if (game.status !== GameStatus.PLAYING) {
        await sleep(config.pollIntervalMs);
        continue;
      }

      // Determine bot's player index
      const botPlayerIndex = normalizeAddr(game.player1) === botAddress ? 1
        : normalizeAddr(game.player2) === botAddress ? 2
        : 0;

      if (botPlayerIndex === 0) {
        console.error(`[Bot] Bot address not found in game ${gameId} players`);
        break;
      }

      // Is it bot's turn?
      if (game.current_attacker !== botPlayerIndex) {
        await sleep(config.pollIntervalMs);
        continue;
      }

      // Fetch beast states + map
      const [beasts, mapState] = await Promise.all([
        torii.fetchBeastStates(gameId),
        torii.fetchMapState(gameId),
      ]);

      const obstacles = mapState ? mapStateToObstacles(mapState) : OBSTACLES;
      const botBeasts = beasts.filter((b) => Number(b.player_index) === botPlayerIndex);
      const enemyBeasts = beasts.filter((b) => Number(b.player_index) !== botPlayerIndex);

      // Compute actions
      const actions = computeActions(botBeasts, enemyBeasts, obstacles);

      if (actions.length === 0) {
        console.log(`[Bot] Game ${gameId}: No valid actions, submitting empty turn`);
      }

      // Delay before acting (so it feels like a real player)
      await sleep(config.actionDelayMs);

      // Execute turn
      console.log(`[Bot] Game ${gameId} round ${game.round}: executing ${actions.length} actions`);
      try {
        await dojo.executeTurn(account, gameId, actions);
      } catch (err) {
        console.error(`[Bot] Game ${gameId} executeTurn failed:`, err);
        // Wait and retry on next poll
      }

      await sleep(config.pollIntervalMs);
    }

    // Timeout — abandon if still playing
    if (Date.now() - startTime >= TIMEOUT_MS) {
      console.warn(`[Bot] Game ${gameId} timed out after 15 min, abandoning...`);
      try {
        await dojo.abandonGame(account, gameId);
      } catch (e) {
        console.error(`[Bot] Failed to abandon game ${gameId}:`, e);
      }
    }
  } finally {
    console.log(`[Bot] Releasing wallet ${walletIndex} (game ${gameId})`);
    walletPool.release(walletIndex);
  }
}

async function waitForCondition(
  check: () => Promise<boolean>,
  startTime: number,
  label: string
): Promise<void> {
  while (Date.now() - startTime < TIMEOUT_MS) {
    const result = await check();
    if (result) return;
    await sleep(config.pollIntervalMs);
  }
  throw new Error(`Timeout waiting for ${label}`);
}
