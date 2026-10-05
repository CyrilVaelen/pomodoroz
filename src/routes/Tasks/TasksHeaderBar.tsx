import React, { useState } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { addDays, getTodayDateKey } from "./matrixUtils";

const StyledToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.8rem;
  padding: 0.8rem 1.4rem;
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-primary);
  flex-shrink: 0;

  @media (max-width: 480px) {
    padding: 0.6rem 0.8rem;
    gap: 0.6rem;
  }
`;

const StyledToolbarGroup = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
`;

const StyledViewTabs = styled.div`
  display: flex;
  border-radius: 4px;
  background-color: var(--color-bg-tertiary);
  padding: 0.2rem;
  gap: 0.2rem;
`;

const StyledTabBtn = styled.button<{ $active: boolean }>`
  border: none;
  background-color: ${(p) =>
    p.$active ? "var(--color-bg-primary)" : "transparent"};
  color: ${(p) =>
    p.$active ? "var(--color-heading-text)" : "var(--color-body-text)"};
  font-weight: ${(p) => (p.$active ? "600" : "400")};
  font-size: 1.1rem;
  padding: 0.4rem 0.8rem;
  border-radius: 3px;
  cursor: pointer;
  transition: all 120ms ease;
  box-shadow: ${(p) =>
    p.$active ? "0 1px 3px rgba(0, 0, 0, 0.1)" : "none"};

  &:hover {
    color: var(--color-heading-text);
  }

  @media (max-width: 480px) {
    padding: 0.35rem 0.55rem;
    font-size: 1.05rem;
  }
`;

const StyledDateNav = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 4px;
  overflow: hidden;
`;

const StyledDateNavBtn = styled.button`
  border: none;
  background: transparent;
  padding: 0.4rem 0.6rem;
  font-size: 1.1rem;
  color: var(--color-body-text);
  cursor: pointer;

  &:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-heading-text);
  }
`;

const StyledCurrentDateDisplay = styled.span<{ $isToday: boolean }>`
  font-size: 1.15rem;
  font-weight: 500;
  padding: 0.2rem 0.6rem;
  color: ${(p) =>
    p.$isToday
      ? "var(--color-primary-text)"
      : "var(--color-heading-text)"};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const StyledHiddenDateInput = styled.input`
  width: 2.2rem;
  height: 2.2rem;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  opacity: 0.6;

  &:hover {
    opacity: 1;
  }
`;

const StyledUndatedButton = styled.button<{ $count: number }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  border-radius: 4px;
  border: 1px solid var(--color-border-primary);
  background-color: var(--color-bg-primary);
  color: var(--color-heading-text);
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    border-color: var(--color-primary-border);
    color: var(--color-primary-text);
  }
`;

const StyledBadge = styled.span`
  background-color: rgba(var(--color-primary-rgb), 0.15);
  color: var(--color-primary-text);
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
`;

const StyledAddListForm = styled.form`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const StyledAddInput = styled.input`
  padding: 0.35rem 0.6rem;
  font-size: 1.1rem;
  border-radius: 3px;
  border: 1px solid var(--color-border-primary);
  background-color: var(--color-bg-primary);
  color: var(--color-heading-text);
  width: 11rem;

  &:focus {
    border-color: var(--color-primary-border);
    outline: none;
  }
`;

const StyledAddBtn = styled.button`
  padding: 0.35rem 0.6rem;
  font-size: 1.1rem;
  border-radius: 3px;
  border: 1px solid var(--color-primary-border);
  background-color: var(--color-primary);
  color: var(--color-primary-button);
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

export type TasksViewMode = "matrix" | "quadrant" | "list";

type Props = {
  viewMode: TasksViewMode;
  onViewModeChange: (mode: TasksViewMode) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  undatedCount: number;
  onOpenUndated: () => void;
  onAddList: (title: string) => void;
};

export const TasksHeaderBar: React.FC<Props> = ({
  viewMode,
  onViewModeChange,
  selectedDate,
  onSelectDate,
  undatedCount,
  onOpenUndated,
  onAddList,
}) => {
  const { t } = useTranslation();
  const today = getTodayDateKey();
  const isToday = selectedDate === today;

  const [newListTitle, setNewListTitle] = useState("");
  const [isAddingList, setIsAddingList] = useState(false);

  const handlePrevDay = () => onSelectDate(addDays(selectedDate, -1));
  const handleNextDay = () => onSelectDate(addDays(selectedDate, 1));
  const handleToday = () => onSelectDate(today);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListTitle.trim()) {
      onAddList(newListTitle.trim());
      setNewListTitle("");
      setIsAddingList(false);
    }
  };

  return (
    <StyledToolbar>
      {/* 视图模式切换 */}
      <StyledToolbarGroup>
        <StyledViewTabs>
          <StyledTabBtn
            $active={viewMode === "matrix"}
            onClick={() => onViewModeChange("matrix")}
            type="button"
          >
            ▦ {t("tasks.viewMatrix", "5×5 矩阵")}
          </StyledTabBtn>
          <StyledTabBtn
            $active={viewMode === "quadrant"}
            onClick={() => onViewModeChange("quadrant")}
            type="button"
          >
            ⊞ {t("tasks.viewQuadrant", "四象限")}
          </StyledTabBtn>
          <StyledTabBtn
            $active={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
            type="button"
          >
            ☰ {t("tasks.viewList", "列表")}
          </StyledTabBtn>
        </StyledViewTabs>

        {/* 日期导航（矩阵与四象限生效） */}
        {viewMode !== "list" && (
          <StyledDateNav>
            <StyledDateNavBtn
              onClick={handlePrevDay}
              type="button"
              title={t("tasks.prevDay", "前一天")}
            >
              ‹
            </StyledDateNavBtn>
            <StyledDateNavBtn
              onClick={handleToday}
              type="button"
              title={t("tasks.today", "回到今天")}
            >
              {t("tasks.today", "今天")}
            </StyledDateNavBtn>
            <StyledDateNavBtn
              onClick={handleNextDay}
              type="button"
              title={t("tasks.nextDay", "后一天")}
            >
              ›
            </StyledDateNavBtn>
            <StyledCurrentDateDisplay $isToday={isToday}>
              <span>{selectedDate}</span>
              <StyledHiddenDateInput
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) onSelectDate(e.target.value);
                }}
                title={t("tasks.selectDate", "选择日期")}
              />
            </StyledCurrentDateDisplay>
          </StyledDateNav>
        )}
      </StyledToolbarGroup>

      {/* 右侧：未安排抽屉入口与新建分组 */}
      <StyledToolbarGroup>
        <StyledUndatedButton
          $count={undatedCount}
          onClick={onOpenUndated}
          type="button"
          title={t("tasks.undatedTasks", "查看未安排日期的任务")}
        >
          <span>{t("tasks.undatedTasks", "未安排任务")}</span>
          <StyledBadge>{undatedCount}</StyledBadge>
        </StyledUndatedButton>

        {isAddingList ? (
          <StyledAddListForm onSubmit={handleAddSubmit}>
            <StyledAddInput
              autoFocus
              placeholder={t(
                "tasks.enterListTitlePlaceholder",
                "输入列表标题"
              )}
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              onBlur={() => {
                if (!newListTitle.trim()) setIsAddingList(false);
              }}
            />
            <StyledAddBtn type="submit">+</StyledAddBtn>
          </StyledAddListForm>
        ) : (
          <StyledUndatedButton
            $count={0}
            onClick={() => setIsAddingList(true)}
            type="button"
          >
            + {t("tasks.addList", "添加列表")}
          </StyledUndatedButton>
        )}
      </StyledToolbarGroup>
    </StyledToolbar>
  );
};

export default React.memo(TasksHeaderBar);
