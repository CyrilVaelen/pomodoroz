import { StatisticsBucket } from "../../store/statistics/types";
import type { StatisticsSessionRecord } from "../../store/statistics/types";

export type DailyTotals = {
  date: string;
  label: string;
  focus: number;
  break: number;
  idle: number;
  total: number;
  cycles: number;
};

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HEATMAP_DAYS = 30;
export const WEEK_DAYS = 7;
export const TOP_FOCUS_LIMIT = 5;
export const XP_PER_LEVEL = 500;

export type MilestoneKey =
  "firstFocus" | "steadyThree" | "fullWeek" | "immersion" | "deepFocus";

export const toDateKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export type PeriodRange = {
  start: number;
  end: number;
  label: string;
  days: string[];
};

/**
 * 自然周计算：严格从本周周一 00:00:00 至下周一 00:00:00（左闭右开），共 7 天
 */
export const getNaturalWeekRange = (anchor: Date): PeriodRange => {
  const dayOfWeek = anchor.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() - distanceToMonday,
    0,
    0,
    0,
    0
  );
  const nextMonday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 7,
    0,
    0,
    0,
    0
  );

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + i
    );
    days.push(toDateKey(d.getTime()));
  }

  const sunday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6
  );
  const label = `${toDateKey(monday.getTime())} ~ ${toDateKey(sunday.getTime())}`;

  return {
    start: monday.getTime(),
    end: nextMonday.getTime(),
    label,
    days,
  };
};

/**
 * 自然月计算：从当月 1 日 00:00:00 至下月 1 日 00:00:00（左闭右开）
 */
export const getNaturalMonthRange = (anchor: Date): PeriodRange => {
  const firstDay = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
  const nextMonthFirstDay = new Date(
    anchor.getFullYear(),
    anchor.getMonth() + 1,
    1,
    0,
    0,
    0,
    0
  );

  const days: string[] = [];
  const cur = new Date(firstDay);
  while (cur < nextMonthFirstDay) {
    days.push(toDateKey(cur.getTime()));
    cur.setDate(cur.getDate() + 1);
  }

  const label = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}`;

  return {
    start: firstDay.getTime(),
    end: nextMonthFirstDay.getTime(),
    label,
    days,
  };
};

/**
 * 当天范围：从当天 00:00:00 至次日 00:00:00（左闭右开）
 */
export const getTodayRange = (anchor: Date): PeriodRange => {
  const start = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate(),
    0,
    0,
    0,
    0
  );
  const end = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return {
    start: start.getTime(),
    end: end.getTime(),
    label: toDateKey(start.getTime()),
    days: [toDateKey(start.getTime())],
  };
};

/**
 * 格式化时长（秒数 -> 小时 分 秒），零会话安全且防 NaN / Infinity
 */
export const formatDuration = (
  totalSeconds: number,
  t: (key: string) => string
): string => {
  if (totalSeconds <= 0 || !Number.isFinite(totalSeconds)) {
    return `0${t("statistics.units.s")}`;
  }

  const safeSeconds = Math.round(totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}${t("statistics.units.h")} ${minutes}${t(
        "statistics.units.m"
      )}`;
    }
    return `${hours}${t("statistics.units.h")}`;
  }

  if (minutes > 0) {
    return `${minutes}${t("statistics.units.m")}`;
  }

  return `${seconds}${t("statistics.units.s")}`;
};

export const createDayLabel = (
  dateKey: string,
  locale: string
): string => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "2-digit",
  }).format(date);
};

export const createEmptyDailyTotals = (
  dateKey: string,
  locale: string
): DailyTotals => ({
  date: dateKey,
  label: createDayLabel(dateKey, locale),
  focus: 0,
  break: 0,
  idle: 0,
  total: 0,
  cycles: 0,
});

export const createDailyTotalsMap = (
  sourceSessions: StatisticsSessionRecord[]
) => {
  const sessionsByDate = new Map<
    string,
    Omit<DailyTotals, "date" | "label">
  >();

  sourceSessions.forEach((session) => {
    const dateKey = session.date || toDateKey(session.completedAt);
    const existing = sessionsByDate.get(dateKey) || {
      focus: 0,
      break: 0,
      idle: 0,
      total: 0,
      cycles: 0,
    };

    if (session.bucket === StatisticsBucket.FOCUS) {
      existing.focus += session.durationSeconds;
      existing.cycles += session.cycleCompleted ? 1 : 0;
    } else if (session.bucket === StatisticsBucket.BREAK) {
      existing.break += session.durationSeconds;
    } else {
      existing.idle += session.durationSeconds;
    }

    existing.total += session.durationSeconds;
    sessionsByDate.set(dateKey, existing);
  });

  return sessionsByDate;
};

export const createDailyRows = (
  sourceSessions: StatisticsSessionRecord[],
  locale: string
): DailyTotals[] => {
  const sessionsByDate = createDailyTotalsMap(sourceSessions);

  return Array.from(sessionsByDate.entries())
    .map(([date, totals]) => ({
      date,
      label: createDayLabel(date, locale),
      ...totals,
    }))
    .sort((first, second) => first.date.localeCompare(second.date));
};

export const createNormalizedDailyRows = (
  sourceSessions: StatisticsSessionRecord[],
  days: number,
  now: Date,
  locale: string
): DailyTotals[] => {
  const sessionsByDate = createDailyTotalsMap(sourceSessions);
  const rows: DailyTotals[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - index
    );
    const key = toDateKey(date.getTime());
    const existing = sessionsByDate.get(key);

    rows.push(
      existing
        ? {
            date: key,
            label: createDayLabel(key, locale),
            ...existing,
          }
        : createEmptyDailyTotals(key, locale)
    );
  }

  return rows;
};

export const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const getPreviousDateKey = (dateKey: string): string => {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() - 1);
  return toDateKey(date.getTime());
};

export const getCurrentStreak = (
  activeDateKeys: Set<string>,
  now: Date
): number => {
  if (!activeDateKeys.size) {
    return 0;
  }

  const todayKey = toDateKey(now.getTime());
  const yesterdayKey = getPreviousDateKey(todayKey);
  let cursor = "";

  if (activeDateKeys.has(todayKey)) {
    cursor = todayKey;
  } else if (activeDateKeys.has(yesterdayKey)) {
    cursor = yesterdayKey;
  }

  if (!cursor) {
    return 0;
  }

  let streak = 0;

  while (activeDateKeys.has(cursor)) {
    streak += 1;
    cursor = getPreviousDateKey(cursor);
  }

  return streak;
};
