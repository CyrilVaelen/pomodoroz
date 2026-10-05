import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserInvokeConnector } from "./BrowserInvokeConnector";
import { OPEN_RELEASE_PAGE, TASKS_EXPORT_RESULT } from "../../ipc";

describe("BrowserInvokeConnector", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("handles OPEN_RELEASE_PAGE safely by opening github releases url in new tab", () => {
    const openSpy = vi.fn();
    vi.stubGlobal("window", { open: openSpy });

    BrowserInvokeConnector.send(OPEN_RELEASE_PAGE);
    expect(openSpy).toHaveBeenCalledWith(
      "https://github.com/cjdduarte/pomodoroz/releases",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("safely handles native desktop events as no-op without throwing", () => {
    // 桌面端事件在浏览器下无阻断、不报错
    expect(() => {
      BrowserInvokeConnector.send(
        "TASKBAR_TRIGGER" as unknown as typeof OPEN_RELEASE_PAGE
      );
    }).not.toThrow();
  });

  it("supports event subscription and unsubscription via receive", () => {
    const callback = vi.fn();
    const unsubscribe = BrowserInvokeConnector.receive(
      TASKS_EXPORT_RESULT,
      callback
    );

    expect(typeof unsubscribe).toBe("function");
    unsubscribe();
  });
});
