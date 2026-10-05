import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import type {
  Task,
  TaskSchedule,
  WeeklySchedule,
  MonthlySchedule,
  DailySchedule,
} from "store/tasks/types";
import {
  addDays,
  formatDateKey,
  getDayOfWeekIndex,
  getMondayOfWeek,
  getTodayDateKey,
  parseDateKey,
} from "./matrixUtils";

const StyledModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
`;

const StyledModalDialog = styled.div`
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  border: 1px solid var(--color-border-primary);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 44rem;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const StyledModalHeader = styled.div`
  padding: 1.4rem 1.6rem;
  border-bottom: 1px solid var(--color-border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StyledModalTitle = styled.h3`
  font-size: 1.4rem;
  color: var(--color-heading-text);
  font-weight: 600;
`;

const StyledCloseButton = styled.button`
  background: transparent;
  border: none;
  font-size: 1.8rem;
  line-height: 1;
  color: var(--color-disabled-text);
  cursor: pointer;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;

  &:hover {
    color: var(--color-heading-text);
    background-color: var(--color-bg-secondary);
  }
`;

const StyledModalBody = styled.div`
  padding: 1.6rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
`;

const StyledTypeTabs = styled.div`
  display: flex;
  border-radius: 6px;
  background-color: var(--color-bg-secondary);
  padding: 0.3rem;
  gap: 0.4rem;
`;

const StyledTabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.6rem 0.8rem;
  font-size: 1.15rem;
  border-radius: 4px;
  border: ${(p) =>
    p.$active
      ? "1px solid var(--color-primary-border)"
      : "1px solid transparent"};
  background-color: ${(p) =>
    p.$active ? "var(--color-primary)" : "transparent"};
  color: ${(p) =>
    p.$active
      ? "var(--color-primary-button)"
      : "var(--color-body-text)"};
  font-weight: ${(p) => (p.$active ? "600" : "400")};
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    ${(p) => !p.$active && "color: var(--color-heading-text);"}
  }
`;

const StyledSectionLabel = styled.div`
  font-size: 1.15rem;
  font-weight: 500;
  color: var(--color-heading-text);
  margin-bottom: 0.6rem;
`;

const StyledWeeksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 16rem;
  overflow-y: auto;
  padding-right: 0.4rem;
`;

const StyledWeekItem = styled.label<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.8rem;
  border-radius: 4px;
  background-color: ${(p) =>
    p.$selected
      ? "rgba(var(--color-primary-rgb), 0.12)"
      : "var(--color-bg-secondary)"};
  border: 1px solid
    ${(p) =>
      p.$selected
        ? "var(--color-primary-border)"
        : "var(--color-border-primary)"};
  cursor: pointer;
  font-size: 1.1rem;
`;

const StyledWeekActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.8rem;
`;

const StyledMoreWeeksBtn = styled.button`
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-primary-border);
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  font-size: 1.1rem;
  color: var(--color-primary-text);
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    background-color: var(--color-bg-tertiary);
  }
`;

const StyledAddWeekPickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const StyledAddWeekInput = styled.input`
  padding: 0.35rem 0.6rem;
  font-size: 1.1rem;
  border-radius: 4px;
  border: 1px solid var(--color-border-primary);
  background-color: var(--color-bg-secondary);
  color: var(--color-heading-text);
`;

const StyledAddWeekBtn = styled.button`
  padding: 0.35rem 0.7rem;
  font-size: 1.1rem;
  border-radius: 4px;
  border: 1px solid var(--color-primary-border);
  background-color: var(--color-primary);
  color: var(--color-primary-button);
  cursor: pointer;
  transition: opacity 120ms ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    opacity: 0.9;
  }
`;

const StyledDaysOfWeekRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.4rem;
`;

const StyledDayCheckbox = styled.button<{ $selected: boolean }>`
  padding: 0.6rem 0.2rem;
  border-radius: 4px;
  border: 1px solid
    ${(p) =>
      p.$selected
        ? "var(--color-primary-border)"
        : "var(--color-border-primary)"};
  background-color: ${(p) =>
    p.$selected ? "var(--color-primary)" : "var(--color-bg-secondary)"};
  color: ${(p) =>
    p.$selected
      ? "var(--color-primary-button)"
      : "var(--color-body-text)"};
  font-weight: ${(p) => (p.$selected ? "600" : "400")};
  font-size: 1.1rem;
  cursor: pointer;
  text-align: center;
`;

const StyledCalendarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8rem;
`;

const StyledMonthNavBtn = styled.button`
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: 4px;
  padding: 0.3rem 0.8rem;
  cursor: pointer;
  color: var(--color-heading-text);

  &:hover {
    background: var(--color-bg-tertiary);
  }
`;

const StyledMonthTitle = styled.span`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading-text);
`;

const StyledCalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.4rem;
`;

const StyledCalendarDayHeader = styled.div`
  text-align: center;
  font-size: 1rem;
  color: var(--color-disabled-text);
  padding: 0.2rem 0;
`;

const StyledCalendarDayCell = styled.button<{
  $selected: boolean;
  $isToday: boolean;
  $empty: boolean;
}>`
  padding: 0.6rem 0.2rem;
  border-radius: 4px;
  border: 1px solid
    ${(p) =>
      p.$selected
        ? "var(--color-primary-border)"
        : p.$isToday
          ? "var(--color-primary-border)"
          : "transparent"};
  background-color: ${(p) =>
    p.$selected
      ? "var(--color-primary)"
      : p.$empty
        ? "transparent"
        : "var(--color-bg-secondary)"};
  color: ${(p) =>
    p.$selected
      ? "var(--color-primary-button)"
      : p.$isToday
        ? "var(--color-primary-text)"
        : "var(--color-heading-text)"};
  font-weight: ${(p) => (p.$selected || p.$isToday ? "600" : "400")};
  font-size: 1.1rem;
  cursor: ${(p) => (p.$empty ? "default" : "pointer")};
  visibility: ${(p) => (p.$empty ? "hidden" : "visible")};

  &:hover {
    ${(p) => !p.$empty && !p.$selected && "background-color: var(--color-bg-tertiary);"}
  }
`;

const StyledInputRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const StyledTextInput = styled.input`
  padding: 0.6rem 0.8rem;
  border-radius: 4px;
  border: 1px solid var(--color-border-primary);
  background-color: var(--color-bg-secondary);
  color: var(--color-heading-text);
  font-size: 1.2rem;

  &:focus {
    border-color: var(--color-primary-border);
    outline: none;
  }
`;

const StyledModalFooter = styled.div`
  padding: 1.2rem 1.6rem;
  border-top: 1px solid var(--color-border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
`;

const StyledPrimaryBtn = styled.button`
  padding: 0.6rem 1.4rem;
  border-radius: 4px;
  border: 1px solid var(--color-primary-border);
  background-color: var(--color-primary);
  color: var(--color-primary-button);
  font-size: 1.2rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

const StyledSecondaryBtn = styled.button`
  padding: 0.6rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--color-border-primary);
  background-color: var(--color-bg-secondary);
  color: var(--color-body-text);
  font-size: 1.15rem;
  cursor: pointer;

  &:hover {
    color: var(--color-heading-text);
    background-color: var(--color-bg-tertiary);
  }
`;

const StyledDangerBtn = styled.button`
  padding: 0.6rem 1rem;
  border-radius: 4px;
  border: 1px solid rgba(219, 51, 82, 0.4);
  background-color: transparent;
  color: var(--color-pink);
  font-size: 1.15rem;
  cursor: pointer;

  &:hover {
    background-color: rgba(219, 51, 82, 0.1);
  }
`;

type Props = {
  task: Task;
  onSave: (schedule: TaskSchedule | null) => void;
  onClose: () => void;
};

export const TaskScheduleModal: React.FC<Props> = ({
  task,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const today = getTodayDateKey();

  const [activeTab, setActiveTab] = useState<
    "weekly" | "monthly" | "daily"
  >(task.schedule?.type || "weekly");

  // 周计划状态
  const [weeklySelectedWeeks, setWeeklySelectedWeeks] = useState<
    string[]
  >(() =>
    task.schedule?.type === "weekly"
      ? task.schedule.selectedWeeks
      : [getMondayOfWeek(today)]
  );
  const [weeklyDaysOfWeek, setWeeklyDaysOfWeek] = useState<number[]>(
    task.schedule?.type === "weekly"
      ? task.schedule.daysOfWeek
      : [1, 2, 3, 4, 5]
  );

  // 月计划状态
  const [calendarYearMonth, setCalendarYearMonth] = useState<{
    year: number;
    month: number; // 0-11
  }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [monthlySelectedDates, setMonthlySelectedDates] = useState<
    string[]
  >(
    task.schedule?.type === "monthly"
      ? task.schedule.selectedDates
      : [today]
  );

  // 连续天计划状态
  const [dailyStartDate, setDailyStartDate] = useState<string>(
    task.schedule?.type === "daily" ? task.schedule.startDate : today
  );
  const [dailyDaysCount, setDailyDaysCount] = useState<number>(
    task.schedule?.type === "daily" ? task.schedule.daysCount : 7
  );

  // 未来周候选范围（默认至少 8 周，若已有远期选择则自动包含）
  const [weeksRangeCount, setWeeksRangeCount] = useState<number>(() => {
    let maxWeeks = 8;
    if (task.schedule?.type === "weekly") {
      const curMon = getMondayOfWeek(today);
      for (const w of task.schedule.selectedWeeks) {
        const diffDays = Math.round(
          (parseDateKey(w).getTime() - parseDateKey(curMon).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        const weekIdx = Math.floor(diffDays / 7) + 1;
        if (weekIdx > maxWeeks) maxWeeks = weekIdx;
      }
    }
    return maxWeeks;
  });

  const [customAddedWeeks, setCustomAddedWeeks] = useState<string[]>(
    []
  );
  const [pickDateForWeek, setPickDateForWeek] = useState<string>("");

  // 计算未来周候选（支持连续向后扩展和直接添加任意指定远期周）
  const candidateWeeks = useMemo(() => {
    const map = new Map<string, string>();
    let curMon = getMondayOfWeek(today);
    for (let i = 0; i < weeksRangeCount; i++) {
      const sunday = addDays(curMon, 6);
      map.set(
        curMon,
        `${curMon.slice(5)} ~ ${sunday.slice(5)} (第 ${i + 1} 周)`
      );
      curMon = addDays(curMon, 7);
    }
    for (const w of [...weeklySelectedWeeks, ...customAddedWeeks]) {
      if (!map.has(w)) {
        const sunday = addDays(w, 6);
        map.set(w, `${w.slice(5)} ~ ${sunday.slice(5)} (指定周)`);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monday, label]) => ({ monday, label }));
  }, [today, weeksRangeCount, weeklySelectedWeeks, customAddedWeeks]);

  const handleAddCustomWeek = () => {
    if (!pickDateForWeek) return;
    const mon = getMondayOfWeek(pickDateForWeek);
    if (!weeklySelectedWeeks.includes(mon)) {
      setWeeklySelectedWeeks([...weeklySelectedWeeks, mon]);
    }
    if (!customAddedWeeks.includes(mon)) {
      setCustomAddedWeeks([...customAddedWeeks, mon]);
    }
    setPickDateForWeek("");
  };

  const toggleWeek = (mon: string) => {
    if (weeklySelectedWeeks.includes(mon)) {
      setWeeklySelectedWeeks(
        weeklySelectedWeeks.filter((w) => w !== mon)
      );
    } else {
      setWeeklySelectedWeeks([...weeklySelectedWeeks, mon]);
    }
  };

  const toggleDayOfWeek = (day: number) => {
    if (weeklyDaysOfWeek.includes(day)) {
      if (weeklyDaysOfWeek.length > 1) {
        setWeeklyDaysOfWeek(weeklyDaysOfWeek.filter((d) => d !== day));
      }
    } else {
      setWeeklyDaysOfWeek([...weeklyDaysOfWeek, day].sort());
    }
  };

  // 月历网格计算
  const calendarDays = useMemo(() => {
    const { year, month } = calendarYearMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // 1 号是星期几（0=周日, 1=周一） -> 转换为 1=周一至 7=周日
    const startDayIndex =
      firstDay.getDay() === 0 ? 7 : firstDay.getDay();

    const cells: { dateKey: string; dayNum: number; empty: boolean }[] =
      [];

    // 前置空白格
    for (let i = 1; i < startDayIndex; i++) {
      cells.push({ dateKey: `empty-${i}`, dayNum: 0, empty: true });
    }

    // 真实日期
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      cells.push({
        dateKey: `${year}-${mStr}-${dStr}`,
        dayNum: d,
        empty: false,
      });
    }

    return cells;
  }, [calendarYearMonth]);

  const toggleMonthlyDate = (dateKey: string) => {
    if (monthlySelectedDates.includes(dateKey)) {
      setMonthlySelectedDates(
        monthlySelectedDates.filter((d) => d !== dateKey)
      );
    } else {
      setMonthlySelectedDates([...monthlySelectedDates, dateKey]);
    }
  };

  const prevMonth = () => {
    setCalendarYearMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCalendarYearMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleSave = () => {
    if (activeTab === "weekly") {
      const schedule: WeeklySchedule = {
        type: "weekly",
        selectedWeeks: weeklySelectedWeeks,
        daysOfWeek: weeklyDaysOfWeek,
      };
      onSave(schedule);
    } else if (activeTab === "monthly") {
      const schedule: MonthlySchedule = {
        type: "monthly",
        selectedDates: monthlySelectedDates,
      };
      onSave(schedule);
    } else if (activeTab === "daily") {
      const schedule: DailySchedule = {
        type: "daily",
        startDate: dailyStartDate || today,
        daysCount: Math.max(1, dailyDaysCount || 1),
      };
      onSave(schedule);
    }
  };

  const handleClear = () => {
    onSave(null);
  };

  const weekDayLabels = [
    { num: 1, label: t("tasks.mon", "一") },
    { num: 2, label: t("tasks.tue", "二") },
    { num: 3, label: t("tasks.wed", "三") },
    { num: 4, label: t("tasks.thu", "四") },
    { num: 5, label: t("tasks.fri", "五") },
    { num: 6, label: t("tasks.sat", "六") },
    { num: 7, label: t("tasks.sun", "日") },
  ];

  return (
    <StyledModalOverlay onClick={onClose}>
      <StyledModalDialog onClick={(e) => e.stopPropagation()}>
        <StyledModalHeader>
          <StyledModalTitle>
            {t("tasks.setSchedule", "明确日期计划")}
          </StyledModalTitle>
          <StyledCloseButton onClick={onClose} type="button">
            ✕
          </StyledCloseButton>
        </StyledModalHeader>

        <StyledModalBody>
          <StyledTypeTabs>
            <StyledTabButton
              $active={activeTab === "weekly"}
              onClick={() => setActiveTab("weekly")}
              type="button"
            >
              {t("tasks.scheduleWeekly", "周计划")}
            </StyledTabButton>
            <StyledTabButton
              $active={activeTab === "monthly"}
              onClick={() => setActiveTab("monthly")}
              type="button"
            >
              {t("tasks.scheduleMonthly", "月计划")}
            </StyledTabButton>
            <StyledTabButton
              $active={activeTab === "daily"}
              onClick={() => setActiveTab("daily")}
              type="button"
            >
              {t("tasks.scheduleDaily", "连续天数")}
            </StyledTabButton>
          </StyledTypeTabs>

          {activeTab === "weekly" && (
            <>
              <div>
                <StyledSectionLabel>
                  {t(
                    "tasks.selectedWeeks",
                    "选择具体周（可跳过部分周）"
                  )}
                </StyledSectionLabel>
                <StyledWeeksList>
                  {candidateWeeks.map((w) => {
                    const isSelected = weeklySelectedWeeks.includes(
                      w.monday
                    );
                    return (
                      <StyledWeekItem
                        key={w.monday}
                        $selected={isSelected}
                        onClick={() => toggleWeek(w.monday)}
                      >
                        <span>{w.label}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                        />
                      </StyledWeekItem>
                    );
                  })}
                </StyledWeeksList>

                <StyledWeekActionRow>
                  <StyledMoreWeeksBtn
                    type="button"
                    onClick={() =>
                      setWeeksRangeCount((prev) => prev + 8)
                    }
                  >
                    +{" "}
                    {t("tasks.loadMoreWeeks", "加载更多未来周 (+8周)")}
                  </StyledMoreWeeksBtn>

                  <StyledAddWeekPickerRow>
                    <StyledAddWeekInput
                      type="date"
                      value={pickDateForWeek}
                      onChange={(e) =>
                        setPickDateForWeek(e.target.value)
                      }
                      title={t(
                        "tasks.pickSpecificWeek",
                        "指定某天所在周"
                      )}
                    />
                    <StyledAddWeekBtn
                      type="button"
                      disabled={!pickDateForWeek}
                      onClick={handleAddCustomWeek}
                    >
                      + {t("tasks.addSpecificWeek", "添加指定周")}
                    </StyledAddWeekBtn>
                  </StyledAddWeekPickerRow>
                </StyledWeekActionRow>
              </div>

              <div>
                <StyledSectionLabel>
                  {t("tasks.daysOfWeek", "选定周的执行星期")}
                </StyledSectionLabel>
                <StyledDaysOfWeekRow>
                  {weekDayLabels.map((item) => {
                    const isSelected = weeklyDaysOfWeek.includes(
                      item.num
                    );
                    return (
                      <StyledDayCheckbox
                        key={item.num}
                        $selected={isSelected}
                        onClick={() => toggleDayOfWeek(item.num)}
                        type="button"
                      >
                        {item.label}
                      </StyledDayCheckbox>
                    );
                  })}
                </StyledDaysOfWeekRow>
              </div>
            </>
          )}

          {activeTab === "monthly" && (
            <div>
              <StyledCalendarHeader>
                <StyledMonthNavBtn onClick={prevMonth} type="button">
                  ‹
                </StyledMonthNavBtn>
                <StyledMonthTitle>
                  {calendarYearMonth.year} 年{" "}
                  {calendarYearMonth.month + 1} 月
                </StyledMonthTitle>
                <StyledMonthNavBtn onClick={nextMonth} type="button">
                  ›
                </StyledMonthNavBtn>
              </StyledCalendarHeader>

              <StyledCalendarGrid>
                {weekDayLabels.map((item) => (
                  <StyledCalendarDayHeader key={item.num}>
                    {item.label}
                  </StyledCalendarDayHeader>
                ))}
                {calendarDays.map((cell) => {
                  if (cell.empty) {
                    return (
                      <StyledCalendarDayCell
                        key={cell.dateKey}
                        $empty
                        $isToday={false}
                        $selected={false}
                        type="button"
                      />
                    );
                  }
                  const isSelected = monthlySelectedDates.includes(
                    cell.dateKey
                  );
                  const isToday = cell.dateKey === today;
                  return (
                    <StyledCalendarDayCell
                      key={cell.dateKey}
                      $empty={false}
                      $isToday={isToday}
                      $selected={isSelected}
                      onClick={() => toggleMonthlyDate(cell.dateKey)}
                      type="button"
                    >
                      {cell.dayNum}
                    </StyledCalendarDayCell>
                  );
                })}
              </StyledCalendarGrid>
            </div>
          )}

          {activeTab === "daily" && (
            <StyledInputRow>
              <div>
                <StyledSectionLabel>
                  {t("tasks.startDate", "开始日期")}
                </StyledSectionLabel>
                <StyledTextInput
                  type="date"
                  value={dailyStartDate}
                  onChange={(e) => setDailyStartDate(e.target.value)}
                />
              </div>
              <div>
                <StyledSectionLabel>
                  {t("tasks.daysCount", "连续执行天数 N")}
                </StyledSectionLabel>
                <StyledTextInput
                  type="number"
                  min="1"
                  max="365"
                  value={dailyDaysCount}
                  onChange={(e) =>
                    setDailyDaysCount(
                      Math.max(1, parseInt(e.target.value) || 1)
                    )
                  }
                />
              </div>
            </StyledInputRow>
          )}
        </StyledModalBody>

        <StyledModalFooter>
          {task.schedule ? (
            <StyledDangerBtn onClick={handleClear} type="button">
              {t("tasks.clearSchedule", "清除计划")}
            </StyledDangerBtn>
          ) : (
            <div />
          )}
          <div style={{ display: "flex", gap: "0.8rem" }}>
            <StyledSecondaryBtn onClick={onClose} type="button">
              {t("tasks.cancel", "取消")}
            </StyledSecondaryBtn>
            <StyledPrimaryBtn onClick={handleSave} type="button">
              {t("tasks.saveSchedule", "保存计划")}
            </StyledPrimaryBtn>
          </div>
        </StyledModalFooter>
      </StyledModalDialog>
    </StyledModalOverlay>
  );
};

export default React.memo(TaskScheduleModal);
