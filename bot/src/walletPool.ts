import { Account, RpcProvider } from "starknet";
import { config } from "./config.js";

interface WalletSlot {
  address: string;
  privateKey: string;
  state: "idle" | "busy";
  gameId: number | null;
  acquiredAt: number | null;
}

const MAX_BUSY_DURATION_MS = 15 * 60 * 1000; // 15 minutes

class WalletPool {
  private slots: WalletSlot[] = [];
  private provider: RpcProvider;

  constructor() {
    this.provider = new RpcProvider({ nodeUrl: config.starknetRpcUrl });
    this.slots = config.botWallets.map((w) => ({
      address: w.address,
      privateKey: w.privateKey,
      state: "idle" as const,
      gameId: null,
      acquiredAt: null,
    }));

    // Background cleanup: force-release wallets busy > 15 min
    setInterval(() => this.cleanupStaleWallets(), 60_000);
  }

  acquire(gameId: number): { account: Account; index: number } | null {
    const idx = this.slots.findIndex((s) => s.state === "idle");
    if (idx === -1) return null;

    const slot = this.slots[idx];
    slot.state = "busy";
    slot.gameId = gameId;
    slot.acquiredAt = Date.now();

    const account = new Account({
      provider: this.provider,
      address: slot.address,
      signer: slot.privateKey,
    });
    return { account, index: idx };
  }

  release(index: number): void {
    if (index < 0 || index >= this.slots.length) return;
    const slot = this.slots[index];
    slot.state = "idle";
    slot.gameId = null;
    slot.acquiredAt = null;
  }

  get availableCount(): number {
    return this.slots.filter((s) => s.state === "idle").length;
  }

  get activeCount(): number {
    return this.slots.filter((s) => s.state === "busy").length;
  }

  getAddressByIndex(index: number): string {
    return this.slots[index]?.address || "";
  }

  private cleanupStaleWallets(): void {
    const now = Date.now();
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.state === "busy" && slot.acquiredAt && now - slot.acquiredAt > MAX_BUSY_DURATION_MS) {
        console.warn(`[WalletPool] Force-releasing stale wallet ${i} (game ${slot.gameId})`);
        this.release(i);
      }
    }
  }
}

export const walletPool = new WalletPool();
