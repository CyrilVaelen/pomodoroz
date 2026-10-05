import React from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { Checkbox, SVG } from "components";
import type { Task } from "store/tasks/types";

const StyledCardShell = styled.div<{ $isDone: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  background-color: var(--color-bg-task-card);
  border: 1px solid var(--color-border-primary);
  opacity: ${(p) => (p.$isDone ? 0.65 : 1)};
  transition: all 120ms ease;
  cursor: pointer;

  &:hover {
    background-color: var(--color-bg-task-card-hover);
    border-color: rgba(var(--color-primary-rgb), 0.5);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-focus);
    outline-offset: 2px;
  }
`;

const StyledCardTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
`;

const StyledParentBadge = styled.span`
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-text);
  background-color: rgba(var(--color-primary-rgb), 0.12);
  border: 1px solid var(--color-primary-border);
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  max-width: 12rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledScorePill = styled.span`
  font-size: 0.95rem;
  color: var(--color-disabled-text);
  font-variant-numeric: tabular-nums;
`;

const StyledCardMainRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
`;

const StyledTaskTitle = styled.span<{ $isDone: boolean }>`
  font-size: 1.15rem;
  line-height: 1.3;
  color: var(--color-heading-text);
  text-decoration: ${(p) => (p.$isDone ? "line-through" : "none")};
  word-break: break-word;
  flex: 1;
`;

const StyledNoteIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 1rem;
  color: var(--color-disabled-text);
  margin-top: 0.2rem;
  padding-left: 2.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  svg {
    width: 1.1rem;
    height: 1.1rem;
    fill: currentColor;
    flex-shrink: 0;
  }
`;

const StyledActionIconBtn = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-disabled-text);
  padding: 0.2rem;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--color-primary-text);
    background-color: var(--color-bg-tertiary);
  }
`;

type Props = {
  listId: string;
  listTitle: string;
  card: Task;
  isDone: boolean;
  onToggleDone: (done: boolean) => void;
  onClick: () => void;
  onSelectForTimer?: () => void;
};

export const TaskMatrixCard: React.FC<Props> = ({
  listTitle,
  card,
  isDone,
  onToggleDone,
  onClick,
  onSelectForTimer,
}) => {
  const { t } = useTranslation();

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    onToggleDone(e.target.checked);
  };

  const handleTimerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectForTimer?.();
  };

  return (
    <StyledCardShell
      $isDone={isDone}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <StyledCardTopRow>
        <StyledParentBadge title={listTitle}>
          {listTitle}
        </StyledParentBadge>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <StyledScorePill>
            {t("tasks.importanceShort", "重")}:{card.importance ?? 3}{" "}
            {t("tasks.urgencyShort", "紧")}:{card.urgency ?? 3}
          </StyledScorePill>
          {onSelectForTimer && (
            <StyledActionIconBtn
              type="button"
              title={t("tasks.selectTask", "关联到计时器")}
              onClick={handleTimerClick}
            >
              <SVG name="play" />
            </StyledActionIconBtn>
          )}
        </div>
      </StyledCardTopRow>

      <StyledCardMainRow>
        <div onClick={handleCheckboxClick}>
          <Checkbox checked={isDone} onChange={handleCheckboxChange} />
        </div>
        <StyledTaskTitle $isDone={isDone}>{card.text}</StyledTaskTitle>
      </StyledCardMainRow>

      {card.description && (
        <StyledNoteIndicator title={card.description}>
          <SVG name="pencil" />
          <span>{card.description.replace(/[\r\n]+/g, " ")}</span>
        </StyledNoteIndicator>
      )}
    </StyledCardShell>
  );
};

export default React.memo(TaskMatrixCard);
