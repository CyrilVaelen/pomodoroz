import type { PayloadAction, UnknownAction } from "@reduxjs/toolkit";
import { createAction, createSlice } from "@reduxjs/toolkit";
import { getFromStorage } from "../../utils/storage";
import type { Task, TaskList, ListPayload, DayColor } from "./types";
import {
  addTaskToList,
  createTaskList,
  removeTaskFromList,
  editTaskList,
} from "./utils/tasklist";
import { createTask, editTask } from "./utils/task";
export * from "./types";

const storedState = getFromStorage<{ tasks?: TaskList[] }>("state");
const tasks = storedState?.tasks || [];

const getTodayDateKey = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const normalizeDayColor = (color: unknown): DayColor => {
  if (color === "green" || color === "red") {
    return color;
  }

  // Legacy migration: old "orange" now maps to "green".
  if (color === "orange") {
    return "green";
  }

  return null;
};

const initialState: TaskList[] = tasks.map((list) => ({
  ...list,
  dayColor: normalizeDayColor(list.dayColor),
  dayColorDate: list.dayColorDate ?? null,
  cards: list.cards.map((card) => ({
    ...card,
    prioritized: Boolean(card.prioritized),
    dayColor: normalizeDayColor(card.dayColor),
    dayColorDate: card.dayColorDate ?? null,
    importance:
      typeof card.importance === "number" &&
      card.importance >= 1 &&
      card.importance <= 5
        ? Math.round(card.importance)
        : 3,
    urgency:
      typeof card.urgency === "number" &&
      card.urgency >= 1 &&
      card.urgency <= 5
        ? Math.round(card.urgency)
        : 3,
    schedule: card.schedule ?? null,
    completedDates: card.completedDates ?? {},
  })),
}));

const ensureSinglePriority = (lists: TaskList[]): TaskList[] => {
  if (!lists.length) {
    return lists;
  }

  const firstPriorityIndex = lists.findIndex((list) => list.priority);
  const priorityIndex =
    firstPriorityIndex >= 0 ? firstPriorityIndex : 0;

  return lists.map((list, index) => ({
    ...list,
    priority: index === priorityIndex,
  }));
};

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    addTaskList: (state, action: ListPayload<"title">) => {
      const priority = state.length === 0 ? true : false;

      const title = action.payload.trim().toUpperCase();

      const taskList = createTaskList({ title, priority });

      return [...state, taskList];
    },

    removeTaskList: (state, action: ListPayload<"_id">) => {
      return state.filter((list) => list._id !== action.payload);
    },

    setTaskListPriority: (state, action: ListPayload<"_id">) => {
      const newState = state.map((list) => {
        if (list._id !== action.payload) {
          return editTaskList(list, { priority: false });
        }

        return editTaskList(list, { priority: true });
      });

      return newState;
    },

    editTaskTitle: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        listTitle: TaskList["title"];
      }>
    ) => {
      return state.map((list) => {
        if (list._id === action.payload.listId) {
          const title = action.payload.listTitle.trim().toUpperCase();

          return editTaskList(list, { title });
        }
        return list;
      });
    },

    addTaskCard: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        cardText: Task["text"];
      }>
    ) => {
      const text = action.payload.cardText.trim().capitalize();

      const newTask = createTask({ text });

      const newState = state.map((list) => {
        if (list._id === action.payload.listId) {
          return addTaskToList(list, newTask);
        }
        return list;
      });

      return newState;
    },

    editTaskCardText: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        cardId: Task["_id"];
        cardText: Task["text"];
      }>
    ) => {
      const newState = state.map((list) => {
        if (list._id !== action.payload.listId) return list;

        const newCards = list.cards.map((card) => {
          if (card._id !== action.payload.cardId) return card;

          const text = action.payload.cardText.trim().capitalize();

          return editTask(card, { text });
        });

        return { ...list, cards: newCards };
      });

      return newState;
    },

    editTaskCard: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        cardId: Task["_id"];
        description?: Task["description"];
      }>
    ) => {
      const newState = state.map((list) => {
        if (list._id !== action.payload.listId) return list;

        const newCards = list.cards.map((card) => {
          if (card._id !== action.payload.cardId) return card;

          const description =
            action.payload.description?.capitalize() || "";

          return editTask(card, { description });
        });

        return { ...list, cards: newCards };
      });

      return newState;
    },

    removeTaskCard: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        cardId: Task["_id"];
      }>
    ) => {
      const newState = state.map((list) => {
        if (list._id !== action.payload.listId) return list;

        return removeTaskFromList(list, action.payload.cardId);
      });

      return newState;
    },

    setTaskCardDone: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        cardId?: Task["_id"];
      }>
    ) => {
      if (!action.payload.cardId) return state;

      const newState = state.map((list) => {
        if (list._id !== action.payload.listId) return list;

        const newCards = list.cards.map((card) => {
          if (card._id !== action.payload.cardId) return card;

          return editTask(card, { done: true });
        });

        return { ...list, cards: newCards };
      });

      return newState;
    },

    setTaskCardNotDone: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        cardId?: Task["_id"];
      }>
    ) => {
      if (!action.payload.cardId) return state;

      const newState = state.map((list) => {
        if (list._id !== action.payload.listId) return list;

        const newCards = list.cards.map((card) => {
          if (card._id !== action.payload.cardId) return card;

          return editTask(card, { done: false });
        });

        return { ...list, cards: newCards };
      });

      return newState;
    },

    setTaskCardPriority: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        cardId: Task["_id"];
        prioritized: Task["prioritized"];
      }>
    ) => {
      return state.map((list) => {
        if (list._id !== action.payload.listId) return list;

        const newCards = list.cards.map((card) => {
          if (card._id !== action.payload.cardId) return card;

          return editTask(card, {
            prioritized: action.payload.prioritized,
          });
        });

        return { ...list, cards: newCards };
      });
    },

    reorderTaskListByPriority: (
      state,
      action: PayloadAction<{ listId: TaskList["_id"] }>
    ) => {
      const targetList = state.find(
        (list) => list._id === action.payload.listId
      );

      if (!targetList) return state;

      const prioritizedCards = targetList.cards.filter(
        (card) => card.prioritized
      );

      if (!prioritizedCards.length) return state;

      const regularCards = targetList.cards.filter(
        (card) => !card.prioritized
      );
      const reorderedCards = [...prioritizedCards, ...regularCards];
      const hasOrderChanged = reorderedCards.some(
        (card, index) => card._id !== targetList.cards[index]?._id
      );

      if (!hasOrderChanged) return state;

      return state.map((list) => {
        if (list._id !== action.payload.listId) return list;

        return {
          ...list,
          cards: reorderedCards,
        };
      });
    },

    skipTaskCard: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        cardId?: Task["_id"];
      }>
    ) => {
      const newState = state.map((list) => {
        if (list._id !== action.payload.listId) return list;

        const doneCards = list.cards.filter((card) => card.done);
        const notDoneCards = list.cards.filter((card) => !card.done);

        const cardToSkip = action.payload.cardId
          ? notDoneCards.find(
              (card) => card._id === action.payload.cardId
            ) || null
          : (notDoneCards.at(0) ?? null);

        if (!cardToSkip) return list;

        const newNotDoneCards = notDoneCards.filter(
          (card) => card._id !== cardToSkip._id
        );

        return {
          ...list,
          cards: [...newNotDoneCards, cardToSkip, ...doneCards],
        };
      });

      return newState;
    },

    dragList: (
      state,
      action: PayloadAction<{
        sourceId: TaskList["_id"];
        destinationId: TaskList["_id"];
        sourceIndex: number;
        destinationIndex: number;
        draggableId: string;
        type: string;
      }>
    ) => {
      const {
        sourceId,
        destinationId,
        sourceIndex,
        destinationIndex,
        type,
      } = action.payload;

      // dragging list around
      if (type === "list") {
        const list = state.splice(sourceIndex, 1);

        if (list) {
          state.splice(destinationIndex, 0, ...list);
        }

        return;
      }

      // in then same list
      if (sourceId === destinationId) {
        const list = state.find((list) => sourceId === list._id);
        const card = list?.cards.splice(sourceIndex, 1);

        if (card) {
          list?.cards.splice(destinationIndex, 0, ...card);
        }
      } else {
        // find the list where drag happened
        const listStart = state.find((list) => sourceId === list._id);

        // pull out the card from this list
        const card = listStart?.cards.splice(sourceIndex, 1);

        // find the list where drag ended
        const listEnd = state.find(
          (list) => destinationId === list._id
        );

        // put the card in the new list
        if (card) {
          listEnd?.cards.splice(destinationIndex, 0, ...card);
        }
      }

      return;
    },

    setTaskDayColor: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        cardId: Task["_id"];
        color: DayColor;
      }>
    ) => {
      const today = getTodayDateKey();
      return state.map((list) => {
        if (list._id !== action.payload.listId) return list;

        const cards = list.cards.map((card) => {
          if (card._id !== action.payload.cardId) return card;

          return {
            ...card,
            dayColor: action.payload.color,
            dayColorDate: action.payload.color ? today : null,
          };
        });

        return {
          ...list,
          cards,
        };
      });
    },

    resetAllDayColors: (state) => {
      return state.map((list) => ({
        ...list,
        dayColor: null,
        dayColorDate: null,
        cards: list.cards.map((card) => ({
          ...card,
          dayColor: null,
          dayColorDate: null,
        })),
      }));
    },

    replaceTaskLists: (_state, action: PayloadAction<TaskList[]>) => {
      return ensureSinglePriority(action.payload);
    },

    appendTaskLists: (state, action: PayloadAction<TaskList[]>) => {
      const incoming = action.payload.map((list) => ({
        ...list,
        priority: false,
      }));
      const merged = [...state, ...incoming];

      return ensureSinglePriority(merged);
    },

    setTaskRating: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        cardId: Task["_id"];
        importance: number;
        urgency: number;
      }>
    ) => {
      const clampedImp = Math.max(
        1,
        Math.min(5, Math.round(action.payload.importance))
      );
      const clampedUrg = Math.max(
        1,
        Math.min(5, Math.round(action.payload.urgency))
      );
      return state.map((list) => {
        if (list._id !== action.payload.listId) return list;
        const newCards = list.cards.map((card) => {
          if (card._id !== action.payload.cardId) return card;
          return editTask(card, {
            importance: clampedImp,
            urgency: clampedUrg,
          });
        });
        return { ...list, cards: newCards };
      });
    },

    setTaskSchedule: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        cardId: Task["_id"];
        schedule: Task["schedule"];
      }>
    ) => {
      return state.map((list) => {
        if (list._id !== action.payload.listId) return list;
        const newCards = list.cards.map((card) => {
          if (card._id !== action.payload.cardId) return card;
          return editTask(card, {
            schedule: action.payload.schedule,
          });
        });
        return { ...list, cards: newCards };
      });
    },

    toggleTaskDateCompletion: (
      state,
      action: PayloadAction<{
        listId: TaskList["_id"];
        cardId: Task["_id"];
        dateKey: string;
        done: boolean;
      }>
    ) => {
      const { listId, cardId, dateKey, done } = action.payload;
      return state.map((list) => {
        if (list._id !== listId) return list;
        const newCards = list.cards.map((card) => {
          if (card._id !== cardId) return card;
          const currentCompletedDates = {
            ...(card.completedDates || {}),
          };
          if (done) {
            currentCompletedDates[dateKey] = true;
          } else {
            delete currentCompletedDates[dateKey];
          }
          return editTask(card, {
            completedDates: currentCompletedDates,
          });
        });
        return { ...list, cards: newCards };
      });
    },
  },
});

export const {
  addTaskCard,
  addTaskList,
  dragList,
  editTaskCard,
  editTaskCardText,
  editTaskTitle,
  removeTaskCard,
  removeTaskList,
  reorderTaskListByPriority,
  replaceTaskLists,
  resetAllDayColors,
  setTaskDayColor,
  setTaskCardDone,
  setTaskCardNotDone,
  setTaskCardPriority,
  setTaskListPriority,
  setTaskRating,
  setTaskSchedule,
  toggleTaskDateCompletion,
  skipTaskCard,
  appendTaskLists,
} = tasksSlice.actions;

export const setTaskLists = replaceTaskLists;

export type TasksState = {
  past: TaskList[][];
  present: TaskList[];
  future: TaskList[][];
};

export const undoTasks = createAction("tasks/undo");
export const redoTasks = createAction("tasks/redo");
export const resetAllDayColorsForNewDay = createAction(
  "tasks/resetAllDayColorsForNewDay"
);

const trackedTaskActionTypes: ReadonlySet<string> = new Set(
  Object.values(tasksSlice.actions).map((action) => action.type)
);

const initialUndoableState: TasksState = {
  past: [],
  present: initialState,
  future: [],
};

const tasksHistoryReducer = (
  state: TasksState = initialUndoableState,
  action: UnknownAction
): TasksState => {
  if (undoTasks.match(action)) {
    if (state.past.length === 0) {
      return state;
    }

    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
    };
  }

  if (redoTasks.match(action)) {
    if (state.future.length === 0) {
      return state;
    }

    const [next, ...remainingFuture] = state.future;
    return {
      past: [...state.past, state.present],
      present: next,
      future: remainingFuture,
    };
  }

  if (resetAllDayColorsForNewDay.match(action)) {
    const nextPresent = tasksSlice.reducer(
      state.present,
      resetAllDayColors()
    );

    if (nextPresent === state.present) {
      return state;
    }

    return {
      ...state,
      present: nextPresent,
    };
  }

  if (!trackedTaskActionTypes.has(action.type)) {
    return state;
  }

  const nextPresent = tasksSlice.reducer(state.present, action);

  if (nextPresent === state.present) {
    return state;
  }

  return {
    past: [...state.past, state.present],
    present: nextPresent,
    future: [],
  };
};

export default tasksHistoryReducer;
