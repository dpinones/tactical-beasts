import { create } from "zustand";
import { persist } from "zustand/middleware";

// =============================================================================
// Tutorial steps — sequential, teach-by-doing
// =============================================================================

export type TutorialStep =
  | "pick-first-beast"
  | "combat-triangle"
  | "fill-team"
  | "confirm-team"
  | "select-beast"
  | "move-beast"
  | "confirm-actions"
  | "enemy-approach"
  | "attack-demo"
  | "tutorial-end";

export const TUTORIAL_STEPS: TutorialStep[] = [
  "pick-first-beast",
  "combat-triangle",
  "fill-team",
  "confirm-team",
  "select-beast",
  "move-beast",
  "confirm-actions",
  "enemy-approach",
  "attack-demo",
  "tutorial-end",
];

// Which page each step belongs to
export type TutorialPage = "team-select" | "battle";

export function getStepPage(step: TutorialStep): TutorialPage {
  switch (step) {
    case "pick-first-beast":
    case "combat-triangle":
    case "fill-team":
    case "confirm-team":
      return "team-select";
    case "select-beast":
    case "move-beast":
    case "confirm-actions":
    case "enemy-approach":
    case "attack-demo":
    case "tutorial-end":
      return "battle";
  }
}

// Step content
export interface StepContent {
  text: string;
  subtext?: string;
  target: string | null; // null = centered, no spotlight
  position: "top" | "bottom" | "left" | "right";
  interactive: boolean; // true = wait for user action (no forward arrow), false = arrows to navigate
  noOverlay?: boolean; // true = skip the dark backdrop
}

export function getStepContent(step: TutorialStep): StepContent {
  switch (step) {
    case "pick-first-beast":
      return {
        text: "Pick your first beast",
        subtext: "Each beast has a type: Magical, Hunter, or Brute. Tap one to select it.",
        target: "beast-catalog",
        position: "right",
        interactive: true,
      };
    case "combat-triangle":
      return {
        text: "Types counter each other",
        subtext: "Magical beats Brute, Brute beats Hunter, Hunter beats Magical. Mix types to cover weaknesses.",
        target: "team-slots",
        position: "left",
        interactive: false,
      };
    case "fill-team":
      return {
        text: "Complete your team",
        subtext: "Pick 2 more beasts. Try different types for a balanced team.",
        target: "beast-catalog",
        position: "right",
        interactive: true,
      };
    case "confirm-team":
      return {
        text: "Confirm your team",
        subtext: "Press the button to lock in your team and enter battle.",
        target: "confirm-team-btn",
        position: "top",
        interactive: true,
      };
    case "select-beast":
      return {
        text: "Select a beast to command",
        subtext: "Click one of your beasts on the left panel or directly on the map.",
        target: null,
        position: "bottom",
        interactive: true,
        noOverlay: true,
      };
    case "move-beast":
      return {
        text: "Move your beasts",
        subtext: "Green cells show where a beast can move. Move all 3 beasts to continue.",
        target: null,
        position: "bottom",
        interactive: true,
        noOverlay: true,
      };
    case "confirm-actions":
      return {
        text: "Confirm your actions",
        subtext: "Press Confirm to execute all your moves at once.",
        target: "confirm-button",
        position: "top",
        interactive: true,
      };
    case "enemy-approach":
      return {
        text: "The enemy responds",
        subtext: "After your turn, enemy beasts move closer to yours. Now it's time to attack!",
        target: null,
        position: "bottom",
        interactive: false,
        noOverlay: true,
      };
    case "attack-demo":
      return {
        text: "Attack an enemy",
        subtext: "Select a beast, then click an enemy in range (red cells) to deal damage.",
        target: null,
        position: "bottom",
        interactive: true,
        noOverlay: true,
      };
    case "tutorial-end":
      return {
        text: "You're ready!",
        subtext: "You can always check the How To guide from the top bar if you need a refresher.",
        target: null,
        position: "bottom",
        interactive: false,
        noOverlay: true,
      };
  }
}

// =============================================================================
// Store
// =============================================================================

interface TutorialStore {
  completed: boolean;
  dismissed: boolean;
  currentStep: TutorialStep | null;
  active: boolean;

  start: () => void;
  advance: () => void;
  goBack: () => void;
  skip: () => void;
  reset: () => void;
  completeStep: (step: TutorialStep) => void;
}

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      completed: false,
      dismissed: false,
      currentStep: null,
      active: false,

      start: () => {
        const { completed, dismissed } = get();
        if (completed || dismissed) return;
        set({ currentStep: "pick-first-beast", active: true });
      },

      advance: () => {
        const { currentStep } = get();
        if (!currentStep) return;
        const idx = TUTORIAL_STEPS.indexOf(currentStep);
        if (idx < TUTORIAL_STEPS.length - 1) {
          set({ currentStep: TUTORIAL_STEPS[idx + 1] });
        } else {
          set({ currentStep: null, active: false, completed: true });
        }
      },

      goBack: () => {
        const { currentStep } = get();
        if (!currentStep) return;
        const idx = TUTORIAL_STEPS.indexOf(currentStep);
        if (idx > 0) {
          set({ currentStep: TUTORIAL_STEPS[idx - 1] });
        }
      },

      skip: () => {
        set({ currentStep: null, active: false, dismissed: true, completed: true });
      },

      reset: () => {
        set({ completed: false, dismissed: false, currentStep: null, active: false });
      },

      completeStep: (step: TutorialStep) => {
        const { currentStep, active } = get();
        if (!active || currentStep !== step) return;
        get().advance();
      },
    }),
    {
      name: "tb-tutorial",
      partialize: (state) => ({
        completed: state.completed,
        dismissed: state.dismissed,
      }),
    }
  )
);
