import React from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import type { TaskList, Task } from "store/tasks/types";
import {
  FlatMatrixCard,
  getClampedScore,
  getTasksForDate,
} from "./matrixUtils";
import TaskMatrixCard from "./TaskMatrixCard";

const StyledMatrixContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 0.8rem;
  background-color: var(--color-bg-primary);
`;

const StyledMatrixScrollArea = styled.div`
  min-width: 68rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const StyledAxisHeaderRow = styled.div`
  display: grid;
  grid-template-columns: 4.8rem repeat(5, 1fr);
  gap: 0.6rem;
  align-items: center;
  text-align: center;
`;

const StyledAxisCorner = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-disabled-text);
  padding: 0.4rem;
  line-height: 1.2;
`;

const StyledColHeader = styled.div`
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-heading-text);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: 4px;
  padding: 0.4rem;
`;

const StyledMatrixGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const StyledGridRow = styled.div`
  display: grid;
  grid-template-columns: 4.8rem repeat(5, 1fr);
  gap: 0.6rem;
  min-height: 9.5rem;
`;

const StyledRowHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-heading-text);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: 4px;
  text-align: center;
  padding: 0.4rem;
`;

const StyledCell = styled.div<{ $isCenter: boolean }>`
  background-color: ${(p) =>
    p.$isCenter
      ? "rgba(var(--color-primary-rgb), 0.04)"
      : "var(--color-bg-secondary)"};
  border: 1px dashed
    ${(p) =>
      p.$isCenter
        ? "rgba(var(--color-primary-rgb), 0.3)"
        : "var(--color-border-primary)"};
  border-radius: 6px;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  overflow-y: auto;
  max-height: 22rem;

  &:hover {
    border-style: solid;
    border-color: rgba(var(--color-primary-rgb), 0.4);
  }
`;

const StyledEmptyCell = styled.div`
  font-size: 0.95rem;
  color: var(--color-disabled-text);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 4rem;
  user-select: none;
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

export const TaskMatrixView: React.FC<Props> = ({
  taskLists,
  selectedDate,
  onToggleTaskDone,
  onCardClick,
  onSelectForTimer,
}) => {
  const { t } = useTranslation();

  // 获取当前所选日期的所有任务
  const tasksOnDate = React.useMemo(() => {
    return getTasksForDate(taskLists, selectedDate);
  }, [taskLists, selectedDate]);

  // 将任务放入 5×5 单元格中：key 为 `${urgency}-${importance}`
  const cellsMap = React.useMemo(() => {
    const map = new Map<string, FlatMatrixCard[]>();
    for (let u = 1; u <= 5; u++) {
      for (let i = 1; i <= 5; i++) {
        map.set(`${u}-${i}`, []);
      }
    }
    for (const item of tasksOnDate) {
      const u = getClampedScore(item.urgency);
      const i = getClampedScore(item.importance);
      const key = `${u}-${i}`;
      map.get(key)?.push(item);
    }
    return map;
  }, [tasksOnDate]);

  // Y轴（紧急性）：纵轴从下到上递增，因此行从上至下依次为 5, 4, 3, 2, 1
  const urgencyRows = [5, 4, 3, 2, 1];
  // X轴（重要性）：横轴从左到右递增，因此列从左至右依次为 1, 2, 3, 4, 5
  const importanceCols = [1, 2, 3, 4, 5];

  return (
    <StyledMatrixContainer>
      <StyledMatrixScrollArea>
        {/* 列头（重要性轴） */}
        <StyledAxisHeaderRow>
          <StyledAxisCorner>
            {t("tasks.urgencyShort", "紧急")}↑
            <br />
            {t("tasks.importanceShort", "重要")}→
          </StyledAxisCorner>
          {importanceCols.map((col) => (
            <StyledColHeader key={col}>
              {t("tasks.importanceShort", "重要")} {col}
            </StyledColHeader>
          ))}
        </StyledAxisHeaderRow>

        {/* 5×5 网格 */}
        <StyledMatrixGrid>
          {urgencyRows.map((urg) => (
            <StyledGridRow key={urg}>
              <StyledRowHeader>
                {t("tasks.urgencyShort", "紧急")} {urg}
              </StyledRowHeader>
              {importanceCols.map((imp) => {
                const key = `${urg}-${imp}`;
                const cellTasks = cellsMap.get(key) || [];
                const isCenter = urg === 3 && imp === 3;
                return (
                  <StyledCell key={key} $isCenter={isCenter}>
                    {cellTasks.length === 0 ? (
                      <StyledEmptyCell>—</StyledEmptyCell>
                    ) : (
                      cellTasks.map(
                        ({ listId, listTitle, card, isDoneOnDate }) => (
                          <TaskMatrixCard
                            key={card._id}
                            listId={listId}
                            listTitle={listTitle}
                            card={card}
                            isDone={isDoneOnDate}
                            onToggleDone={(done) =>
                              onToggleTaskDone(
                                listId,
                                card._id,
                                selectedDate,
                                done
                              )
                            }
                            onClick={() =>
                              onCardClick(listId, card._id)
                            }
                            onSelectForTimer={
                              onSelectForTimer
                                ? () =>
                                    onSelectForTimer(listId, card._id)
                                : undefined
                            }
                          />
                        )
                      )
                    )}
                  </StyledCell>
                );
              })}
            </StyledGridRow>
          ))}
        </StyledMatrixGrid>
      </StyledMatrixScrollArea>
    </StyledMatrixContainer>
  );
};

export default React.memo(TaskMatrixView);
