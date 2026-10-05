import type { Task, TaskList, TaskSchedule } from "store/tasks/types";

/**
 * 格式化 Date 为 YYYY-MM-DD
 */
export const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * 获取今天 YYYY-MM-DD
 */
export const getTodayDateKey = (): string => {
  return formatDateKey(new Date());
};

/**
 * 将 YYYY-MM-DD 解析为本地 Date
 */
export const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * 日期偏移加减天数
 */
export const addDays = (dateKey: string, days: number): string => {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
};

/**
 * 计算指定日期所在周的周一（YYYY-MM-DD）
 */
export const getMondayOfWeek = (dateKey: string): string => {
  const date = parseDateKey(dateKey);
  const day = date.getDay(); // 0 是周日, 1 是周一, ..., 6 是周六
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatDateKey(date);
};

/**
 * 获取星期几序号（1=周一, 2=周二, ..., 7=周日）
 */
export const getDayOfWeekIndex = (dateKey: string): number => {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

/**
 * 规范化评分分值（1–5 整数，默认 3）
 */
export const getClampedScore = (score?: number): number => {
  if (typeof score !== "number" || isNaN(score)) return 3;
  return Math.max(1, Math.min(5, Math.round(score)));
};

/**
 * 四象限标识与门槛定义：
 * 门槛：1–2 为低，3–5 为高
 * Q1: 重要且紧急 (Imp >= 3, Urg >= 3)
 * Q2: 紧急不重要 (Imp <= 2, Urg >= 3)
 * Q3: 不重要不紧急 (Imp <= 2, Urg <= 2)
 * Q4: 重要不紧急 (Imp >= 3, Urg <= 2)
 */
export type QuadrantId = "Q1" | "Q2" | "Q3" | "Q4";

export const getQuadrant = (
  importance?: number,
  urgency?: number
): QuadrantId => {
  const imp = getClampedScore(importance);
  const urg = getClampedScore(urgency);

  const isImpHigh = imp >= 3;
  const isUrgHigh = urg >= 3;

  if (isImpHigh && isUrgHigh) return "Q1";
  if (!isImpHigh && isUrgHigh) return "Q2";
  if (!isImpHigh && !isUrgHigh) return "Q3";
  return "Q4";
};

/**
 * 检查任务是否为未安排日期的任务
 */
export const isTaskUndated = (task: Task): boolean => {
  return !task.schedule;
};

/**
 * 检查任务是否匹配指定日期 dateKey
 */
export const isTaskScheduledForDate = (
  task: Task,
  dateKey: string
): boolean => {
  const schedule = task.schedule;
  if (!schedule) {
    return false;
  }

  if (schedule.type === "weekly") {
    const monday = getMondayOfWeek(dateKey);
    const dayOfWeek = getDayOfWeekIndex(dateKey);
    return (
      schedule.selectedWeeks.includes(monday) &&
      schedule.daysOfWeek.includes(dayOfWeek)
    );
  }

  if (schedule.type === "monthly") {
    return schedule.selectedDates.includes(dateKey);
  }

  if (schedule.type === "daily") {
    if (!schedule.startDate || schedule.daysCount <= 0) return false;
    const start = schedule.startDate;
    const end = addDays(start, schedule.daysCount - 1);
    return dateKey >= start && dateKey <= end;
  }

  return false;
};

/**
 * 获取任务在特定日期的完成状态
 * 有计划时按日期独立判定；无计划时取 task.done
 */
export const isTaskCompletedOnDate = (
  task: Task,
  dateKey: string
): boolean => {
  if (task.schedule) {
    return Boolean(task.completedDates?.[dateKey]);
  }
  return Boolean(task.done);
};

/**
 * 展平后的卡片项目，包含所属一级分组信息
 */
export type FlatMatrixCard = {
  listId: string;
  listTitle: string;
  card: Task;
  importance: number;
  urgency: number;
  isDoneOnDate: boolean;
};

/**
 * 从 TaskList 列表中提取在特定日期生效的所有卡片
 */
export const getTasksForDate = (
  lists: TaskList[],
  dateKey: string
): FlatMatrixCard[] => {
  const result: FlatMatrixCard[] = [];

  for (const list of lists) {
    for (const card of list.cards) {
      if (isTaskScheduledForDate(card, dateKey)) {
        result.push({
          listId: list._id,
          listTitle: list.title,
          card,
          importance: getClampedScore(card.importance),
          urgency: getClampedScore(card.urgency),
          isDoneOnDate: isTaskCompletedOnDate(card, dateKey),
        });
      }
    }
  }

  return result;
};

/**
 * 提取所有未排期（Undated）卡片
 */
export const getUndatedTasks = (
  lists: TaskList[]
): FlatMatrixCard[] => {
  const result: FlatMatrixCard[] = [];

  for (const list of lists) {
    for (const card of list.cards) {
      if (isTaskUndated(card)) {
        result.push({
          listId: list._id,
          listTitle: list.title,
          card,
          importance: getClampedScore(card.importance),
          urgency: getClampedScore(card.urgency),
          isDoneOnDate: Boolean(card.done),
        });
      }
    }
  }

  return result;
};
