import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./environment";

type PlayNotificationAudioOptions = {
  delayMs?: number;
};

const audioBytesCache = new Map<string, number[]>();

const playWithHtmlAudio = (source: string, delayMs: number) => {
  const play = () => {
    new Audio(source).play().catch((error: unknown) => {
      console.warn(
        "[Audio] There was a problem playing sound in renderer.",
        error
      );
    });
  };

  if (delayMs > 0) {
    window.setTimeout(play, delayMs);
    return;
  }

  play();
};

const loadAudioBytes = async (source: string): Promise<number[]> => {
  const cachedBytes = audioBytesCache.get(source);
  if (cachedBytes) {
    return cachedBytes;
  }

  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(
      `Failed to load notification audio: ${response.status} ${response.statusText}`
    );
  }

  const bytes = Array.from(
    new Uint8Array(await response.arrayBuffer())
  );
  audioBytesCache.set(source, bytes);
  return bytes;
};

const playWithTauriAudio = async (source: string, delayMs: number) => {
  const wavBytes = await loadAudioBytes(source);
  await invoke("play_notification_sound", {
    wavBytes,
    delayMs,
  });
};

export const playNotificationAudio = async (
  source: string,
  options?: PlayNotificationAudioOptions
) => {
  const delayMs = options?.delayMs ?? 0;

  if (!isTauri()) {
    if (typeof window !== "undefined") {
      playWithHtmlAudio(source, delayMs);
    }
    return;
  }

  try {
    await playWithTauriAudio(source, delayMs);
  } catch (error) {
    console.warn(
      "[TAURI Audio] Failed to play notification sound natively. Falling back to renderer audio.",
      error
    );
    if (typeof window !== "undefined") {
      playWithHtmlAudio(source, delayMs);
    }
  }
};
