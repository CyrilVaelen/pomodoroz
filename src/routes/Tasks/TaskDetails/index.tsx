import React, { useRef, useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "hooks";
import TextareaAutosize from "react-textarea-autosize";
import {
  editTaskCard,
  editTaskCardText,
  removeTaskCard,
  setTaskCardDone,
  setTaskCardNotDone,
  setTaskRating,
  setTaskSchedule,
} from "store";
import styled from "styled-components";
import TaskScheduleModal from "../TaskScheduleModal";
import type { TaskSchedule } from "store/tasks/types";

import {
  StyledDetailContainer,
  StyledDescriptionForm,
  StyledDescriptionWrappper,
  StyledDescriptionFormatHelp,
  StyledDetailHeader,
  StyledDetailCloseButton,
  StyledButtonNormal,
  StyledButtonPrimary,
  StyledDeleteButton,
  StyledDescriptionArea,
  StyledDescriptionHeading,
} from "styles";
import { Checkbox, SVG } from "components";
import MDPreviewer from "./MDPreviewer";
import { useTranslation } from "react-i18next";

const StyledScoreSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  border-radius: 6px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-primary);
  margin-bottom: 1.2rem;
`;

const StyledScoreRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const StyledScoreLabel = styled.span`
  font-size: 1.15rem;
  color: var(--color-heading-text);
  font-weight: 500;
`;

const StyledScoreBtnGroup = styled.div`
  display: flex;
  gap: 0.4rem;
`;

const StyledScoreBtn = styled.button<{ $active: boolean }>`
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 4px;
  border: 1px solid
    ${(p) =>
      p.$active
        ? "var(--color-primary-border)"
        : "var(--color-border-primary)"};
  background-color: ${(p) =>
    p.$active ? "var(--color-primary)" : "var(--color-bg-primary)"};
  color: ${(p) =>
    p.$active
      ? "var(--color-primary-button)"
      : "var(--color-body-text)"};
  font-weight: ${(p) => (p.$active ? "600" : "400")};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: all 120ms ease;

  &:hover {
    ${(p) => !p.$active && "background-color: var(--color-bg-tertiary);"}
  }
`;

const StyledScheduleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 1rem;
  border-radius: 6px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-primary);
  margin-bottom: 1.2rem;
`;

const StyledScheduleInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const StyledScheduleLabel = styled.span`
  font-size: 1.1rem;
  color: var(--color-disabled-text);
`;

const StyledScheduleValue = styled.span`
  font-size: 1.2rem;
  color: var(--color-heading-text);
  font-weight: 500;
`;

const StyledScheduleButton = styled.button`
  padding: 0.4rem 0.8rem;
  font-size: 1.1rem;
  border-radius: 4px;
  border: 1px solid var(--color-primary-border);
  background-color: var(--color-bg-primary);
  color: var(--color-primary-text);
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    background-color: var(--color-bg-tertiary);
  }
`;

type Props = {
  listId: string;
  cardId: string;
  onExit?: () => void;
  ref?: React.Ref<HTMLDivElement>;
};

const TaskDetails = ({ listId, cardId, onExit, ref }: Props) => {
  const { t } = useTranslation();
  const cardTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const descriptionAreaRef = useRef<HTMLTextAreaElement>(null);
  const descriptionFormRef = useRef<HTMLFormElement>(null);

  const dispatch = useAppDispatch();

  const tasks = useAppSelector((state) => state.tasks.present);

  const card = tasks
    .find((list) => list._id === listId)
    ?.cards.find((card) => card._id === cardId);

  const [editingDescription, setEditingDescription] = useState(false);

  const [description, setDescription] = useState(card?.description);

  const [showPreview, setShowPreview] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const importance =
    typeof card?.importance === "number" ? card.importance : 3;
  const urgency = typeof card?.urgency === "number" ? card.urgency : 3;

  const onChangeImportance = useCallback(
    (val: number) => {
      dispatch(
        setTaskRating({
          listId,
          cardId,
          importance: val,
          urgency,
        })
      );
    },
    [dispatch, listId, cardId, urgency]
  );

  const onChangeUrgency = useCallback(
    (val: number) => {
      dispatch(
        setTaskRating({
          listId,
          cardId,
          importance,
          urgency: val,
        })
      );
    },
    [dispatch, listId, cardId, importance]
  );

  const onSaveSchedule = useCallback(
    (schedule: TaskSchedule | null) => {
      dispatch(setTaskSchedule({ listId, cardId, schedule }));
      setShowScheduleModal(false);
    },
    [dispatch, listId, cardId]
  );

  useEffect(() => {
    if (cardTextAreaRef.current) {
      if (card?.text) {
        cardTextAreaRef.current.value = card?.text;
      }
    }
  }, [card]);

  useEffect(() => {
    if (editingDescription) {
      if (descriptionAreaRef.current) {
        descriptionAreaRef.current.focus();
      }
    }
  }, [editingDescription, showPreview]);

  const onEditCardText = useCallback(() => {
    if (cardTextAreaRef.current && cardTextAreaRef.current.value) {
      dispatch(
        editTaskCardText({
          listId,
          cardId,
          cardText: cardTextAreaRef.current.value,
        })
      );
    }
  }, [dispatch, cardId, listId]);

  const onSubmitAction = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      dispatch(editTaskCard({ listId, cardId, description }));
      setEditingDescription(false);
    },
    [dispatch, cardId, description, listId]
  );

  const onCardDeleteAction = useCallback(() => {
    dispatch(removeTaskCard({ listId, cardId }));

    if (onExit) {
      onExit();
    }
  }, [cardId, dispatch, listId, onExit]);

  const showPreviewCallback = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setShowPreview(e.currentTarget.checked),
    []
  );

  const setTaskCardDoneCallback = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.currentTarget.checked) {
        dispatch(setTaskCardDone({ listId, cardId: card?._id }));
      } else {
        dispatch(setTaskCardNotDone({ listId, cardId: card?._id }));
      }
    },
    [dispatch, listId, card]
  );

  const editDescriptionCallback = useCallback(
    () => setEditingDescription(true),
    []
  );

  const dontEditDescriptionCallback = useCallback(
    () => setEditingDescription(false),
    []
  );

  const setDescriptionCallback = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setDescription(e.target.value),
    []
  );

  useEffect(() => {
    function registerEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (onExit) {
          onExit();
        }
      }
    }

    document.addEventListener("keydown", registerEscape);
    return () =>
      document.removeEventListener("keydown", registerEscape);
  }, [onExit]);

  return (
    <StyledDetailContainer ref={ref}>
      <StyledDetailHeader
        as={TextareaAutosize}
        ref={cardTextAreaRef}
        onBlur={onEditCardText}
      />

      <StyledDetailCloseButton onClick={onExit}>
        <SVG name="close" />
      </StyledDetailCloseButton>

      <StyledDescriptionWrappper>
        <StyledScoreSection>
          <StyledScoreRow>
            <StyledScoreLabel>
              {t("tasks.importance", "重要性")}: {importance}
            </StyledScoreLabel>
            <StyledScoreBtnGroup>
              {[1, 2, 3, 4, 5].map((num) => (
                <StyledScoreBtn
                  key={num}
                  $active={importance === num}
                  onClick={() => onChangeImportance(num)}
                  type="button"
                >
                  {num}
                </StyledScoreBtn>
              ))}
            </StyledScoreBtnGroup>
          </StyledScoreRow>

          <StyledScoreRow>
            <StyledScoreLabel>
              {t("tasks.urgency", "紧急性")}: {urgency}
            </StyledScoreLabel>
            <StyledScoreBtnGroup>
              {[1, 2, 3, 4, 5].map((num) => (
                <StyledScoreBtn
                  key={num}
                  $active={urgency === num}
                  onClick={() => onChangeUrgency(num)}
                  type="button"
                >
                  {num}
                </StyledScoreBtn>
              ))}
            </StyledScoreBtnGroup>
          </StyledScoreRow>
        </StyledScoreSection>

        <StyledScheduleRow>
          <StyledScheduleInfo>
            <StyledScheduleLabel>
              {t("tasks.scheduleTitle", "明确日期计划")}
            </StyledScheduleLabel>
            <StyledScheduleValue>
              {card?.schedule?.type === "weekly"
                ? `${t("tasks.scheduleWeekly", "周计划")} (${card.schedule.selectedWeeks.length} 周)`
                : card?.schedule?.type === "monthly"
                  ? `${t("tasks.scheduleMonthly", "月计划")} (${card.schedule.selectedDates.length} 天)`
                  : card?.schedule?.type === "daily"
                    ? `${t("tasks.scheduleDaily", "连续天数")} (${card.schedule.daysCount} 天)`
                    : t("tasks.noSchedule", "未安排日期")}
            </StyledScheduleValue>
          </StyledScheduleInfo>
          <StyledScheduleButton
            type="button"
            onClick={() => setShowScheduleModal(true)}
          >
            {card?.schedule
              ? t("tasks.editSchedule", "修改计划")
              : t("tasks.setSchedule", "设置计划")}
          </StyledScheduleButton>
        </StyledScheduleRow>

        <StyledDescriptionHeading>
          {t("tasks.description")}
          <Checkbox
            label={t("tasks.preview")}
            hidden={!editingDescription}
            onChange={showPreviewCallback}
            asPrimary
          />
        </StyledDescriptionHeading>

        {editingDescription ? (
          <StyledDescriptionForm
            onSubmit={onSubmitAction}
            ref={descriptionFormRef}
          >
            {showPreview ? (
              <MDPreviewer description={description} />
            ) : (
              <>
                <StyledDescriptionArea
                  as={TextareaAutosize}
                  placeholder={t(
                    "tasks.detailedDescriptionPlaceholder"
                  )}
                  value={description}
                  onChange={setDescriptionCallback}
                  ref={descriptionAreaRef}
                />
                <StyledButtonPrimary type="submit">
                  {t("tasks.save")}
                </StyledButtonPrimary>

                <StyledButtonNormal
                  type="reset"
                  onClick={dontEditDescriptionCallback}
                >
                  {t("tasks.cancel")}
                </StyledButtonNormal>

                <StyledDescriptionFormatHelp
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet"
                >
                  {t("tasks.formattingHelp")}
                </StyledDescriptionFormatHelp>
              </>
            )}
          </StyledDescriptionForm>
        ) : (
          <MDPreviewer
            description={description}
            onClick={editDescriptionCallback}
          />
        )}
        <Checkbox
          label={t("tasks.done")}
          checked={card?.done}
          onChange={setTaskCardDoneCallback}
        />
      </StyledDescriptionWrappper>

      <StyledDeleteButton onClick={onCardDeleteAction}>
        <SVG name="trash" /> {t("tasks.deleteCard")}
      </StyledDeleteButton>

      {showScheduleModal && card && (
        <TaskScheduleModal
          task={card}
          onSave={onSaveSchedule}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </StyledDetailContainer>
  );
};

export default TaskDetails;
