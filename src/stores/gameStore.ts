import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GameAction, BattleEvent } from "../domain/types";

interface TBGameStore {
  // Current active game
  activeGameId: number | null;
  setActiveGameId: (id: number | null) => void;

  // Denshokan / EGS
  activeTokenId: string | null;
  setActiveTokenId: (id: string | null) => void;
  selectedSettingsId: number | null;
  setSelectedSettingsId: (id: number | null) => void;

  // Selected beasts for team
  selectedBeasts: number[];
  toggleBeast: (tokenId: number) => void;
  clearSelectedBeasts: () => void;
  setSelectedBeasts: (ids: number[]) => void;

  // Actions being planned for current turn
  plannedActions: GameAction[];
  setPlanedActions: (actions: GameAction[]) => void;
  clearPlannedActions: () => void;

  // Battle log (local, reconstructed from events)
  battleLog: BattleEvent[];
  addBattleEvent: (event: BattleEvent) => void;
  clearBattleLog: () => void;

  // Selected beast on the board
  selectedBeastIndex: number | null;
  setSelectedBeastIndex: (index: number | null) => void;

  // UI state
  isAnimating: boolean;
  setIsAnimating: (v: boolean) => void;
}

export const useGameStore = create<TBGameStore>()(
  persist(
    (set, get) => ({
      activeGameId: null,
      setActiveGameId: (id) => set({ activeGameId: id }),

      activeTokenId: null,
      setActiveTokenId: (id) => set({ activeTokenId: id }),
      selectedSettingsId: null,
      setSelectedSettingsId: (id) => set({ selectedSettingsId: id }),

      selectedBeasts: [],
      toggleBeast: (tokenId) => {
        const current = get().selectedBeasts;
        if (current.includes(tokenId)) {
          set({ selectedBeasts: current.filter((id) => id !== tokenId) });
        } else if (current.length < 3) {
          set({ selectedBeasts: [...current, tokenId] });
        }
      },
      clearSelectedBeasts: () => set({ selectedBeasts: [] }),
      setSelectedBeasts: (ids: number[]) => set({ selectedBeasts: ids.slice(0, 3) }),

      plannedActions: [],
      setPlanedActions: (actions) => set({ plannedActions: actions }),
      clearPlannedActions: () => set({ plannedActions: [] }),

      battleLog: [],
      addBattleEvent: (event) =>
        set((s) => ({ battleLog: [...s.battleLog, event] })),
      clearBattleLog: () => set({ battleLog: [] }),

      selectedBeastIndex: null,
      setSelectedBeastIndex: (index) => set({ selectedBeastIndex: index }),

      isAnimating: false,
      setIsAnimating: (v) => set({ isAnimating: v }),
    }),
    {
      name: "tb-game-store",
      partialize: (state) => ({
        activeGameId: state.activeGameId,
        selectedBeasts: state.selectedBeasts,
        activeTokenId: state.activeTokenId,
        selectedSettingsId: state.selectedSettingsId,
      }),
    }
  )
);
