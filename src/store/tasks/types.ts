import type { PayloadAction } from "@reduxjs/toolkit";

export type ListPayload<T extends keyof TaskList> = PayloadAction<
  TaskList[T]
>;
export type TaskPayload<T extends keyof Task> = PayloadAction<Task[T]>;

export type WeeklySchedule = {
  type: "weekly";
  /** 选中的具体周（存储周一起始日期 YYYY-MM-DD） */
  selectedWeeks: string[];
  /** 选中的星期几（1=周一, 2=周二, ..., 7=周日） */
  daysOfWeek: number[];
};

export type MonthlySchedule = {
  type: "monthly";
  /** 各月点选的具体日期集合（YYYY-MM-DD） */
  selectedDates: string[];
};

export type DailySchedule = {
  type: "daily";
  /** 开始日期（YYYY-MM-DD） */
  startDate: string;
  /** 连续执行天数 N */
  daysCount: number;
};

export type TaskSchedule =
  WeeklySchedule | MonthlySchedule | DailySchedule;

export type Task = {
  _id: string;
  text: string;
  description: string;
  done: boolean;
  prioritized: boolean;
  dayColor?: DayColor;
  dayColorDate?: string | null;
  /** 重要性分值：1–5，向右递增，默认 3 */
  importance?: number;
  /** 紧急性分值：1–5，向上递增，默认 3 */
  urgency?: number;
  /** 明确日期计划（若无则为未安排日期任务） */
  schedule?: TaskSchedule | null;
  /** 按日期（YYYY-MM-DD）独立记录完成状态 */
  completedDates?: Record<string, boolean>;
};

export type DayColor = "green" | "red" | null;

export type TaskList = {
  _id: string;
  title: string;
  cards: Task[];
  priority: boolean;
  dayColor: DayColor;
  dayColorDate: string | null;
};
