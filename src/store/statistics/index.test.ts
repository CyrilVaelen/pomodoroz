import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { StatisticsBucket } from "./types";
import { TimerStatus } from "../timer/types";
import type { StatisticsSessionRecord } from "./types";

describe("statistics slice", () => {
  const baseSession: StatisticsSessionRecord = {
    id: "session-1",
    bucket: StatisticsBucket.FOCUS,
    timerType: TimerStatus.STAY_FOCUS,
    durationSeconds: 1500,
    startedAt: Date.now() - 1500 * 1000,
    completedAt: Date.now(),
    date: "2026-10-04",
    round: 1,
    totalRounds: 4,
    cycleCompleted: true,
    taskId: "t-1",
    taskText: "Task 1",
    listId: "l-1",
    listTitle: "List 1",
  };

  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("ignores sessions with duration <= 0", async () => {
    const { default: statisticsReducer, addStatisticsSession } =
      await import("./index");
    const initialState = { sessions: [] };
    const state = statisticsReducer(
      initialState,
      addStatisticsSession({ ...baseSession, durationSeconds: 0 })
    );
    expect(state.sessions).toHaveLength(0);
  });

  it("adds new session correctly", async () => {
    const { default: statisticsReducer, addStatisticsSession } =
      await import("./index");
    const initialState = { sessions: [] };
    const state = statisticsReducer(
      initialState,
      addStatisticsSession(baseSession)
    );
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].id).toBe("session-1");
    expect(state.sessions[0].durationSeconds).toBe(1500);
  });

  it("updates existing session idempotently when session.id is identical", async () => {
    const { default: statisticsReducer, addStatisticsSession } =
      await import("./index");
    const initialState = { sessions: [baseSession] };
    const updatedSession: StatisticsSessionRecord = {
      ...baseSession,
      durationSeconds: 1800,
    };
    const state = statisticsReducer(
      initialState,
      addStatisticsSession(updatedSession)
    );
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].durationSeconds).toBe(1800);
  });

  it("keeps different sessions separate even if task and date match", async () => {
    const { default: statisticsReducer, addStatisticsSession } =
      await import("./index");
    const session2: StatisticsSessionRecord = {
      ...baseSession,
      id: "session-2",
      round: 2,
    };
    const state = statisticsReducer(
      { sessions: [baseSession] },
      addStatisticsSession(session2)
    );
    expect(state.sessions).toHaveLength(2);
    expect(state.sessions[0].id).toBe("session-1");
    expect(state.sessions[1].id).toBe("session-2");
  });

  it("clears statistics", async () => {
    const { default: statisticsReducer, clearStatistics } =
      await import("./index");
    const state = statisticsReducer(
      { sessions: [baseSession] },
      clearStatistics()
    );
    expect(state.sessions).toHaveLength(0);
  });
});
