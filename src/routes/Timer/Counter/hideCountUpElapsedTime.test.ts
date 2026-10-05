import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const data: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = String(value);
    },
    removeItem: (key: string) => {
      delete data[key];
    },
    clear: () => {
      Object.keys(data).forEach((k) => delete data[k]);
    },
    get length() {
      return Object.keys(data).length;
    },
    key: (index: number) => Object.keys(data)[index] ?? null,
  };

  (
    globalThis as unknown as { localStorage: typeof mockStorage }
  ).localStorage = mockStorage;

  (globalThis as unknown as { window: unknown }).window = {
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  try {
    Object.defineProperty(globalThis, "navigator", {
      value: {
        appVersion: "Windows NT 10.0",
        languages: ["zh-CN", "zh"],
      },
      configurable: true,
      writable: true,
    });
  } catch (error) {
    void error;
  }
});
import { TimerStatus } from "store/timer/types";
import { defaultSettings } from "store/settings/defaultSettings";
import settingReducer, {
  restoreDefaultSettings,
  setHideCountUpElapsedTime,
} from "store/settings";
import { isCountUpElapsedTimeHidden } from "./utils";

describe("TIMER-WB-02: 正计时隐藏已用时偏好专项测试", () => {
  it("默认偏好为关闭 (false)，保持现有行为", () => {
    expect(defaultSettings.hideCountUpElapsedTime).toBe(false);
  });

  describe("isCountUpElapsedTimeHidden 判定规则", () => {
    it("默认偏好关闭时，正计时模式下不隐藏时间读数", () => {
      expect(
        isCountUpElapsedTimeHidden(false, TimerStatus.COUNT_UP)
      ).toBe(false);
      expect(
        isCountUpElapsedTimeHidden(undefined, TimerStatus.COUNT_UP)
      ).toBe(false);
    });

    it("当偏好开启时，正计时模式下判定为隐藏已用时", () => {
      expect(
        isCountUpElapsedTimeHidden(true, TimerStatus.COUNT_UP)
      ).toBe(true);
    });

    it("番茄钟模式绝不受此偏好影响，始终保持显示", () => {
      // 即便用户开启了“正计时隐藏已用时”，番茄钟 (STAY_FOCUS) 读数依然正常可见
      expect(
        isCountUpElapsedTimeHidden(true, TimerStatus.STAY_FOCUS)
      ).toBe(false);
      expect(
        isCountUpElapsedTimeHidden(false, TimerStatus.STAY_FOCUS)
      ).toBe(false);
    });

    it("休息倒计时（短休息、长休息、特殊休息）不受此偏好影响，始终保持显示", () => {
      expect(
        isCountUpElapsedTimeHidden(true, TimerStatus.SHORT_BREAK)
      ).toBe(false);
      expect(
        isCountUpElapsedTimeHidden(true, TimerStatus.LONG_BREAK)
      ).toBe(false);
      expect(
        isCountUpElapsedTimeHidden(true, TimerStatus.SPECIAL_BREAK)
      ).toBe(false);
    });
  });

  describe("Redux settings reducer 状态生命周期", () => {
    it("正确响应 setHideCountUpElapsedTime action 切换状态", () => {
      const initialState = { ...defaultSettings };
      expect(initialState.hideCountUpElapsedTime).toBe(false);

      // 切换为开启
      const enabledState = settingReducer(
        initialState,
        setHideCountUpElapsedTime(true)
      );
      expect(enabledState.hideCountUpElapsedTime).toBe(true);

      // 切换为关闭
      const disabledState = settingReducer(
        enabledState,
        setHideCountUpElapsedTime(false)
      );
      expect(disabledState.hideCountUpElapsedTime).toBe(false);
    });

    it("恢复默认设置时，hideCountUpElapsedTime 正确重置为 false", () => {
      const customState = {
        ...defaultSettings,
        hideCountUpElapsedTime: true,
      };
      expect(customState.hideCountUpElapsedTime).toBe(true);

      const restored = settingReducer(
        customState,
        restoreDefaultSettings()
      );
      expect(restored.hideCountUpElapsedTime).toBe(false);
    });
  });
});
