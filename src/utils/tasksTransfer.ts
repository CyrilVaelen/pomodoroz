import { v4 as uuid } from "uuid";
import type { TaskList, TaskSchedule } from "store/tasks/types";

export const TASKS_TRANSFER_VERSION = 3;

type TransferTaskCard = {
  text: string;
  description: string;
  done: boolean;
  prioritized: boolean;
  importance?: number;
  urgency?: number;
  schedule?: TaskSchedule | null;
  completedDates?: Record<string, boolean>;
};

type TransferTaskList = {
  title: string;
  priority: boolean;
  cards: TransferTaskCard[];
};

export type TasksTransferFile = {
  version: typeof TASKS_TRANSFER_VERSION;
  lists: TransferTaskList[];
};

export type TasksTransferParseResult =
  | {
      ok: true;
      data: {
        version: number;
        lists: TaskList[];
        listCount: number;
        cardCount: number;
      };
    }
  | {
      ok: false;
      reason: "invalid-json" | "invalid-schema";
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizePriority = (lists: TaskList[]): TaskList[] => {
  if (!lists.length) {
    return lists;
  }

  const firstPrioritizedIndex = lists.findIndex(
    (list) => list.priority
  );
  const targetPriorityIndex =
    firstPrioritizedIndex >= 0 ? firstPrioritizedIndex : 0;

  return lists.map((list, index) => ({
    ...list,
    priority: index === targetPriorityIndex,
  }));
};

const parseTransferSchedule = (val: unknown): TaskSchedule | null => {
  if (!isRecord(val) || typeof val.type !== "string") {
    return null;
  }

  if (val.type === "weekly") {
    if (
      !Array.isArray(val.selectedWeeks) ||
      !Array.isArray(val.daysOfWeek)
    ) {
      return null;
    }
    const selectedWeeks = val.selectedWeeks.filter(
      (w): w is string => typeof w === "string" && Boolean(w.trim())
    );
    const daysOfWeek = val.daysOfWeek
      .filter(
        (d): d is number => typeof d === "number" && d >= 1 && d <= 7
      )
      .map((d) => Math.round(d));
    return {
      type: "weekly",
      selectedWeeks: Array.from(new Set(selectedWeeks)),
      daysOfWeek: Array.from(new Set(daysOfWeek)).sort((a, b) => a - b),
    };
  }

  if (val.type === "monthly") {
    if (!Array.isArray(val.selectedDates)) {
      return null;
    }
    const selectedDates = val.selectedDates.filter(
      (d): d is string => typeof d === "string" && Boolean(d.trim())
    );
    return {
      type: "monthly",
      selectedDates: Array.from(new Set(selectedDates)).sort(),
    };
  }

  if (val.type === "daily") {
    if (typeof val.startDate !== "string" || !val.startDate.trim()) {
      return null;
    }
    const daysCount =
      typeof val.daysCount === "number" &&
      Number.isFinite(val.daysCount)
        ? Math.max(1, Math.round(val.daysCount))
        : 1;
    return {
      type: "daily",
      startDate: val.startDate.trim(),
      daysCount,
    };
  }

  return null;
};

const parseTransferCompletedDates = (
  val: unknown
): Record<string, boolean> => {
  if (!isRecord(val)) {
    return {};
  }
  const result: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(val)) {
    if (typeof v === "boolean") {
      result[k] = v;
    }
  }
  return result;
};

const parseTransferCard = (value: unknown) => {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.text !== "string") {
    return null;
  }

  const text = value.text.trim();
  if (!text) {
    return null;
  }

  const description =
    typeof value.description === "string" ? value.description : "";
  const done = typeof value.done === "boolean" ? value.done : false;
  const prioritized =
    typeof value.prioritized === "boolean" ? value.prioritized : false;

  const importance =
    typeof value.importance === "number" &&
    Number.isFinite(value.importance)
      ? Math.max(1, Math.min(5, Math.round(value.importance)))
      : 3;

  const urgency =
    typeof value.urgency === "number" && Number.isFinite(value.urgency)
      ? Math.max(1, Math.min(5, Math.round(value.urgency)))
      : 3;

  const schedule = parseTransferSchedule(value.schedule);
  const completedDates = parseTransferCompletedDates(
    value.completedDates
  );

  return {
    _id: uuid(),
    text,
    description,
    done,
    prioritized,
    importance,
    urgency,
    schedule,
    completedDates,
    dayColor: null,
    dayColorDate: null,
  } as TaskList["cards"][number];
};

const parseTransferList = (value: unknown) => {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.title !== "string" || !Array.isArray(value.cards)) {
    return null;
  }

  const title = value.title.trim();
  if (!title) {
    return null;
  }

  const cards = value.cards
    .map(parseTransferCard)
    .filter((card): card is TaskList["cards"][number] => card !== null);

  if (cards.length !== value.cards.length) {
    return null;
  }

  return {
    _id: uuid(),
    title,
    cards,
    priority:
      typeof value.priority === "boolean" ? value.priority : false,
    dayColor: null,
    dayColorDate: null,
  } as TaskList;
};

export const buildTasksTransferFile = (
  taskLists: TaskList[]
): TasksTransferFile => {
  return {
    version: TASKS_TRANSFER_VERSION,
    lists: taskLists.map((list) => ({
      title: list.title,
      priority: list.priority,
      cards: list.cards.map((card) => ({
        text: card.text,
        description: card.description ?? "",
        done: card.done,
        prioritized: card.prioritized,
        importance: card.importance ?? 3,
        urgency: card.urgency ?? 3,
        schedule: card.schedule ?? null,
        completedDates: card.completedDates ?? {},
      })),
    })),
  };
};

export const parseTasksTransferFile = (
  content: string
): TasksTransferParseResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.lists)) {
    return { ok: false, reason: "invalid-schema" };
  }

  const version =
    typeof parsed.version === "number" ? parsed.version : NaN;
  if (!Number.isFinite(version) || version < 1) {
    return { ok: false, reason: "invalid-schema" };
  }

  const lists = parsed.lists
    .map(parseTransferList)
    .filter((list): list is TaskList => list !== null);

  if (lists.length !== parsed.lists.length) {
    return { ok: false, reason: "invalid-schema" };
  }

  const normalizedLists = normalizePriority(lists);
  const cardCount = normalizedLists.reduce(
    (total, list) => total + list.cards.length,
    0
  );

  return {
    ok: true,
    data: {
      version,
      lists: normalizedLists,
      listCount: normalizedLists.length,
      cardCount,
    },
  };
};
