import { type AccountInterface, TransactionFinalityStatus } from "starknet";

const CHAIN = import.meta.env.VITE_CHAIN?.trim() || "";
const SLOT = import.meta.env.VITE_SLOT_INSTANCE?.trim() || "";
const isProduction = CHAIN === "mainnet" || CHAIN === "sepolia";

/** Local/Slot: poll fast since blocks are instant. */
const LOCAL_OPTIONS = { retryInterval: 100 } as const;

/**
 * Production (mainnet/sepolia): accept PRE_CONFIRMED for faster feedback,
 * poll at 350ms, and retry on RPC hiccups (same pattern as Death Mountain).
 */
const PRODUCTION_OPTIONS = {
  retryInterval: 350,
  successStates: [
    TransactionFinalityStatus.PRE_CONFIRMED,
    TransactionFinalityStatus.ACCEPTED_ON_L2,
    TransactionFinalityStatus.ACCEPTED_ON_L1,
  ],
} as const;

const MAX_RETRIES = 9;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a transaction to be confirmed, with production-grade retry logic.
 * - Local/Slot: polls at 100ms, no retry wrapper (instant blocks).
 * - Mainnet/Sepolia: accepts PRE_CONFIRMED, retries up to 9 times on RPC failures.
 */
export async function waitForTx(
  account: AccountInterface,
  txHash: string
): Promise<unknown> {
  if (!isProduction) {
    return account.waitForTransaction(txHash, LOCAL_OPTIONS);
  }

  return waitWithRetry(account, txHash, 0);
}

async function waitWithRetry(
  account: AccountInterface,
  txHash: string,
  attempt: number
): Promise<unknown> {
  if (attempt > MAX_RETRIES) {
    throw new Error(
      `Transaction confirmation timed out after ${MAX_RETRIES} retries — the network may be congested. Try again.`
    );
  }

  try {
    const receipt = await account.waitForTransaction(txHash, {
      retryInterval: PRODUCTION_OPTIONS.retryInterval,
      successStates: [...PRODUCTION_OPTIONS.successStates],
    });
    return receipt;
  } catch {
    // RPC hiccup — wait and retry
    await delay(500);
    return waitWithRetry(account, txHash, attempt + 1);
  }
}
