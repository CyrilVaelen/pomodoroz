import React from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import type { TaskList } from "store/tasks/types";
import { getUndatedTasks } from "./matrixUtils";
import TaskMatrixCard from "./TaskMatrixCard";

const StyledDrawerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.35);
  display: flex;
  justify-content: flex-end;
  z-index: 900;
  backdrop-filter: blur(1px);
`;

const StyledDrawerPanel = styled.div`
  width: 100%;
  max-width: 38rem;
  height: 100%;
  background-color: var(--color-bg-primary);
  border-left: 1px solid var(--color-border-primary);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
`;

const StyledDrawerHeader = styled.div`
  padding: 1.2rem 1.6rem;
  border-bottom: 1px solid var(--color-border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StyledDrawerTitle = styled.h3`
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--color-heading-text);
`;

const StyledCloseButton = styled.button`
  background: transparent;
  border: none;
  font-size: 1.6rem;
  color: var(--color-disabled-text);
  cursor: pointer;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;

  &:hover {
    color: var(--color-heading-text);
    background-color: var(--color-bg-secondary);
  }
`;

const StyledDrawerBody = styled.div`
  padding: 1.2rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex: 1;
`;

const StyledDrawerEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-disabled-text);
  font-size: 1.15rem;
  text-align: center;
  gap: 0.6rem;
`;

const StyledHintText = styled.div`
  font-size: 1.05rem;
  color: var(--color-disabled-text);
  margin-bottom: 0.4rem;
`;

type Props = {
  isOpen: boolean;
  taskLists: TaskList[];
  onClose: () => void;
  onToggleUndatedDone: (
    listId: string,
    cardId: string,
    done: boolean
  ) => void;
  onCardClick: (listId: string, cardId: string) => void;
  onSelectForTimer?: (listId: string, cardId: string) => void;
};

export const UndatedTasksDrawer: React.FC<Props> = ({
  isOpen,
  taskLists,
  onClose,
  onToggleUndatedDone,
  onCardClick,
  onSelectForTimer,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const undatedTasks = getUndatedTasks(taskLists);

  return (
    <StyledDrawerOverlay onClick={onClose}>
      <StyledDrawerPanel onClick={(e) => e.stopPropagation()}>
        <StyledDrawerHeader>
          <StyledDrawerTitle>
            {t("tasks.undatedTasks", "未安排任务")} (
            {undatedTasks.length})
          </StyledDrawerTitle>
          <StyledCloseButton onClick={onClose} type="button">
            ✕
          </StyledCloseButton>
        </StyledDrawerHeader>

        <StyledDrawerBody>
          <StyledHintText>
            {t(
              "tasks.undatedHint",
              "以下任务尚未设置具体执行日期。点击卡片可设置重要度、紧急度与明确日期计划。"
            )}
          </StyledHintText>

          {undatedTasks.length === 0 ? (
            <StyledDrawerEmpty>
              <span>{t("tasks.noTasks", "无未安排任务")}</span>
            </StyledDrawerEmpty>
          ) : (
            undatedTasks.map(
              ({ listId, listTitle, card, isDoneOnDate }) => (
                <TaskMatrixCard
                  key={card._id}
                  listId={listId}
                  listTitle={listTitle}
                  card={card}
                  isDone={isDoneOnDate}
                  onToggleDone={(done) =>
                    onToggleUndatedDone(listId, card._id, done)
                  }
                  onClick={() => onCardClick(listId, card._id)}
                  onSelectForTimer={
                    onSelectForTimer
                      ? () => onSelectForTimer(listId, card._id)
                      : undefined
                  }
                />
              )
            )
          )}
        </StyledDrawerBody>
      </StyledDrawerPanel>
    </StyledDrawerOverlay>
  );
};

export default React.memo(UndatedTasksDrawer);
