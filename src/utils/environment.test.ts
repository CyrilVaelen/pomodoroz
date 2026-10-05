import { afterEach, describe, expect, it, vi } from "vitest";
import { isTauri } from "./environment";

describe("environment utils", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when window or __TAURI_INTERNALS__ is not present", () => {
    vi.stubGlobal("window", {});
    expect(isTauri()).toBe(false);
  });

  it("returns true when window.__TAURI_INTERNALS__ is present", () => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    expect(isTauri()).toBe(true);
  });
});
