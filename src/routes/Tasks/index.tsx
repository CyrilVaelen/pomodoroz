import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppDispatch, useAppSelector } from "hooks";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  StyledTaskContainer,
  StyledTaskStickySection,
  StyledTaskWrapper,
  StyledTaskMain,
} from "styles";
import {
  addTaskList,
  dragList,
  redoTasks,
  setTaskListPriority,
  setTaskSelection,
  setTaskCardDone,
  setTaskCardNotDone,
  toggleTaskDateCompletion,
  undoTasks,
} from "store";
import { getFromStorage, saveToStorage } from "utils";
import TasksHeaderBar, { type TasksViewMode } from "./TasksHeaderBar";
import TaskMatrixView from "./TaskMatrixView";
import TaskQuadrantView from "./TaskQuadrantView";
import UndatedTasksDrawer from "./UndatedTasksDrawer";
import TaskDetails from "./TaskDetails";
import { getTodayDateKey, getUndatedTasks } from "./matrixUtils";

import TaskFormButton from "./TaskFormButton";
import TaskCardDragOverlay from "./TaskCardDragOverlay";
import TaskInnerList from "./TaskInnerList";

const TASKS_VIEW_MODE_STORAGE_KEY = "tasks-view-mode";
type TimerNavigationState = {
  selectedTask?: {
    listId: string;
    cardId: string;
  };
};
type DragListData = {
  type: "list";
  listId: string;
};
type DragCardData = {
  type: "card";
  listId: string;
  cardId: string;
};
type DragCardContainerData = {
  type: "card-container";
  listId: string;
};
type ActiveDragCardPreview = {
  text: string;
  done: boolean;
  width?: number;
};

const getInitialViewMode = (): TasksViewMode => {
  const savedViewMode = getFromStorage<string>(
    TASKS_VIEW_MODE_STORAGE_KEY
  );
  if (
    savedViewMode === "matrix" ||
    savedViewMode === "quadrant" ||
    savedViewMode === "list"
  ) {
    return savedViewMode;
  }
  return "matrix";
};

export default function Tasks() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tasks = useAppSelector((state) => state.tasks);

  const dispatch = useAppDispatch();
  const [viewMode, setViewMode] =
    useState<TasksViewMode>(getInitialViewMode);
  const [selectedDate, setSelectedDate] =
    useState<string>(getTodayDateKey);
  const [isUndatedOpen, setIsUndatedOpen] = useState(false);
  const [activeDetailCard, setActiveDetailCard] = useState<{
    listId: string;
    cardId: string;
  } | null>(null);

  const [activeDragCardPreview, setActiveDragCardPreview] =
    useState<ActiveDragCardPreview | null>(null);

  const undatedTasksCount = useMemo(() => {
    return getUndatedTasks(tasks.present).length;
  }, [tasks.present]);

  const handleToggleDateDone = useCallback(
    (
      listId: string,
      cardId: string,
      dateKey: string,
      done: boolean
    ) => {
      dispatch(
        toggleTaskDateCompletion({ listId, cardId, dateKey, done })
      );
    },
    [dispatch]
  );

  const handleToggleUndatedDone = useCallback(
    (listId: string, cardId: string, done: boolean) => {
      if (done) {
        dispatch(setTaskCardDone({ listId, cardId }));
      } else {
        dispatch(setTaskCardNotDone({ listId, cardId }));
      }
    },
    [dispatch]
  );

  const handleOpenCardDetail = useCallback(
    (listId: string, cardId: string) => {
      setActiveDetailCard({ listId, cardId });
    },
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const onListAdd = (value: string) => dispatch(addTaskList(value));

  const onDragStart = ({ active }: DragStartEvent) => {
    const activeData = active.data.current as
      DragListData | DragCardData | undefined;

    if (!activeData || activeData.type !== "card") {
      setActiveDragCardPreview(null);
      return;
    }

    const sourceList = tasks.present.find(
      (list) => list._id === activeData.listId
    );
    const sourceCard = sourceList?.cards.find(
      (card) => card._id === activeData.cardId
    );

    if (!sourceCard) {
      setActiveDragCardPreview(null);
      return;
    }

    setActiveDragCardPreview({
      text: sourceCard.text,
      done: sourceCard.done,
      width: active.rect.current.initial?.width,
    });
  };

  const handleGridSelect = useCallback(
    (listId: string, cardId?: string) => {
      if (!cardId) {
        return;
      }

      const selectedList = tasks.present.find(
        (taskList) => taskList._id === listId
      );
      const selectedCard = selectedList?.cards.find(
        (card) => card._id === cardId && !card.done
      );

      if (!selectedList || !selectedCard) {
        return;
      }

      dispatch(setTaskListPriority(listId));
      dispatch(setTaskSelection({ listId, cardId }));
      const state: TimerNavigationState = {
        selectedTask: {
          listId,
          cardId,
        },
      };
      navigate("/", { state });
    },
    [dispatch, navigate, tasks.present]
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragCardPreview(null);

    if (!over) {
      return;
    }

    const activeData = active.data.current as
      DragListData | DragCardData | undefined;

    const overData = over.data.current as
      DragListData | DragCardData | DragCardContainerData | undefined;

    if (!activeData || !overData) {
      return;
    }

    if (activeData.type === "list" && overData.type === "list") {
      const sourceIndex = tasks.present.findIndex(
        (list) => list._id === activeData.listId
      );
      const destinationIndex = tasks.present.findIndex(
        (list) => list._id === overData.listId
      );

      if (
        sourceIndex < 0 ||
        destinationIndex < 0 ||
        sourceIndex === destinationIndex
      ) {
        return;
      }

      dispatch(
        dragList({
          sourceId: "task-list",
          destinationId: "task-list",
          sourceIndex,
          destinationIndex,
          draggableId: activeData.listId,
          type: "list",
        })
      );

      return;
    }

    if (activeData.type !== "card") {
      return;
    }

    const sourceListId = activeData.listId;
    const sourceList = tasks.present.find(
      (list) => list._id === sourceListId
    );
    const sourceIndex =
      sourceList?.cards.findIndex(
        (card) => card._id === activeData.cardId
      ) ?? -1;

    if (!sourceList || sourceIndex < 0) {
      return;
    }

    let destinationListId = sourceListId;
    let destinationIndex = sourceList.cards.length;

    if (overData.type === "card") {
      destinationListId = overData.listId;
      const destinationList = tasks.present.find(
        (list) => list._id === destinationListId
      );

      if (!destinationList) {
        return;
      }

      destinationIndex = destinationList.cards.findIndex(
        (card) => card._id === overData.cardId
      );

      if (destinationIndex < 0) {
        destinationIndex = destinationList.cards.length;
      }
    } else if (
      overData.type === "card-container" ||
      overData.type === "list"
    ) {
      destinationListId = overData.listId;
      const destinationList = tasks.present.find(
        (list) => list._id === destinationListId
      );

      if (!destinationList) {
        return;
      }

      destinationIndex = destinationList.cards.length;
    }

    if (
      sourceListId === destinationListId &&
      sourceIndex === destinationIndex
    ) {
      return;
    }

    dispatch(
      dragList({
        sourceId: sourceListId,
        destinationId: destinationListId,
        sourceIndex,
        destinationIndex,
        draggableId: activeData.cardId,
        type: "card",
      })
    );
  };

  useEffect(() => {
    saveToStorage(TASKS_VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    function registerUndoRedoKeys(e: KeyboardEvent) {
      const activeElement = document.activeElement?.tagName;

      if (activeElement !== "INPUT" && activeElement !== "TEXTAREA") {
        if (e.ctrlKey && e.code === "KeyZ") {
          if (tasks.past.length > 0) {
            dispatch(undoTasks());
          }
        }

        if (e.ctrlKey && e.shiftKey && e.code === "KeyZ") {
          if (tasks.future.length > 0) {
            dispatch(redoTasks());
          }
        }
      }
    }

    document.addEventListener("keydown", registerUndoRedoKeys);
    return () =>
      document.removeEventListener("keydown", registerUndoRedoKeys);
  }, [dispatch, tasks.past.length, tasks.future.length]);

  return (
    <StyledTaskMain>
      <TasksHeaderBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        undatedCount={undatedTasksCount}
        onOpenUndated={() => setIsUndatedOpen(true)}
        onAddList={onListAdd}
      />

      {viewMode === "matrix" && (
        <TaskMatrixView
          taskLists={tasks.present}
          selectedDate={selectedDate}
          onToggleTaskDone={handleToggleDateDone}
          onCardClick={handleOpenCardDetail}
          onSelectForTimer={handleGridSelect}
        />
      )}

      {viewMode === "quadrant" && (
        <TaskQuadrantView
          taskLists={tasks.present}
          selectedDate={selectedDate}
          onToggleTaskDone={handleToggleDateDone}
          onCardClick={handleOpenCardDetail}
          onSelectForTimer={handleGridSelect}
        />
      )}

      {viewMode === "list" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragCancel={() => setActiveDragCardPreview(null)}
          onDragEnd={onDragEnd}
        >
          <StyledTaskContainer>
            <SortableContext
              items={tasks.present.map((task) => `list:${task._id}`)}
              strategy={verticalListSortingStrategy}
            >
              <StyledTaskWrapper>
                <TaskInnerList
                  tasks={tasks.present}
                  onCardContextMenu={(listId, cardId) =>
                    handleGridSelect(listId, cardId)
                  }
                />

                <StyledTaskStickySection>
                  <TaskFormButton forList onSubmit={onListAdd} />
                </StyledTaskStickySection>
              </StyledTaskWrapper>
            </SortableContext>
          </StyledTaskContainer>
          <DragOverlay>
            {activeDragCardPreview ? (
              <TaskCardDragOverlay
                text={activeDragCardPreview.text}
                done={activeDragCardPreview.done}
                width={activeDragCardPreview.width}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <UndatedTasksDrawer
        isOpen={isUndatedOpen}
        taskLists={tasks.present}
        onClose={() => setIsUndatedOpen(false)}
        onToggleUndatedDone={handleToggleUndatedDone}
        onCardClick={handleOpenCardDetail}
        onSelectForTimer={handleGridSelect}
      />

      {activeDetailCard && (
        <TaskDetails
          listId={activeDetailCard.listId}
          cardId={activeDetailCard.cardId}
          onExit={() => setActiveDetailCard(null)}
        />
      )}
    </StyledTaskMain>
  );
}
