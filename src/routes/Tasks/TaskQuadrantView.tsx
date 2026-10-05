import React from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import type { TaskList } from "store/tasks/types";
import {
  FlatMatrixCard,
  QuadrantId,
  getQuadrant,
  getTasksForDate,
} from "./matrixUtils";
import TaskMatrixCard from "./TaskMatrixCard";

const StyledQuadrantContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 0.8rem;
  background-color: var(--color-bg-primary);
`;

const StyledQuadrantGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1rem;
  min-height: 48rem;
  width: 100%;
  height: 100%;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    min-height: auto;
  }
`;

const StyledQuadrantBox = styled.div<{ $quadrant: QuadrantId }>`
  border-radius: 8px;
  border: 1px solid var(--color-border-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: ${(p) => {
    switch (p.$quadrant) {
      case "Q1":
        return "rgba(219, 51, 82, 0.05)"; // 重要且紧急
      case "Q2":
        return "rgba(166, 103, 3, 0.05)"; // 紧急不重要
      case "Q4":
        return "rgba(0, 123, 199, 0.05)"; // 重要不紧急
      case "Q3":
      default:
        return "var(--color-bg-secondary)"; // 不重要不紧急
    }
  }};
`;

const StyledQuadrantHeader = styled.div<{ $quadrant: QuadrantId }>`
  padding: 0.8rem 1rem;
  border-bottom: 1px solid var(--color-border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-bg-secondary);
`;

const StyledQuadrantTitle = styled.h4<{ $quadrant: QuadrantId }>`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${(p) => {
    switch (p.$quadrant) {
      case "Q1":
        return "var(--color-pink)";
      case "Q2":
        return "var(--color-yellow)";
      case "Q4":
        return "var(--color-primary)";
      case "Q3":
      default:
        return "var(--color-body-text)";
    }
  }};
`;

const StyledQuadrantBadge = styled.span`
  font-size: 1.05rem;
  color: var(--color-disabled-text);
  font-weight: 500;
`;

const StyledQuadrantCardsList = styled.div`
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  overflow-y: auto;
  flex: 1;
`;

const StyledEmptyNotice = styled.div`
  font-size: 1.1rem;
  color: var(--color-disabled-text);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 6rem;
`;

type Props = {
  taskLists: TaskList[];
  selectedDate: string;
  onToggleTaskDone: (
    listId: string,
    cardId: string,
    dateKey: string,
    done: boolean
  ) => void;
  onCardClick: (listId: string, cardId: string) => void;
  onSelectForTimer?: (listId: string, cardId: string) => void;
};

export const TaskQuadrantView: React.FC<Props> = ({
  taskLists,
  selectedDate,
  onToggleTaskDone,
  onCardClick,
  onSelectForTimer,
}) => {
  const { t } = useTranslation();

  const tasksOnDate = React.useMemo(() => {
    return getTasksForDate(taskLists, selectedDate);
  }, [taskLists, selectedDate]);

  // 按四象限归类
  const quadrantMap = React.useMemo(() => {
    const map: Record<QuadrantId, FlatMatrixCard[]> = {
      Q1: [],
      Q2: [],
      Q3: [],
      Q4: [],
    };

    for (const item of tasksOnDate) {
      const q = getQuadrant(item.importance, item.urgency);
      map[q].push(item);
    }

    return map;
  }, [tasksOnDate]);

  const renderQuadrantBox = (
    id: QuadrantId,
    titleKey: string,
    scoreRange: string
  ) => {
    const cards = quadrantMap[id];
    return (
      <StyledQuadrantBox key={id} $quadrant={id}>
        <StyledQuadrantHeader $quadrant={id}>
          <StyledQuadrantTitle $quadrant={id}>
            {t(titleKey)}
          </StyledQuadrantTitle>
          <StyledQuadrantBadge>
            {scoreRange} • {cards.length}
          </StyledQuadrantBadge>
        </StyledQuadrantHeader>
        <StyledQuadrantCardsList>
          {cards.length === 0 ? (
            <StyledEmptyNotice>
              {t("tasks.noTasks", "无任务")}
            </StyledEmptyNotice>
          ) : (
            cards.map(({ listId, listTitle, card, isDoneOnDate }) => (
              <TaskMatrixCard
                key={card._id}
                listId={listId}
                listTitle={listTitle}
                card={card}
                isDone={isDoneOnDate}
                onToggleDone={(done) =>
                  onToggleTaskDone(listId, card._id, selectedDate, done)
                }
                onClick={() => onCardClick(listId, card._id)}
                onSelectForTimer={
                  onSelectForTimer
                    ? () => onSelectForTimer(listId, card._id)
                    : undefined
                }
              />
            ))
          )}
        </StyledQuadrantCardsList>
      </StyledQuadrantBox>
    );
  };

  return (
    <StyledQuadrantContainer>
      <StyledQuadrantGrid>
        {/* 左上: Q2 紧急不重要 (紧急 3-5, 重要 1-2) */}
        {renderQuadrantBox(
          "Q2",
          "tasks.quadrantQ2",
          `${t("tasks.urgencyShort", "紧")}:3-5 ${t("tasks.importanceShort", "重")}:1-2`
        )}

        {/* 右上: Q1 重要且紧急 (紧急 3-5, 重要 3-5) */}
        {renderQuadrantBox(
          "Q1",
          "tasks.quadrantQ1",
          `${t("tasks.urgencyShort", "紧")}:3-5 ${t("tasks.importanceShort", "重")}:3-5`
        )}

        {/* 左下: Q3 不重要不紧急 (紧急 1-2, 重要 1-2) */}
        {renderQuadrantBox(
          "Q3",
          "tasks.quadrantQ3",
          `${t("tasks.urgencyShort", "紧")}:1-2 ${t("tasks.importanceShort", "重")}:1-2`
        )}

        {/* 右下: Q4 重要不紧急 (紧急 1-2, 重要 3-5) */}
        {renderQuadrantBox(
          "Q4",
          "tasks.quadrantQ4",
          `${t("tasks.urgencyShort", "紧")}:1-2 ${t("tasks.importanceShort", "重")}:3-5`
        )}
      </StyledQuadrantGrid>
    </StyledQuadrantContainer>
  );
};

export default React.memo(TaskQuadrantView);
