import { describe, it, expect, beforeEach } from "vitest";
import {
  createWorkbenchBackup,
  validateWorkbenchBackup,
  applyWorkbenchBackup,
  rollbackWorkbenchBackup,
  WORKBENCH_BACKUP_VERSION,
  PomodorozWorkbenchBackup,
} from "./workbenchTransfer";
import store, { setTaskLists, addStatisticsSession } from "store";
import { StatisticsBucket } from "store/statistics/types";
import { TimerStatus } from "store/timer/types";

describe("workbenchTransfer", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
    store.dispatch(setTaskLists([]));
  });

  it("exports valid workbench backup structure", () => {
    const backup = createWorkbenchBackup();
    expect(backup.app).toBe("pomodoroz");
    expect(backup.version).toBe(WORKBENCH_BACKUP_VERSION);
    expect(backup.schemaVersion).toBe(1);
    expect(Array.isArray(backup.tasks)).toBe(true);
    expect(Array.isArray(backup.statistics.sessions)).toBe(true);
    expect(typeof backup.settings).toBe("object");
  });

  it("validates legitimate and corrupted backup files", () => {
    const validData: PomodorozWorkbenchBackup = {
      app: "pomodoroz",
      version: 1,
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      settings: {},
      tasks: [
        {
          _id: "list-1",
          title: "Inbox",
          cards: [
            {
              _id: "card-1",
              text: "Task 1",
              description: "Desc",
              done: false,
              prioritized: false,
              importance: 4,
              urgency: 5,
              completedDates: { "2026-10-05": true },
            },
          ],
          priority: false,
          dayColor: null,
          dayColorDate: null,
        },
      ],
      statistics: {
        sessions: [
          {
            id: "sess-1",
            bucket: StatisticsBucket.FOCUS,
            timerType: TimerStatus.STAY_FOCUS,
            durationSeconds: 1500,
            startedAt: 1000,
            completedAt: 2500,
            date: "2026-10-05",
            round: 1,
            totalRounds: 4,
            cycleCompleted: false,
            taskId: "card-1",
            taskText: "Task 1",
            listId: "list-1",
            listTitle: "Inbox",
          },
        ],
      },
    };

    const validResult = validateWorkbenchBackup(validData);
    expect(validResult.ok).toBe(true);
    if (validResult.ok) {
      expect(validResult.summary.listCount).toBe(1);
      expect(validResult.summary.taskCount).toBe(1);
      expect(validResult.summary.sessionCount).toBe(1);
    }

    // 非法版本或格式
    expect(validateWorkbenchBackup(null).ok).toBe(false);
    expect(
      validateWorkbenchBackup({ app: "other", version: 1 }).ok
    ).toBe(false);
    expect(
      validateWorkbenchBackup({ app: "pomodoroz", version: 999 }).ok
    ).toBe(false);
    expect(
      validateWorkbenchBackup({
        app: "pomodoroz",
        version: 1,
        tasks: "not-array",
      }).ok
    ).toBe(false);
  });

  it("applies backup idempotently and supports rollback", async () => {
    // 预置本地任务
    store.dispatch(
      setTaskLists([
        {
          _id: "local-list",
          title: "Local List",
          cards: [
            {
              _id: "c-1",
              text: "Local Card",
              description: "Local Desc",
              done: false,
              prioritized: false,
              completedDates: { "2026-10-04": true },
            },
          ],
          priority: false,
          dayColor: null,
          dayColorDate: null,
        },
      ])
    );

    const incomingBackup: PomodorozWorkbenchBackup = {
      app: "pomodoroz",
      version: 1,
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      settings: {},
      tasks: [
        {
          _id: "local-list",
          title: "Local List Renamed",
          cards: [
            {
              _id: "c-1",
              text: "Local Card Updated",
              description: "Desc Updated",
              done: false,
              prioritized: false,
              importance: 4,
              urgency: 4,
              completedDates: { "2026-10-05": true }, // 另一天打卡
            },
            {
              _id: "c-2",
              text: "New Remote Card",
              description: "",
              done: false,
              prioritized: false,
              importance: 3,
              urgency: 3,
              completedDates: {},
            },
          ],
          priority: false,
          dayColor: null,
          dayColorDate: null,
        },
      ],
      statistics: {
        sessions: [
          {
            id: "session-unique-1",
            bucket: StatisticsBucket.FOCUS,
            timerType: TimerStatus.STAY_FOCUS,
            durationSeconds: 1500,
            startedAt: 1000,
            completedAt: 2500,
            date: "2026-10-05",
            round: 1,
            totalRounds: 4,
            cycleCompleted: false,
            taskId: "c-1",
            taskText: "Local Card",
            listId: "local-list",
            listTitle: "Local List",
          },
        ],
      },
    };

    const result = await applyWorkbenchBackup(incomingBackup);
    expect(result.success).toBe(true);
    expect(result.importedLists).toBe(1);
    expect(result.importedTasks).toBe(2);
    expect(result.importedSessions).toBe(1);

    const currentState = store.getState().tasks.present;
    expect(currentState.length).toBe(1);
    expect(currentState[0].cards.length).toBe(2);

    const mergedCard = currentState[0].cards.find(
      (c) => c._id === "c-1"
    );
    expect(mergedCard?.text).toBe("Local Card Updated");
    // completedDates 必须为并集：包含 10-04 和 10-05
    expect(mergedCard?.completedDates?.["2026-10-04"]).toBe(true);
    expect(mergedCard?.completedDates?.["2026-10-05"]).toBe(true);

    // 测试回滚
    const rollbackSuccess = rollbackWorkbenchBackup();
    expect(rollbackSuccess).toBe(true);
    const rolledBackState = store.getState().tasks.present;
    expect(rolledBackState[0].cards.length).toBe(1);
    expect(rolledBackState[0].cards[0].text).toBe("Local Card");
    expect(
      rolledBackState[0].cards[0].completedDates?.["2026-10-04"]
    ).toBe(true);
    expect(
      rolledBackState[0].cards[0].completedDates?.["2026-10-05"]
    ).toBeUndefined();
  });
});
