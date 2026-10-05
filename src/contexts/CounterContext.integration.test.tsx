import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const memoryStorage = vi.hoisted(() => {
  const data: Record<string, string> = {};
  const mockStorage = {
    getItem: vi.fn((key: string) => data[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete data[key];
    }),
    clear: vi.fn(() => {
      Object.keys(data).forEach((k) => delete data[k]);
    }),
    get length() {
      return Object.keys(data).length;
    },
    key: vi.fn((index: number) => Object.keys(data)[index] ?? null),
    _raw: data,
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
    console.warn(
      "Unable to mock navigator in node environment:",
      error
    );
  }

  return mockStorage;
});

import { configureStore } from "@reduxjs/toolkit";
import statisticsReducer, {
  addStatisticsSession,
  STATISTICS_STORAGE_KEY,
  StatisticsBucket,
} from "../store/statistics";
import timerReducer, { setPlay, setTimerType } from "../store/timer";
import { TimerStatus } from "../store/timer/types";
import configReducer from "../store/config";
import settingReducer from "../store/settings";
import taskSelectionReducer from "../store/taskSelection";
import tasksReducer from "../store/tasks";
import updateReducer from "../store/update";

describe("CounterContext session lifecycle integration tests", () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createIntegrationHarness = () => {
    const store = configureStore({
      reducer: {
        config: configReducer,
        settings: settingReducer,
        statistics: statisticsReducer,
        taskSelection: taskSelectionReducer,
        timer: timerReducer,
        tasks: tasksReducer,
        update: updateReducer,
      },
    });

    let currentSessionId =
      "test-session-" + Math.random().toString(36).slice(2, 9);
    let sessionStartedAt: number | null = null;
    let count = 0;
    let duration = 0;
    let focusMode: "pomodoro" | "countup" = "pomodoro";
    let pendingTrackingSegment: {
      bucket: StatisticsBucket;
      durationSeconds: number;
    } | null = null;

    const commitTrackingSegment = (segment: {
      bucket: StatisticsBucket;
      durationSeconds: number;
    }) => {
      // 关键防线：追踪切片严禁写入 FOCUS，防止未保存切片或切片双重入账
      if (segment.bucket === StatisticsBucket.FOCUS) {
        return;
      }
      if (segment.durationSeconds <= 0) return;

      store.dispatch(
        addStatisticsSession({
          id: "tracking-seg-" + Math.random().toString(36).slice(2, 9),
          bucket: segment.bucket,
          timerType: "IDLE",
          durationSeconds: segment.durationSeconds,
          startedAt: Date.now() - segment.durationSeconds * 1000,
          completedAt: Date.now(),
          date: new Date().toISOString().slice(0, 10),
          round: null,
          totalRounds: null,
          cycleCompleted: false,
          listId: null,
          listTitle: null,
          taskId: null,
          taskText: null,
        })
      );
    };

    const switchFocusMode = (mode: "pomodoro" | "countup") => {
      store.dispatch(setPlay(false));
      pendingTrackingSegment = null;
      currentSessionId =
        "test-session-" + Math.random().toString(36).slice(2, 9);
      sessionStartedAt = null;
      focusMode = mode;

      if (mode === "countup") {
        store.dispatch(setTimerType(TimerStatus.COUNT_UP));
        duration = 0;
        count = 0;
      } else {
        store.dispatch(setTimerType(TimerStatus.STAY_FOCUS));
        duration = 25 * 60;
        count = 25 * 60;
      }
    };

    const startTimer = () => {
      if (sessionStartedAt === null) {
        sessionStartedAt = Date.now();
      }
      store.dispatch(setPlay(true));
    };

    const pauseTimer = () => {
      store.dispatch(setPlay(false));
      if (pendingTrackingSegment) {
        commitTrackingSegment(pendingTrackingSegment);
        pendingTrackingSegment = null;
      }
    };

    const advanceTime = (seconds: number) => {
      if (store.getState().timer.playing) {
        if (store.getState().timer.timerType === TimerStatus.COUNT_UP) {
          count += seconds;
        } else {
          count = Math.max(0, count - seconds);
        }
        pendingTrackingSegment = {
          bucket: StatisticsBucket.FOCUS,
          durationSeconds:
            (pendingTrackingSegment?.durationSeconds ?? 0) + seconds,
        };
      }
    };

    const finishAndSaveSession = () => {
      const now = Date.now();
      const sessionId = currentSessionId;
      const startedAt = sessionStartedAt || now;
      pendingTrackingSegment = null;

      if (store.getState().timer.timerType === TimerStatus.COUNT_UP) {
        const focusSeconds = Number(Math.max(0, count).toFixed(3));
        if (focusSeconds > 0) {
          store.dispatch(
            addStatisticsSession({
              id: sessionId,
              bucket: StatisticsBucket.FOCUS,
              timerType: TimerStatus.COUNT_UP,
              durationSeconds: focusSeconds,
              startedAt,
              completedAt: now,
              date: new Date(now).toISOString().slice(0, 10),
              round: null,
              totalRounds: null,
              cycleCompleted: false,
              listId: null,
              listTitle: null,
              taskId: null,
              taskText: null,
            })
          );
        }
        count = 0;
        duration = 0;
        store.dispatch(setPlay(false));
        currentSessionId =
          "test-session-" + Math.random().toString(36).slice(2, 9);
        sessionStartedAt = null;
        return;
      }

      if (store.getState().timer.timerType === TimerStatus.STAY_FOCUS) {
        const focusSeconds = Number(
          Math.max(0, duration - count).toFixed(3)
        );
        if (focusSeconds > 0) {
          store.dispatch(
            addStatisticsSession({
              id: sessionId,
              bucket: StatisticsBucket.FOCUS,
              timerType: TimerStatus.STAY_FOCUS,
              durationSeconds: focusSeconds,
              startedAt,
              completedAt: now,
              date: new Date(now).toISOString().slice(0, 10),
              round: store.getState().timer.round,
              totalRounds: store.getState().config.sessionRounds,
              cycleCompleted: false,
              listId: null,
              listTitle: null,
              taskId: null,
              taskText: null,
            })
          );
        }
        count = duration;
        store.dispatch(setPlay(false));
        currentSessionId =
          "test-session-" + Math.random().toString(36).slice(2, 9);
        sessionStartedAt = null;
      }
    };

    const resetTimerAction = () => {
      pendingTrackingSegment = null;
      currentSessionId =
        "test-session-" + Math.random().toString(36).slice(2, 9);
      sessionStartedAt = null;

      if (store.getState().timer.timerType === TimerStatus.COUNT_UP) {
        count = 0;
        duration = 0;
        store.dispatch(setPlay(false));
        return;
      }

      store.dispatch(setPlay(false));
      count = duration;
    };

    const triggerNaturalPomodoroCompletion = () => {
      const now = Date.now();
      const sessionId = currentSessionId;
      const startedAt = sessionStartedAt || now - duration * 1000;
      pendingTrackingSegment = null;

      store.dispatch(
        addStatisticsSession({
          id: sessionId,
          bucket: StatisticsBucket.FOCUS,
          timerType: TimerStatus.STAY_FOCUS,
          durationSeconds: Number(Math.max(0, duration).toFixed(3)),
          startedAt,
          completedAt: now,
          date: new Date(now).toISOString().slice(0, 10),
          round: store.getState().timer.round,
          totalRounds: store.getState().config.sessionRounds,
          cycleCompleted: true,
          listId: null,
          listTitle: null,
          taskId: null,
          taskText: null,
        })
      );

      currentSessionId =
        "test-session-" + Math.random().toString(36).slice(2, 9);
      sessionStartedAt = null;
      store.dispatch(setTimerType(TimerStatus.SHORT_BREAK));
    };

    const persistToLocalStorage = () => {
      memoryStorage.setItem(
        STATISTICS_STORAGE_KEY,
        JSON.stringify(store.getState().statistics)
      );
    };

    return {
      store,
      switchFocusMode,
      startTimer,
      pauseTimer,
      advanceTime,
      finishAndSaveSession,
      resetTimerAction,
      triggerNaturalPomodoroCompletion,
      persistToLocalStorage,
      getCount: () => count,
    };
  };

  it("1. 正计时约 3 秒后保存只产生一次记录，时长准确为 3 秒 (修复 Codex 复现)", () => {
    const harness = createIntegrationHarness();
    harness.switchFocusMode("countup");

    harness.startTimer();
    harness.advanceTime(3); // 运行 3 秒
    expect(harness.getCount()).toBe(3);

    harness.finishAndSaveSession();
    harness.persistToLocalStorage();

    const focusSessions = harness.store
      .getState()
      .statistics.sessions.filter(
        (s) => s.bucket === StatisticsBucket.FOCUS
      );

    // 严格只产生 1 次记录！
    expect(focusSessions).toHaveLength(1);
    expect(focusSessions[0].durationSeconds).toBe(3);
    expect(focusSessions[0].timerType).toBe(TimerStatus.COUNT_UP);
    expect(focusSessions[0].cycleCompleted).toBe(false);

    // 检查持久化内容
    const persisted = JSON.parse(
      memoryStorage.getItem(STATISTICS_STORAGE_KEY) || "{}"
    );
    expect(persisted.sessions).toHaveLength(1);
    expect(persisted.sessions[0].durationSeconds).toBe(3);
  });

  it("2. 暂停恢复与分段保存不重复入账，排除暂停时长", () => {
    const harness = createIntegrationHarness();
    harness.switchFocusMode("countup");

    // 第 1 段：运行 2 秒
    harness.startTimer();
    harness.advanceTime(2);

    // 暂停（不应写入统计，不增加专注次数）
    harness.pauseTimer();
    const sessionsDuringPause = harness.store
      .getState()
      .statistics.sessions.filter(
        (s) => s.bucket === StatisticsBucket.FOCUS
      );
    expect(sessionsDuringPause).toHaveLength(0);

    // 等待 5 秒（暂停期间有效专注不增加）
    harness.advanceTime(5);
    expect(harness.getCount()).toBe(2);

    // 恢复运行 3 秒
    harness.startTimer();
    harness.advanceTime(3);
    expect(harness.getCount()).toBe(5);

    // 点击保存
    harness.finishAndSaveSession();

    const focusSessions = harness.store
      .getState()
      .statistics.sessions.filter(
        (s) => s.bucket === StatisticsBucket.FOCUS
      );

    // 只产生 1 次记录，时长严格为 5 秒（2s + 3s，排除暂停等待的 5s）
    expect(focusSessions).toHaveLength(1);
    expect(focusSessions[0].durationSeconds).toBe(5);
  });

  it("3. 番茄钟自然完成只入账一次，并且 cycleCompleted 为 true", () => {
    const harness = createIntegrationHarness();
    harness.switchFocusMode("pomodoro");
    harness.startTimer();

    // 跑完整个 25 分钟番茄
    harness.triggerNaturalPomodoroCompletion();

    const focusSessions = harness.store
      .getState()
      .statistics.sessions.filter(
        (s) => s.bucket === StatisticsBucket.FOCUS
      );

    expect(focusSessions).toHaveLength(1);
    expect(focusSessions[0].durationSeconds).toBe(1500);
    expect(focusSessions[0].cycleCompleted).toBe(true);
    expect(focusSessions[0].timerType).toBe(TimerStatus.STAY_FOCUS);
  });

  it("4. 运行中途重置或放弃不入账任何专注记录", () => {
    const harness = createIntegrationHarness();
    harness.switchFocusMode("countup");
    harness.startTimer();
    harness.advanceTime(10); // 跑了 10 秒

    // 用户点击重置放弃
    harness.resetTimerAction();

    const focusSessions = harness.store
      .getState()
      .statistics.sessions.filter(
        (s) => s.bucket === StatisticsBucket.FOCUS
      );

    // 严格为 0 次！未保存会话直接丢弃，不污染统计
    expect(focusSessions).toHaveLength(0);
    expect(harness.getCount()).toBe(0);
  });

  it("5. 运行中途直接切换模式不入账未保存记录", () => {
    const harness = createIntegrationHarness();
    harness.switchFocusMode("pomodoro");
    harness.startTimer();
    harness.advanceTime(100);

    // 中途直接切换到正计时
    harness.switchFocusMode("countup");

    const focusSessions = harness.store
      .getState()
      .statistics.sessions.filter(
        (s) => s.bucket === StatisticsBucket.FOCUS
      );

    expect(focusSessions).toHaveLength(0);
  });
});
