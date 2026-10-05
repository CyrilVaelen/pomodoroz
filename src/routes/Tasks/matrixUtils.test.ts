import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDateKey,
  getClampedScore,
  getDayOfWeekIndex,
  getMondayOfWeek,
  getQuadrant,
  getTasksForDate,
  getUndatedTasks,
  isTaskCompletedOnDate,
  isTaskScheduledForDate,
  isTaskUndated,
  parseDateKey,
} from "./matrixUtils";
import type { Task, TaskList } from "store/tasks/types";

describe("matrixUtils", () => {
  describe("日期与周辅助函数", () => {
    it("正确计算指定日期所在周的周一", () => {
      // 2026-10-05 是周一
      expect(getMondayOfWeek("2026-10-05")).toBe("2026-10-05");
      // 2026-10-07 是周三，所在周一为 2026-10-05
      expect(getMondayOfWeek("2026-10-07")).toBe("2026-10-05");
      // 2026-10-11 是周日，所在周一为 2026-10-05
      expect(getMondayOfWeek("2026-10-11")).toBe("2026-10-05");
      // 2026-10-12 是下一周周一
      expect(getMondayOfWeek("2026-10-12")).toBe("2026-10-12");
    });

    it("正确获取星期几（1=周一至7=周日）", () => {
      expect(getDayOfWeekIndex("2026-10-05")).toBe(1); // 周一
      expect(getDayOfWeekIndex("2026-10-07")).toBe(3); // 周三
      expect(getDayOfWeekIndex("2026-10-11")).toBe(7); // 周日
    });

    it("正确增减日期", () => {
      expect(addDays("2026-10-05", 0)).toBe("2026-10-05");
      expect(addDays("2026-10-05", 5)).toBe("2026-10-10");
      expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
      // 闰年 2024-02-28 + 1 -> 2024-02-29
      expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
      expect(addDays("2024-02-28", 2)).toBe("2024-03-01");
    });
  });

  describe("评分与象限映射 (1–2 低，3–5 高)", () => {
    it("规范化评分分值为 1–5", () => {
      expect(getClampedScore(0)).toBe(1);
      expect(getClampedScore(-5)).toBe(1);
      expect(getClampedScore(6)).toBe(5);
      expect(getClampedScore(3.4)).toBe(3);
      expect(getClampedScore(undefined)).toBe(3);
      expect(getClampedScore(NaN)).toBe(3);
    });

    it("精准映射 25 个评分组合到四象限", () => {
      // 门槛：1-2 低，3-5 高
      // Q1: 重要且紧急 (Imp >= 3, Urg >= 3)
      // Q2: 紧急不重要 (Imp <= 2, Urg >= 3)
      // Q3: 不重要不紧急 (Imp <= 2, Urg <= 2)
      // Q4: 重要不紧急 (Imp >= 3, Urg <= 2)
      for (let imp = 1; imp <= 5; imp++) {
        for (let urg = 1; urg <= 5; urg++) {
          const quad = getQuadrant(imp, urg);
          if (imp >= 3 && urg >= 3) {
            expect(quad).toBe("Q1");
          } else if (imp <= 2 && urg >= 3) {
            expect(quad).toBe("Q2");
          } else if (imp <= 2 && urg <= 2) {
            expect(quad).toBe("Q3");
          } else {
            expect(quad).toBe("Q4");
          }
        }
      }
    });

    it("检验门槛分水岭边界 (2 和 3)", () => {
      expect(getQuadrant(2, 2)).toBe("Q3");
      expect(getQuadrant(3, 3)).toBe("Q1");
      expect(getQuadrant(2, 3)).toBe("Q2");
      expect(getQuadrant(3, 2)).toBe("Q4");
    });
  });

  describe("计划匹配判定", () => {
    it("未设置计划的任务属于未排期", () => {
      const task: Task = {
        _id: "t1",
        text: "无计划任务",
        description: "",
        done: false,
        prioritized: false,
      };
      expect(isTaskUndated(task)).toBe(true);
      expect(isTaskScheduledForDate(task, "2026-10-05")).toBe(false);
    });

    it("周计划：支持跳过周与指定星期", () => {
      // 计划：第41周（2026-10-05所在周）和第43周（2026-10-19所在周）的周二(2)和周四(4)
      const task: Task = {
        _id: "t-weekly",
        text: "跳周例会",
        description: "",
        done: false,
        prioritized: false,
        schedule: {
          type: "weekly",
          selectedWeeks: ["2026-10-05", "2026-10-19"],
          daysOfWeek: [2, 4], // 周二, 周四
        },
      };

      // 2026-10-06 是第41周周二 -> 匹配
      expect(isTaskScheduledForDate(task, "2026-10-06")).toBe(true);
      // 2026-10-08 是第41周周四 -> 匹配
      expect(isTaskScheduledForDate(task, "2026-10-08")).toBe(true);
      // 2026-10-05 是第41周周一 -> 不匹配（星期不对）
      expect(isTaskScheduledForDate(task, "2026-10-05")).toBe(false);

      // 2026-10-13 是被跳过的第42周周二 -> 不匹配（周被跳过）
      expect(isTaskScheduledForDate(task, "2026-10-13")).toBe(false);

      // 2026-10-20 是第43周周二 -> 匹配
      expect(isTaskScheduledForDate(task, "2026-10-20")).toBe(true);
    });

    it("月计划：各月分别点选具体日期，相邻月互不套用", () => {
      const task: Task = {
        _id: "t-monthly",
        text: "月度核算",
        description: "",
        done: false,
        prioritized: false,
        schedule: {
          type: "monthly",
          selectedDates: ["2026-10-15", "2026-10-31", "2026-11-20"],
        },
      };

      expect(isTaskScheduledForDate(task, "2026-10-15")).toBe(true);
      expect(isTaskScheduledForDate(task, "2026-10-31")).toBe(true);
      // 11月15日未点选 -> 不匹配
      expect(isTaskScheduledForDate(task, "2026-11-15")).toBe(false);
      // 11月20日已点选 -> 匹配
      expect(isTaskScheduledForDate(task, "2026-11-20")).toBe(true);
    });

    it("每日计划：从开始日期连续执行未来 N 天", () => {
      const task: Task = {
        _id: "t-daily",
        text: "连续打卡",
        description: "",
        done: false,
        prioritized: false,
        schedule: {
          type: "daily",
          startDate: "2026-10-01",
          daysCount: 3, // 10-01, 10-02, 10-03
        },
      };

      expect(isTaskScheduledForDate(task, "2026-09-30")).toBe(false);
      expect(isTaskScheduledForDate(task, "2026-10-01")).toBe(true); // 首日
      expect(isTaskScheduledForDate(task, "2026-10-02")).toBe(true);
      expect(isTaskScheduledForDate(task, "2026-10-03")).toBe(true); // 末日
      expect(isTaskScheduledForDate(task, "2026-10-04")).toBe(false); // 超出
    });
  });

  describe("独立日期完成状态", () => {
    it("有计划的任务在不同日期独立保存完成状态", () => {
      const task: Task = {
        _id: "t1",
        text: "健身",
        description: "",
        done: false,
        prioritized: false,
        schedule: {
          type: "daily",
          startDate: "2026-10-01",
          daysCount: 5,
        },
        completedDates: {
          "2026-10-01": true,
          "2026-10-02": false,
        },
      };

      expect(isTaskCompletedOnDate(task, "2026-10-01")).toBe(true);
      expect(isTaskCompletedOnDate(task, "2026-10-02")).toBe(false);
      expect(isTaskCompletedOnDate(task, "2026-10-03")).toBe(false);
    });

    it("未排期任务取全局 task.done", () => {
      const task: Task = {
        _id: "t-undated",
        text: "杂项",
        description: "",
        done: true,
        prioritized: false,
      };
      expect(isTaskCompletedOnDate(task, "2026-10-01")).toBe(true);
    });
  });

  describe("任务展平与分组层级保留", () => {
    it("正确提取指定日期的任务并保留所属一级标题", () => {
      const lists: TaskList[] = [
        {
          _id: "list-1",
          title: "工作项目",
          priority: true,
          dayColor: null,
          dayColorDate: null,
          cards: [
            {
              _id: "c1",
              text: "写报告",
              description: "重要说明",
              done: false,
              prioritized: false,
              importance: 5,
              urgency: 4,
              schedule: {
                type: "daily",
                startDate: "2026-10-05",
                daysCount: 2,
              },
              completedDates: { "2026-10-05": true },
            },
            {
              _id: "c2",
              text: "未来任务",
              description: "",
              done: false,
              prioritized: false,
              importance: 2,
              urgency: 2,
              schedule: {
                type: "daily",
                startDate: "2026-10-10",
                daysCount: 1,
              },
            },
          ],
        },
      ];

      const tasksOn05 = getTasksForDate(lists, "2026-10-05");
      expect(tasksOn05).toHaveLength(1);
      expect(tasksOn05[0].listTitle).toBe("工作项目");
      expect(tasksOn05[0].card.text).toBe("写报告");
      expect(tasksOn05[0].importance).toBe(5);
      expect(tasksOn05[0].urgency).toBe(4);
      expect(tasksOn05[0].isDoneOnDate).toBe(true);

      const tasksOn10 = getTasksForDate(lists, "2026-10-10");
      expect(tasksOn10).toHaveLength(1);
      expect(tasksOn10[0].card.text).toBe("未来任务");
      expect(tasksOn10[0].isDoneOnDate).toBe(false);
    });

    it("正确提取未排期任务", () => {
      const lists: TaskList[] = [
        {
          _id: "list-1",
          title: "备忘录",
          priority: false,
          dayColor: null,
          dayColorDate: null,
          cards: [
            {
              _id: "c-undated",
              text: "旧任务未排期",
              description: "Markdown 描述",
              done: false,
              prioritized: false,
            },
          ],
        },
      ];

      const undated = getUndatedTasks(lists);
      expect(undated).toHaveLength(1);
      expect(undated[0].listTitle).toBe("备忘录");
      expect(undated[0].card.text).toBe("旧任务未排期");
      expect(undated[0].importance).toBe(3);
      expect(undated[0].urgency).toBe(3);
    });
  });
});
