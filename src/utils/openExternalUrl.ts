import { openUrl as openTauriUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "./environment";

const isAllowedExternalUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

export const openExternalUrl = async (
  url: string
): Promise<boolean> => {
  if (!isAllowedExternalUrl(url)) {
    console.warn("[External URL] URL inválida bloqueada:", url);
    return false;
  }

  if (!isTauri()) {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    }
    return false;
  }

  return Promise.resolve(openTauriUrl(url))
    .then(() => true)
    .catch((error: unknown) => {
      console.warn(
        "[External URL] Falha ao abrir URL no runtime Tauri:",
        error
      );
      return false;
    });
};
