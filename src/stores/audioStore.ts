import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AudioStore {
  musicVolume: number;
  sfxVolume: number;
  musicMuted: boolean;
  sfxMuted: boolean;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  toggleMusicMute: () => void;
  toggleSfxMute: () => void;
}

// Singleton audio elements
let bgMusic: HTMLAudioElement | null = null;
let clickSfx: HTMLAudioElement | null = null;

function getBgMusic(): HTMLAudioElement {
  if (!bgMusic) {
    bgMusic = new Audio("/sounds/bg.mp3");
    bgMusic.loop = true;
  }
  return bgMusic;
}

function getClickSfx(): HTMLAudioElement {
  if (!clickSfx) {
    clickSfx = new Audio("/sounds/click.mp3");
  }
  return clickSfx;
}

/** Start background music (call after user interaction) */
export function startMusic() {
  const { musicVolume, musicMuted } = useAudioStore.getState();
  const music = getBgMusic();
  if (musicMuted) {
    music.muted = true;
    return;
  }
  music.muted = false;
  music.volume = musicVolume;
  if (music.paused) {
    music.play().catch(() => {});
  }
}

/** Play click sound effect */
export function playClick() {
  const { sfxVolume, sfxMuted } = useAudioStore.getState();
  if (sfxMuted || sfxVolume === 0) return;
  const sfx = getClickSfx();
  sfx.volume = sfxVolume;
  sfx.currentTime = 0;
  sfx.play().catch(() => {});
}

/** Sync music volume (called from store) */
function syncMusicVolume(vol: number) {
  if (bgMusic) {
    bgMusic.volume = vol;
    const { musicMuted } = useAudioStore.getState();
    if (musicMuted) return;
    if (vol === 0) {
      bgMusic.pause();
    } else if (bgMusic.paused) {
      bgMusic.play().catch(() => {});
    }
  }
}

function syncMusicMute(muted: boolean, vol: number) {
  const music = getBgMusic();
  music.muted = muted;
  if (muted) {
    music.pause();
  } else {
    music.volume = vol;
    if (music.paused && vol > 0) {
      music.play().catch(() => {});
    }
  }
}

export const useAudioStore = create<AudioStore>()(
  persist(
    (set, get) => ({
      musicVolume: 0.3,
      sfxVolume: 0.5,
      musicMuted: false,
      sfxMuted: false,
      setMusicVolume: (v) => {
        syncMusicVolume(v);
        set({ musicVolume: v });
      },
      setSfxVolume: (v) => set({ sfxVolume: v }),
      toggleMusicMute: () => {
        const { musicMuted, musicVolume } = get();
        const next = !musicMuted;
        syncMusicMute(next, musicVolume);
        set({ musicMuted: next });
      },
      toggleSfxMute: () => {
        const { sfxMuted } = get();
        set({ sfxMuted: !sfxMuted });
      },
    }),
    {
      name: "tb-audio-store",
    }
  )
);
