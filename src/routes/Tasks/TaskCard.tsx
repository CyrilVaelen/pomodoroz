import React, { useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import TextareaAutosize from "react-textarea-autosize";
import {
  StyledCard,
  StyledCardMain,
  StyledCardText,
  StyledCardEditButton,
  StyledCardPriorityButton,
  StyledCardSaveButton,
  StyledCardTextArea,
  StyledCardActionWrapper,
  StyledCardDeleteButton,
  StyledCardDragHandle,
} from "styles";
import { SVG } from "components";
import { useTargetOutside } from "hooks";

type Props = {
  id: string;
  listId: string;
  text: string;
  done: boolean;
  prioritized: boolean;
  onClick?:
    | ((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void)
    | undefined;
  onSaveCardText?: (text: string) => void;
  onDeleteCard?: () => void;
  onTogglePriority?: (prioritized: boolean) => void;
  onContextMenu?:
    | ((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void)
    | undefined;
};

const TaskCard: React.FC<Props> = ({
  id,
  listId,
  text,
  done,
  prioritized,
  onClick,
  onDeleteCard,
  onSaveCardText,
  onTogglePriority,
  onContextMenu,
}) => {
  const { t } = useTranslation();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card:${id}`,
    data: { type: "card", listId, cardId: id },
  });

  const [editing, setEditing] = useTargetOutside({ ref: areaRef });

  useEffect(() => {
    if (editing) {
      if (areaRef.current) {
        areaRef.current.focus();
        areaRef.current.value = text;

        areaRef.current.onkeydown = (e: KeyboardEvent) => {
          if (e.key !== "Enter" || !areaRef.current) return;
          e.preventDefault();
          if (onSaveCardText && areaRef.current.value) {
            onSaveCardText(areaRef.current.value);
          }
          setEditing(false);
        };
      }
    }
  }, [editing, text, onSaveCardText, setEditing]);

  const onEditCardAction = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.stopPropagation();
    setEditing(true);
  };

  const onDeleteCardAction = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.stopPropagation();
    if (onDeleteCard) {
      onDeleteCard();
    }
  };

  const onTogglePriorityAction = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.stopPropagation();

    if (onTogglePriority) {
      onTogglePriority(!prioritized);
    }
  };

  const onSaveCardAction = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.stopPropagation();

    if (areaRef.current) {
      if (onSaveCardText && areaRef.current.value) {
        onSaveCardText(areaRef.current.value);
      }
      setEditing(false);
    }
  };

  const renderCardText = () =>
    editing ? (
      <StyledCardTextArea
        as={TextareaAutosize}
        ref={areaRef}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />
    ) : (
      <StyledCardText done={done}>{text}</StyledCardText>
    );

  const renderActionButton = () =>
    editing ? (
      <StyledCardSaveButton onClick={onSaveCardAction}>
        <SVG name="save" />
      </StyledCardSaveButton>
    ) : (
      <StyledCardActionWrapper>
        <StyledCardEditButton onClick={onEditCardAction}>
          <SVG name="pencil" />
        </StyledCardEditButton>
        <StyledCardDeleteButton onClick={onDeleteCardAction}>
          <SVG name="trash" />
        </StyledCardDeleteButton>
      </StyledCardActionWrapper>
    );

  const contextMenuHint = done ? undefined : t("grid.selectHint");
  const priorityLabel = prioritized
    ? t("grid.unmarkPriority")
    : t("grid.markPriority");

  return (
    <StyledCard
      ref={setNodeRef}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          if (!editing) {
            event.preventDefault();
            onClick?.(
              event as unknown as React.MouseEvent<
                HTMLDivElement,
                MouseEvent
              >
            );
          }
        }
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      isDragging={isDragging}
      focused={editing}
      onClick={onClick}
      title={contextMenuHint}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (done) return;
        onContextMenu?.(event);
      }}
    >
      <StyledCardMain>
        <StyledCardDragHandle
          type="button"
          title={t("tasks.dragTask")}
          aria-label={t("tasks.dragTask")}
          ref={setActivatorNodeRef}
          disabled={editing}
          {...(!editing ? attributes : {})}
          {...(!editing ? listeners : {})}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <SVG name="option-y" />
        </StyledCardDragHandle>
        {!editing ? (
          <StyledCardPriorityButton
            type="button"
            $active={prioritized}
            onClick={onTogglePriorityAction}
            title={priorityLabel}
            aria-label={priorityLabel}
            aria-pressed={prioritized}
          >
            <svg
              viewBox="0 0 16 16"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M8 2.4 9.7 5.8l3.8.6-2.8 2.7.7 3.8L8 11.1l-3.4 1.8.7-3.8-2.8-2.7 3.8-.6L8 2.4Z" />
            </svg>
          </StyledCardPriorityButton>
        ) : null}
        {renderCardText()}
      </StyledCardMain>
      {renderActionButton()}
    </StyledCard>
  );
};

export default React.memo(TaskCard);
