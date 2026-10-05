import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  clearStatistics,
  setStatisticsSessions,
  StatisticsBucket,
} from "store";
import type { StatisticsSessionRecord } from "store";
import { useAppDispatch, useAppSelector } from "hooks/storeHooks";
import {
  StyledButtonDanger,
  StyledSelect,
  StyledSelectWrapper,
  StyledStatistics,
  StyledStatisticsActions,
  StyledStatisticsBar,
  StyledStatisticsBarFill,
  StyledStatisticsCard,
  StyledStatisticsCardLabel,
  StyledStatisticsCardValue,
  StyledStatisticsCycleBadge,
  StyledStatisticsEmpty,
  StyledStatisticsHeatmap,
  StyledStatisticsHeatmapCell,
  StyledStatisticsLegend,
  StyledStatisticsLegendItem,
  StyledStatisticsMilestone,
  StyledStatisticsMilestones,
  StyledStatisticsProgressHeader,
  StyledStatisticsProgressMetric,
  StyledStatisticsProgressMetrics,
  StyledStatisticsProgressPanel,
  StyledStatisticsProgressTrack,
  StyledStatisticsPeriodControl,
  StyledPeriodNav,
  StyledPeriodLabel,
  StyledPeriodButton,
  StyledStatisticsRow,
  StyledStatisticsRowLabel,
  StyledStatisticsRowMeta,
  StyledStatisticsRows,
  StyledStatisticsRowValue,
  StyledStatisticsSection,
  StyledStatisticsSectionHeading,
  StyledStatisticsStackedBar,
  StyledStatisticsSummary,
  StyledStatisticsWeekBar,
  StyledStatisticsWeekBars,
} from "styles";

import {
  DailyTotals,
  DAY_MS,
  HEATMAP_DAYS,
  WEEK_DAYS,
  TOP_FOCUS_LIMIT,
  XP_PER_LEVEL,
  MilestoneKey,
  toDateKey,
  PeriodRange,
  getNaturalWeekRange,
  getNaturalMonthRange,
  getTodayRange,
  formatDuration,
  createDayLabel,
  createEmptyDailyTotals,
  createDailyTotalsMap,
  createDailyRows,
  createNormalizedDailyRows,
  getCurrentStreak,
} from "./utils";

type PeriodFilter = "today" | "week" | "month" | "all";
type ClearRange = "olderWeek" | "olderMonth" | "all";

export default function Statistics() {
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const sessions = useAppSelector((state) => state.statistics.sessions);
  const sessionRounds = useAppSelector(
    (state) => state.config.sessionRounds
  );

  const [period, setPeriod] = useState<PeriodFilter>("week");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [clearRange, setClearRange] = useState<ClearRange>("all");
  const [isClearArmed, setIsClearArmed] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const locale = i18n.language || "en";
  const now = useMemo(() => new Date(nowTimestamp), [nowTimestamp]);

  const currentRange = useMemo<PeriodRange | null>(() => {
    if (period === "all") return null;
    if (period === "today") return getTodayRange(anchorDate);
    if (period === "week") return getNaturalWeekRange(anchorDate);
    if (period === "month") return getNaturalMonthRange(anchorDate);
    return null;
  }, [period, anchorDate]);

  const onPrevPeriod = useCallback(() => {
    setAnchorDate((prev) => {
      if (period === "week") {
        return new Date(
          prev.getFullYear(),
          prev.getMonth(),
          prev.getDate() - 7
        );
      }
      if (period === "month") {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      }
      if (period === "today") {
        return new Date(
          prev.getFullYear(),
          prev.getMonth(),
          prev.getDate() - 1
        );
      }
      return prev;
    });
  }, [period]);

  const onNextPeriod = useCallback(() => {
    setAnchorDate((prev) => {
      if (period === "week") {
        return new Date(
          prev.getFullYear(),
          prev.getMonth(),
          prev.getDate() + 7
        );
      }
      if (period === "month") {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      }
      if (period === "today") {
        return new Date(
          prev.getFullYear(),
          prev.getMonth(),
          prev.getDate() + 1
        );
      }
      return prev;
    });
  }, [period]);

  const onResetPeriod = useCallback(() => {
    setAnchorDate(new Date());
  }, []);

  // 1. 全历史累计统计 (All-time Cumulative Stats)
  const totalStats = useMemo(() => {
    let focusSeconds = 0;
    let focusCount = 0;
    let completedCycles = 0;

    sessions.forEach((s) => {
      if (s.bucket === StatisticsBucket.FOCUS) {
        focusSeconds += s.durationSeconds;
        focusCount += 1;
        if (s.cycleCompleted) {
          completedCycles += 1;
        }
      }
    });

    const avgFocusSeconds =
      focusCount > 0 ? Math.round(focusSeconds / focusCount) : 0;

    return {
      focusCount,
      focusSeconds,
      avgFocusSeconds,
      completedCycles,
    };
  }, [sessions]);

  // 2. 当前周期统计 (Selected Period Stats，根据 completedAt 在 [start, end) 左闭右开内过滤)
  const filteredSessions = useMemo(() => {
    if (!currentRange) {
      return sessions;
    }
    return sessions.filter(
      (s) =>
        s.completedAt >= currentRange.start &&
        s.completedAt < currentRange.end
    );
  }, [sessions, currentRange]);

  const periodSummary = useMemo(() => {
    let focusSeconds = 0;
    let breakSeconds = 0;
    let idleSeconds = 0;
    let completedCycles = 0;
    let focusCount = 0;

    filteredSessions.forEach((s) => {
      if (s.bucket === StatisticsBucket.FOCUS) {
        focusSeconds += s.durationSeconds;
        focusCount += 1;
        if (s.cycleCompleted) {
          completedCycles += 1;
        }
      } else if (s.bucket === StatisticsBucket.BREAK) {
        breakSeconds += s.durationSeconds;
      } else {
        idleSeconds += s.durationSeconds;
      }
    });

    const avgFocusSeconds =
      focusCount > 0 ? Math.round(focusSeconds / focusCount) : 0;

    return {
      focusSeconds,
      breakSeconds,
      idleSeconds,
      completedCycles,
      focusCount,
      avgFocusSeconds,
    };
  }, [filteredSessions]);

  const allDailyRows = useMemo(
    () => createDailyRows(sessions, locale),
    [locale, sessions]
  );

  const heatmapRows = useMemo(
    () =>
      createNormalizedDailyRows(sessions, HEATMAP_DAYS, now, locale),
    [locale, now, sessions]
  );

  const weekRows = useMemo(
    () => createNormalizedDailyRows(sessions, WEEK_DAYS, now, locale),
    [locale, now, sessions]
  );

  const progressSummary = useMemo(() => {
    const activeDateKeys = new Set<string>();
    let completedCycles = 0;
    let focusSeconds = 0;

    sessions.forEach((session) => {
      if (session.bucket !== StatisticsBucket.FOCUS) {
        return;
      }

      focusSeconds += session.durationSeconds;

      if (!session.cycleCompleted) {
        return;
      }

      completedCycles += 1;
      activeDateKeys.add(
        session.date || toDateKey(session.completedAt)
      );
    });

    const streak = getCurrentStreak(activeDateKeys, now);
    const totalXp =
      completedCycles * 40 +
      Math.floor(focusSeconds / 300) * 5 +
      activeDateKeys.size * 20;
    const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
    const levelXp = totalXp % XP_PER_LEVEL;
    const todayKey = toDateKey(now.getTime());
    const today =
      allDailyRows.find((row) => row.date === todayKey) ||
      createEmptyDailyTotals(todayKey, locale);
    const targetCycles = Math.max(sessionRounds, 1);
    const targetProgress = Math.min(
      100,
      (today.cycles / targetCycles) * 100
    );
    const unlockedMilestones: MilestoneKey[] = [];

    if (completedCycles > 0) {
      unlockedMilestones.push("firstFocus");
    }

    if (streak >= 3) {
      unlockedMilestones.push("steadyThree");
    }

    if (streak >= 7) {
      unlockedMilestones.push("fullWeek");
    }

    if (allDailyRows.some((row) => row.focus >= 2 * 60 * 60)) {
      unlockedMilestones.push("immersion");
    }

    if (allDailyRows.some((row) => row.cycles >= 4)) {
      unlockedMilestones.push("deepFocus");
    }

    return {
      level,
      levelXp,
      streak,
      targetCycles,
      targetProgress,
      today,
      unlockedMilestones: unlockedMilestones.slice(-3),
    };
  }, [allDailyRows, locale, now, sessionRounds, sessions]);

  const activityRows = useMemo(() => {
    const activityMap = new Map<
      string,
      {
        key: string;
        label: string;
        seconds: number;
        cycles: number;
      }
    >();

    filteredSessions.forEach((session) => {
      if (session.bucket !== StatisticsBucket.FOCUS) {
        return;
      }

      const key =
        session.listId && session.taskId
          ? `${session.listId}:${session.taskId}`
          : "__unassigned_focus__";

      const label =
        session.listTitle && session.taskText
          ? `${session.listTitle} / ${session.taskText}`
          : session.taskText ||
            session.listTitle ||
            t("statistics.unassignedFocus");

      const existing = activityMap.get(key);
      if (existing) {
        existing.seconds += session.durationSeconds;
        existing.cycles += session.cycleCompleted ? 1 : 0;
        return;
      }

      activityMap.set(key, {
        key,
        label,
        seconds: session.durationSeconds,
        cycles: session.cycleCompleted ? 1 : 0,
      });
    });

    return Array.from(activityMap.values()).sort(
      (first, second) => second.seconds - first.seconds
    );
  }, [filteredSessions, t]);

  const dailyRows = useMemo(() => {
    const sessionsByDate = createDailyTotalsMap(filteredSessions);

    if (
      currentRange &&
      (period === "week" || period === "month" || period === "today")
    ) {
      return currentRange.days.map((key) => {
        const existing = sessionsByDate.get(key);
        return existing
          ? {
              date: key,
              label: createDayLabel(key, locale),
              ...existing,
            }
          : createEmptyDailyTotals(key, locale);
      });
    }

    // period === "all"
    const rows = Array.from(sessionsByDate.entries()).map(
      ([date, totals]) => ({
        date,
        label: createDayLabel(date, locale),
        ...totals,
      })
    );
    return rows.sort((first, second) =>
      second.date.localeCompare(first.date)
    );
  }, [currentRange, filteredSessions, locale, period]);

  const clearableSessionsCount = useMemo(() => {
    if (!sessions.length) {
      return 0;
    }

    if (clearRange === "all") {
      return sessions.length;
    }

    const cutoffBase = nowTimestamp;
    const cutoff =
      clearRange === "olderWeek"
        ? cutoffBase - 7 * DAY_MS
        : cutoffBase - 30 * DAY_MS;

    return sessions.filter((session) => session.completedAt < cutoff)
      .length;
  }, [clearRange, nowTimestamp, sessions]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  const topActivityRows = useMemo(
    () => activityRows.slice(0, TOP_FOCUS_LIMIT),
    [activityRows]
  );

  const heatmapMaxFocus = useMemo(
    () => Math.max(...heatmapRows.map((row) => row.focus), 0),
    [heatmapRows]
  );

  const weekMaxFocus = useMemo(
    () => Math.max(...weekRows.map((row) => row.focus), 0),
    [weekRows]
  );

  useEffect(() => {
    setIsClearArmed(false);
  }, [clearRange, clearableSessionsCount]);

  useEffect(() => {
    if (!isClearArmed) {
      return;
    }

    const timeout = setTimeout(() => {
      setIsClearArmed(false);
    }, 4500);

    return () => clearTimeout(timeout);
  }, [isClearArmed]);

  const onClearAction = useCallback(() => {
    if (!clearableSessionsCount) {
      return;
    }

    if (!isClearArmed) {
      setIsClearArmed(true);
      return;
    }

    if (clearRange === "all") {
      dispatch(clearStatistics());
      setIsClearArmed(false);
      return;
    }

    const now = Date.now();
    const cutoff =
      clearRange === "olderWeek" ? now - 7 * DAY_MS : now - 30 * DAY_MS;

    dispatch(
      setStatisticsSessions(
        sessions.filter((session) => session.completedAt >= cutoff)
      )
    );
    setIsClearArmed(false);
  }, [
    clearRange,
    clearableSessionsCount,
    dispatch,
    isClearArmed,
    sessions,
  ]);

  return (
    <StyledStatistics aria-label={t("statistics.title")}>
      {/* 1. 全历史累计统计 */}
      <StyledStatisticsSection>
        <StyledStatisticsSectionHeading>
          {t("statistics.totalStatsHeading")}
        </StyledStatisticsSectionHeading>
        <StyledStatisticsSummary>
          <StyledStatisticsCard>
            <StyledStatisticsCardLabel>
              {t("statistics.totalFocusCount")}
            </StyledStatisticsCardLabel>
            <StyledStatisticsCardValue>
              {totalStats.focusCount}
            </StyledStatisticsCardValue>
          </StyledStatisticsCard>

          <StyledStatisticsCard>
            <StyledStatisticsCardLabel>
              {t("statistics.totalFocusTime")}
            </StyledStatisticsCardLabel>
            <StyledStatisticsCardValue>
              {formatDuration(totalStats.focusSeconds, t)}
            </StyledStatisticsCardValue>
          </StyledStatisticsCard>

          <StyledStatisticsCard>
            <StyledStatisticsCardLabel>
              {t("statistics.totalAvgFocusTime")}
            </StyledStatisticsCardLabel>
            <StyledStatisticsCardValue>
              {formatDuration(totalStats.avgFocusSeconds, t)}
            </StyledStatisticsCardValue>
          </StyledStatisticsCard>
        </StyledStatisticsSummary>
      </StyledStatisticsSection>

      {/* 2. 当前周期统计与范围切换 */}
      <StyledStatisticsSection>
        <StyledStatisticsSectionHeading>
          {t("statistics.periodStatsHeading")}
        </StyledStatisticsSectionHeading>

        <StyledStatisticsPeriodControl>
          <StyledSelectWrapper>
            <StyledSelect
              id="statistics-period"
              aria-label={t("statistics.period")}
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as PeriodFilter)
              }
            >
              <option value="today">
                {t("statistics.periodToday")}
              </option>
              <option value="week">{t("statistics.periodWeek")}</option>
              <option value="month">
                {t("statistics.periodMonth")}
              </option>
              <option value="all">{t("statistics.periodAll")}</option>
            </StyledSelect>
          </StyledSelectWrapper>

          {currentRange && (
            <StyledPeriodNav>
              <StyledPeriodButton onClick={onPrevPeriod}>
                {t("statistics.prevPeriod")}
              </StyledPeriodButton>
              <StyledPeriodLabel>
                {currentRange.label}
              </StyledPeriodLabel>
              <StyledPeriodButton onClick={onNextPeriod}>
                {t("statistics.nextPeriod")}
              </StyledPeriodButton>
              <StyledPeriodButton onClick={onResetPeriod}>
                {t("statistics.resetToCurrent")}
              </StyledPeriodButton>
            </StyledPeriodNav>
          )}
        </StyledStatisticsPeriodControl>

        <StyledStatisticsSummary>
          <StyledStatisticsCard>
            <StyledStatisticsCardLabel>
              {t("statistics.periodFocusCount")}
            </StyledStatisticsCardLabel>
            <StyledStatisticsCardValue>
              {periodSummary.focusCount}
            </StyledStatisticsCardValue>
          </StyledStatisticsCard>

          <StyledStatisticsCard>
            <StyledStatisticsCardLabel>
              {t("statistics.periodFocusTime")}
            </StyledStatisticsCardLabel>
            <StyledStatisticsCardValue>
              {formatDuration(periodSummary.focusSeconds, t)}
            </StyledStatisticsCardValue>
          </StyledStatisticsCard>

          <StyledStatisticsCard>
            <StyledStatisticsCardLabel>
              {t("statistics.periodAvgFocusTime")}
            </StyledStatisticsCardLabel>
            <StyledStatisticsCardValue>
              {formatDuration(periodSummary.avgFocusSeconds, t)}
            </StyledStatisticsCardValue>
          </StyledStatisticsCard>

          <StyledStatisticsCard>
            <StyledStatisticsCardLabel>
              {t("statistics.periodCompletedCycles")}
            </StyledStatisticsCardLabel>
            <StyledStatisticsCardValue>
              {periodSummary.completedCycles}
            </StyledStatisticsCardValue>
          </StyledStatisticsCard>

          <StyledStatisticsCard>
            <StyledStatisticsCardLabel>
              {t("statistics.breakTime")}
            </StyledStatisticsCardLabel>
            <StyledStatisticsCardValue>
              {formatDuration(periodSummary.breakSeconds, t)}
            </StyledStatisticsCardValue>
          </StyledStatisticsCard>

          <StyledStatisticsCard>
            <StyledStatisticsCardLabel>
              {t("statistics.idleTime")}
            </StyledStatisticsCardLabel>
            <StyledStatisticsCardValue>
              {formatDuration(periodSummary.idleSeconds, t)}
            </StyledStatisticsCardValue>
          </StyledStatisticsCard>
        </StyledStatisticsSummary>
      </StyledStatisticsSection>

      {/* 3. 周期内主要专注 */}
      <StyledStatisticsSection>
        <StyledStatisticsSectionHeading>
          {t("statistics.topFocus")}
        </StyledStatisticsSectionHeading>
        {!topActivityRows.length ? (
          <StyledStatisticsEmpty>
            {t("statistics.noFocusData")}
          </StyledStatisticsEmpty>
        ) : (
          <StyledStatisticsRows>
            {topActivityRows.map((row) => {
              const width =
                periodSummary.focusSeconds > 0
                  ? (row.seconds / periodSummary.focusSeconds) * 100
                  : 0;
              return (
                <StyledStatisticsRow key={row.key}>
                  <StyledStatisticsRowMeta>
                    <StyledStatisticsRowLabel title={row.label}>
                      {row.label}
                    </StyledStatisticsRowLabel>
                    <StyledStatisticsRowValue>
                      {formatDuration(row.seconds, t)}
                    </StyledStatisticsRowValue>
                  </StyledStatisticsRowMeta>
                  <StyledStatisticsBar>
                    <StyledStatisticsBarFill
                      $variant="focus"
                      style={{ width: `${width}%` }}
                    />
                  </StyledStatisticsBar>
                  <StyledStatisticsCycleBadge>
                    {row.cycles}
                  </StyledStatisticsCycleBadge>
                </StyledStatisticsRow>
              );
            })}
          </StyledStatisticsRows>
        )}
      </StyledStatisticsSection>

      {/* 4. 每日分布 */}
      <StyledStatisticsSection>
        <StyledStatisticsSectionHeading>
          {t("statistics.dailyFlow")}
        </StyledStatisticsSectionHeading>

        <StyledStatisticsLegend>
          <StyledStatisticsLegendItem $variant="focus">
            {t("statistics.focusTime")}
          </StyledStatisticsLegendItem>
          <StyledStatisticsLegendItem $variant="break">
            {t("statistics.breakTime")}
          </StyledStatisticsLegendItem>
          <StyledStatisticsLegendItem $variant="idle">
            {t("statistics.idleTime")}
          </StyledStatisticsLegendItem>
        </StyledStatisticsLegend>

        <StyledStatisticsRows>
          {dailyRows.map((day) => {
            const focusWidth =
              day.total > 0 ? (day.focus / day.total) * 100 : 0;
            const breakWidth =
              day.total > 0 ? (day.break / day.total) * 100 : 0;
            const idleWidth =
              day.total > 0 ? (day.idle / day.total) * 100 : 0;

            return (
              <StyledStatisticsRow key={day.date}>
                <StyledStatisticsRowMeta>
                  <StyledStatisticsRowLabel>
                    {day.label}
                  </StyledStatisticsRowLabel>
                  <StyledStatisticsRowValue>
                    {formatDuration(day.total, t)}
                  </StyledStatisticsRowValue>
                </StyledStatisticsRowMeta>
                <StyledStatisticsStackedBar>
                  <StyledStatisticsBarFill
                    $variant="focus"
                    style={{ width: `${focusWidth}%` }}
                  />
                  <StyledStatisticsBarFill
                    $variant="break"
                    style={{ width: `${breakWidth}%` }}
                  />
                  <StyledStatisticsBarFill
                    $variant="idle"
                    style={{ width: `${idleWidth}%` }}
                  />
                </StyledStatisticsStackedBar>
              </StyledStatisticsRow>
            );
          })}
        </StyledStatisticsRows>
      </StyledStatisticsSection>

      {/* 5. 进度概览 */}
      <StyledStatisticsSection>
        <StyledStatisticsSectionHeading>
          {t("statistics.progressOverview")}
        </StyledStatisticsSectionHeading>
        <StyledStatisticsProgressPanel>
          <StyledStatisticsProgressHeader>
            <div>
              <StyledStatisticsCardLabel>
                {t("statistics.streak")}
              </StyledStatisticsCardLabel>
              <StyledStatisticsCardValue>
                {progressSummary.streak}{" "}
                <small>
                  {progressSummary.streak === 1
                    ? t("statistics.daySingular")
                    : t("statistics.dayPlural")}
                </small>
              </StyledStatisticsCardValue>
            </div>
            <div>
              <StyledStatisticsCardLabel>
                {t("statistics.level")}
              </StyledStatisticsCardLabel>
              <StyledStatisticsCardValue>
                {progressSummary.level}
              </StyledStatisticsCardValue>
            </div>
          </StyledStatisticsProgressHeader>

          <StyledStatisticsProgressTrack>
            <StyledStatisticsRowMeta>
              <StyledStatisticsRowLabel>
                {t("statistics.xp")}
              </StyledStatisticsRowLabel>
              <StyledStatisticsRowValue>
                {progressSummary.levelXp}/{XP_PER_LEVEL}
              </StyledStatisticsRowValue>
            </StyledStatisticsRowMeta>
            <StyledStatisticsBar>
              <StyledStatisticsBarFill
                $variant="focus"
                style={{
                  width: `${(progressSummary.levelXp / XP_PER_LEVEL) * 100}%`,
                }}
              />
            </StyledStatisticsBar>
          </StyledStatisticsProgressTrack>

          <StyledStatisticsProgressMetrics>
            <StyledStatisticsProgressMetric>
              <span>{t("statistics.today")}</span>
              <strong>
                {progressSummary.today.cycles}{" "}
                {progressSummary.today.cycles === 1
                  ? t("units.round")
                  : t("units.rounds")}{" "}
                - {formatDuration(progressSummary.today.focus, t)}
              </strong>
            </StyledStatisticsProgressMetric>

            <StyledStatisticsProgressMetric>
              <span>{t("statistics.dailyTarget")}</span>
              <strong>
                {progressSummary.today.cycles}/
                {progressSummary.targetCycles}
              </strong>
              <StyledStatisticsBar>
                <StyledStatisticsBarFill
                  $variant="focus"
                  style={{
                    width: `${progressSummary.targetProgress}%`,
                  }}
                />
              </StyledStatisticsBar>
            </StyledStatisticsProgressMetric>
          </StyledStatisticsProgressMetrics>

          <StyledStatisticsMilestones>
            {progressSummary.unlockedMilestones.length ? (
              progressSummary.unlockedMilestones.map((milestone) => (
                <StyledStatisticsMilestone key={milestone}>
                  {t(`statistics.milestones.${milestone}`)}
                </StyledStatisticsMilestone>
              ))
            ) : (
              <StyledStatisticsEmpty>
                {t("statistics.noMilestones")}
              </StyledStatisticsEmpty>
            )}
          </StyledStatisticsMilestones>
        </StyledStatisticsProgressPanel>
      </StyledStatisticsSection>

      {/* 6. 最近 30 天热力图 */}
      <StyledStatisticsSection>
        <StyledStatisticsSectionHeading>
          {t("statistics.last30Days")}
        </StyledStatisticsSectionHeading>
        <StyledStatisticsHeatmap>
          {heatmapRows.map((day) => {
            const intensity =
              heatmapMaxFocus > 0 && day.focus > 0
                ? Math.max(
                    1,
                    Math.ceil((day.focus / heatmapMaxFocus) * 5)
                  )
                : 0;

            return (
              <StyledStatisticsHeatmapCell
                key={day.date}
                $intensity={intensity}
                aria-label={`${day.label}: ${formatDuration(day.focus, t)}`}
                title={`${day.label}: ${formatDuration(day.focus, t)}`}
              />
            );
          })}
        </StyledStatisticsHeatmap>
      </StyledStatisticsSection>

      {/* 7. 最近 7 天 */}
      <StyledStatisticsSection>
        <StyledStatisticsSectionHeading>
          {t("statistics.week")}
        </StyledStatisticsSectionHeading>
        <StyledStatisticsWeekBars>
          {weekRows.map((day) => {
            const height =
              weekMaxFocus > 0 && day.focus > 0
                ? Math.max(10, (day.focus / weekMaxFocus) * 100)
                : 0;

            return (
              <StyledStatisticsWeekBar
                key={day.date}
                title={`${day.label}: ${formatDuration(day.focus, t)}`}
              >
                <span style={{ height: `${height}%` }} />
                <small>{day.label}</small>
              </StyledStatisticsWeekBar>
            );
          })}
        </StyledStatisticsWeekBars>
      </StyledStatisticsSection>

      {/* 8. 管理历史 */}
      <StyledStatisticsSection>
        <StyledStatisticsSectionHeading>
          {t("statistics.manageHistory")}
        </StyledStatisticsSectionHeading>
        <StyledStatisticsActions>
          <StyledSelectWrapper>
            <StyledSelect
              value={clearRange}
              onChange={(event) =>
                setClearRange(event.target.value as ClearRange)
              }
            >
              <option value="olderWeek">
                {t("statistics.clearOlderWeek")}
              </option>
              <option value="olderMonth">
                {t("statistics.clearOlderMonth")}
              </option>
              <option value="all">{t("statistics.clearAll")}</option>
            </StyledSelect>
          </StyledSelectWrapper>
          <StyledButtonDanger
            onClick={onClearAction}
            disabled={!clearableSessionsCount}
          >
            {isClearArmed
              ? t("statistics.clearActionConfirm")
              : t("statistics.clearAction")}
          </StyledButtonDanger>
        </StyledStatisticsActions>
      </StyledStatisticsSection>
    </StyledStatistics>
  );
}
