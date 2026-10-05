import { describe, it, expect } from "vitest";
import { syncEngine } from "./syncEngine";
import type { TaskList } from "store/tasks/types";
import type { CloudTaskList, CloudTask } from "./types";
import store, { addStatisticsSession } from "store";
import { StatisticsBucket } from "store/statistics/types";
import { TimerStatus } from "store/timer/types";

describe("syncEngine", () => {
  it("merges local and remote task data with union completedDates", () => {
    const localLists: TaskList[] = [
      {
        _id: "list-a",
        title: "Local Title",
        priority: true,
        dayColor: null,
        dayColorDate: null,
        cards: [
          {
            _id: "card-1",
            text: "Card 1 local",
            description: "Desc local",
            done: false,
            prioritized: true,
            importance: 4,
            urgency: 2,
            completedDates: { "2026-10-01": true },
          },
        ],
      },
    ];

    const remoteLists: CloudTaskList[] = [
      {
        user_id: "user-1",
        id: "list-a",
        title: "Remote Title",
        priority: true,
        position: 0,
        day_color: null,
        day_color_date: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      },
      {
        user_id: "user-1",
        id: "list-b",
        title: "Remote List B",
        priority: false,
        position: 1,
        day_color: null,
        day_color_date: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      },
    ];

    const remoteTasks: CloudTask[] = [
      {
        user_id: "user-1",
        id: "card-1",
        list_id: "list-a",
        text: "Card 1 updated remotely",
        description: "Desc remote",
        done: true,
        prioritized: true,
        position: 0,
        importance: 4,
        urgency: 5,
        schedule: {
          type: "weekly",
          selectedWeeks: ["2026-10-05"],
          daysOfWeek: [1, 3],
        },
        completed_dates: { "2026-10-05": true },
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      },
      {
        user_id: "user-1",
        id: "card-2",
        list_id: "list-b",
        text: "Card 2 remote only",
        description: "",
        done: false,
        prioritized: false,
        position: 0,
        importance: 3,
        urgency: 3,
        schedule: null,
        completed_dates: {},
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      },
    ];

    const merged = syncEngine.mergeTaskData(
      localLists,
      remoteLists,
      remoteTasks
    );

    expect(merged.length).toBe(2);

    const listA = merged.find((l) => l._id === "list-a");
    expect(listA).toBeDefined();
    expect(listA?.cards.length).toBe(1);

    const card1 = listA?.cards[0];
    expect(card1?.text).toBe("Card 1 updated remotely");
    // completedDates 取并集
    expect(card1?.completedDates?.["2026-10-01"]).toBe(true);
    expect(card1?.completedDates?.["2026-10-05"]).toBe(true);
    // 计划结构保留
    expect(card1?.schedule).toEqual({
      type: "weekly",
      selectedWeeks: ["2026-10-05"],
      daysOfWeek: [1, 3],
    });

    const listB = merged.find((l) => l._id === "list-b");
    expect(listB).toBeDefined();
    expect(listB?.cards.length).toBe(1);
    expect(listB?.cards[0]._id).toBe("card-2");
  });

  it("ensures focus sessions with stable sessionId are idempotent", () => {
    const session = {
      id: "stable-session-uuid-12345",
      bucket: StatisticsBucket.FOCUS,
      timerType: TimerStatus.STAY_FOCUS,
      durationSeconds: 1500,
      startedAt: 10000,
      completedAt: 11500,
      date: "2026-10-05",
      round: 1,
      totalRounds: 4,
      cycleCompleted: true,
      taskId: "task-1",
      taskText: "Work on Task",
      listId: "list-1",
      listTitle: "Inbox",
    };

    // 第一次添加
    store.dispatch(addStatisticsSession(session));
    const countAfterFirst = store.getState().statistics.sessions.length;

    // 重复提交同一 session.id（模拟网络重试或同步拉取）
    store.dispatch(addStatisticsSession(session));
    const countAfterSecond =
      store.getState().statistics.sessions.length;

    expect(countAfterSecond).toBe(countAfterFirst);
  });
});
