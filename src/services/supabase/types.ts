import type { SettingTypes } from "store/settings/types";
import type { TaskList } from "store/tasks/types";
import type { StatisticsSessionRecord } from "store/statistics/types";

export interface CloudUserSettings {
  user_id: string;
  settings: Partial<SettingTypes>;
  updated_at: string;
}

export interface CloudTaskList {
  user_id: string;
  id: string;
  title: string;
  priority: boolean;
  position: number;
  day_color: string | null;
  day_color_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudTask {
  user_id: string;
  id: string;
  list_id: string;
  text: string;
  description: string;
  done: boolean;
  prioritized: boolean;
  position: number;
  importance: number;
  urgency: number;
  schedule: unknown | null;
  completed_dates: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface CloudFocusSession {
  user_id: string;
  session_id: string;
  bucket: string;
  timer_type: string;
  duration_seconds: number;
  started_at: number;
  completed_at: number;
  date: string;
  round: number | null;
  total_rounds: number | null;
  cycle_completed: boolean;
  task_id: string | null;
  task_text: string | null;
  list_id: string | null;
  list_title: string | null;
  created_at: string;
}

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export interface SyncQueueItem {
  id: string;
  type: "tasks" | "settings" | "session";
  payload: unknown;
  timestamp: number;
  retryCount: number;
}
