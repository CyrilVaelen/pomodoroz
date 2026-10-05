import { beforeEach, describe, expect, it, vi } from "vitest";

const uuidV4Mock = vi.hoisted(() => vi.fn());

vi.mock("uuid", () => ({
  v4: uuidV4Mock,
}));

import type { TaskList } from "store/tasks/types";
import {
  buildTasksTransferFile,
  parseTasksTransferFile,
  TASKS_TRANSFER_VERSION,
} from "./tasksTransfer";

describe("tasks transfer utilities", () => {
  beforeEach(() => {
    uuidV4Mock.mockReset();
  });

  it("exports prioritized cards in the task transfer file", () => {
    const taskLists: TaskList[] = [
      {
        _id: "list-id-1",
        title: "FOCUS",
        priority: true,
        dayColor: null,
        dayColorDate: null,
        cards: [
          {
            _id: "task-id-1",
            text: "Review plan",
            description: "Check B1 scope",
            done: false,
            prioritized: true,
            dayColor: null,
            dayColorDate: null,
          },
        ],
      },
    ];

    expect(buildTasksTransferFile(taskLists)).toEqual({
      version: TASKS_TRANSFER_VERSION,
      lists: [
        {
          title: "FOCUS",
          priority: true,
          cards: [
            {
              text: "Review plan",
              description: "Check B1 scope",
              done: false,
              prioritized: true,
              importance: 3,
              urgency: 3,
              schedule: null,
              completedDates: {},
            },
          ],
        },
      ],
    });
  });

  it("imports older task files without priority or matrix fields with default values", () => {
    uuidV4Mock
      .mockReturnValueOnce("task-id-1")
      .mockReturnValueOnce("list-id-1");

    const result = parseTasksTransferFile(
      JSON.stringify({
        version: 1,
        lists: [
          {
            title: "FOCUS",
            priority: true,
            cards: [
              {
                text: "Review plan",
                description: "",
                done: false,
              },
            ],
          },
        ],
      })
    );

    expect(result).toEqual({
      ok: true,
      data: {
        version: 1,
        listCount: 1,
        cardCount: 1,
        lists: [
          {
            _id: "list-id-1",
            title: "FOCUS",
            priority: true,
            dayColor: null,
            dayColorDate: null,
            cards: [
              {
                _id: "task-id-1",
                text: "Review plan",
                description: "",
                done: false,
                prioritized: false,
                importance: 3,
                urgency: 3,
                schedule: null,
                completedDates: {},
                dayColor: null,
                dayColorDate: null,
              },
            ],
          },
        ],
      },
    });
  });

  it("supports full round-trip export and import with ratings, weekly/monthly/daily schedules and completedDates", () => {
    uuidV4Mock
      .mockReturnValueOnce("imported-card-1")
      .mockReturnValueOnce("imported-card-2")
      .mockReturnValueOnce("imported-card-3")
      .mockReturnValueOnce("imported-list-1");

    const originalLists: TaskList[] = [
      {
        _id: "orig-list-1",
        title: "Sprint Tasks",
        priority: true,
        dayColor: null,
        dayColorDate: null,
        cards: [
          {
            _id: "orig-card-1",
            text: "Weekly routine",
            description: "Weekly gym & sync",
            done: false,
            prioritized: true,
            importance: 4,
            urgency: 5,
            schedule: {
              type: "weekly",
              selectedWeeks: ["2026-10-05", "2026-10-19"],
              daysOfWeek: [1, 3, 5],
            },
            completedDates: { "2026-10-05": true, "2026-10-07": false },
            dayColor: null,
            dayColorDate: null,
          },
          {
            _id: "orig-card-2",
            text: "Monthly audit",
            description: "Check bills",
            done: true,
            prioritized: false,
            importance: 1,
            urgency: 2,
            schedule: {
              type: "monthly",
              selectedDates: ["2026-10-01", "2026-10-15"],
            },
            completedDates: { "2026-10-01": true },
            dayColor: null,
            dayColorDate: null,
          },
          {
            _id: "orig-card-3",
            text: "Daily sprint",
            description: "Continuous 14 days",
            done: false,
            prioritized: false,
            importance: 5,
            urgency: 4,
            schedule: {
              type: "daily",
              startDate: "2026-10-04",
              daysCount: 14,
            },
            completedDates: {},
            dayColor: null,
            dayColorDate: null,
          },
        ],
      },
    ];

    const exportFile = buildTasksTransferFile(originalLists);
    expect(exportFile.version).toBe(TASKS_TRANSFER_VERSION);
    expect(exportFile.lists[0].cards[0].importance).toBe(4);
    expect(exportFile.lists[0].cards[0].urgency).toBe(5);
    expect(exportFile.lists[0].cards[0].schedule).toEqual({
      type: "weekly",
      selectedWeeks: ["2026-10-05", "2026-10-19"],
      daysOfWeek: [1, 3, 5],
    });
    expect(exportFile.lists[0].cards[0].completedDates).toEqual({
      "2026-10-05": true,
      "2026-10-07": false,
    });

    const jsonStr = JSON.stringify(exportFile);
    const parsed = parseTasksTransferFile(jsonStr);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.data.version).toBe(TASKS_TRANSFER_VERSION);
    expect(parsed.data.listCount).toBe(1);
    expect(parsed.data.cardCount).toBe(3);

    const importedCards = parsed.data.lists[0].cards;
    expect(importedCards[0]).toEqual({
      _id: "imported-card-1",
      text: "Weekly routine",
      description: "Weekly gym & sync",
      done: false,
      prioritized: true,
      importance: 4,
      urgency: 5,
      schedule: {
        type: "weekly",
        selectedWeeks: ["2026-10-05", "2026-10-19"],
        daysOfWeek: [1, 3, 5],
      },
      completedDates: { "2026-10-05": true, "2026-10-07": false },
      dayColor: null,
      dayColorDate: null,
    });

    expect(importedCards[1]).toEqual({
      _id: "imported-card-2",
      text: "Monthly audit",
      description: "Check bills",
      done: true,
      prioritized: false,
      importance: 1,
      urgency: 2,
      schedule: {
        type: "monthly",
        selectedDates: ["2026-10-01", "2026-10-15"],
      },
      completedDates: { "2026-10-01": true },
      dayColor: null,
      dayColorDate: null,
    });

    expect(importedCards[2]).toEqual({
      _id: "imported-card-3",
      text: "Daily sprint",
      description: "Continuous 14 days",
      done: false,
      prioritized: false,
      importance: 5,
      urgency: 4,
      schedule: {
        type: "daily",
        startDate: "2026-10-04",
        daysCount: 14,
      },
      completedDates: {},
      dayColor: null,
      dayColorDate: null,
    });
  });
});
