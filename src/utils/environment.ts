export const isTauri = (): boolean =>
  typeof window !== "undefined" &&
  Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown })
      .__TAURI_INTERNALS__
  );
