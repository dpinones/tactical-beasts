import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PendingCommit {
  moveValue: number;
  salt: string;
  timestamp: number;
}

interface GameStore {
  pendingCommits: Record<string, PendingCommit>;
  saveCommit: (
    gameId: number,
    playerAddress: string,
    moveValue: number,
    salt: string
  ) => void;
  getCommit: (
    gameId: number,
    playerAddress: string
  ) => PendingCommit | undefined;
  clearCommit: (gameId: number, playerAddress: string) => void;
  cleanupOldCommits: () => void;
}

const makeKey = (gameId: number, playerAddress: string) =>
  `${gameId}-${playerAddress.toLowerCase()}`;

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      pendingCommits: {},

      saveCommit: (gameId, playerAddress, moveValue, salt) => {
        const key = makeKey(gameId, playerAddress);
        set((state) => ({
          pendingCommits: {
            ...state.pendingCommits,
            [key]: { moveValue, salt, timestamp: Date.now() },
          },
        }));
      },

      getCommit: (gameId, playerAddress) => {
        const key = makeKey(gameId, playerAddress);
        return get().pendingCommits[key];
      },

      clearCommit: (gameId, playerAddress) => {
        const key = makeKey(gameId, playerAddress);
        set((state) => {
          const { [key]: _, ...rest } = state.pendingCommits;
          return { pendingCommits: rest };
        });
      },

      cleanupOldCommits: () => {
        const now = Date.now();
        set((state) => {
          const cleaned: Record<string, PendingCommit> = {};
          for (const [key, commit] of Object.entries(state.pendingCommits)) {
            if (now - commit.timestamp < TWENTY_FOUR_HOURS) {
              cleaned[key] = commit;
            }
          }
          return { pendingCommits: cleaned };
        });
      },
    }),
    {
      name: "rps-game-commits",
    }
  )
);
