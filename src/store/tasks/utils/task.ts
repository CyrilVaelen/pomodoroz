import { v4 as uuid } from "uuid";
import type { Task } from "../types";

type CreateTaskParams = Pick<Task, "text"> &
  Partial<
    Pick<Task, "description" | "importance" | "urgency" | "schedule">
  >;
type EditableTaskParams = Partial<Omit<Task, "_id">>;

export const createTask = ({
  text,
  description = "",
  importance = 3,
  urgency = 3,
  schedule = null,
}: CreateTaskParams): Task => {
  return {
    _id: uuid(),
    text,
    description,
    done: false,
    prioritized: false,
    dayColor: null,
    dayColorDate: null,
    importance,
    urgency,
    schedule,
    completedDates: {},
  };
};

export const editTask = (
  task: Task,
  changedFields: EditableTaskParams
): Task => {
  return { ...task, ...changedFields };
};
