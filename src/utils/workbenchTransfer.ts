import type { SettingTypes } from "store/settings/types";
import type { Task, TaskList } from "store/tasks/types";
import type { StatisticsSessionRecord } from "store/statistics/types";
import store, {
  setTaskLists,
  updateSettings,
  addStatisticsSession,
} from "store";
import { getFromStorage, saveToStorage } from "./storage";
import { syncEngine } from "services/supabase";

export const WORKBENCH_BACKUP_VERSION = 1;
export const WORKBENCH_ROLLBACK_SNAPSHOT_KEY =
  "pomodoroz_workbench_backup_rollback_snapshot";

export interface PomodorozWorkbenchBackup {
  version: typeof WORKBENCH_BACKUP_VERSION;
  app: "pomodoroz";
  exportedAt: string;
  schemaVersion: 1;
  settings: Partial<SettingTypes>;
  tasks: TaskList[];
  statistics: {
    sessions: StatisticsSessionRecord[];
  };
}

export type WorkbenchValidationResult =
  | {
      ok: true;
      data: PomodorozWorkbenchBackup;
      summary: {
        listCount: number;
        taskCount: number;
        sessionCount: number;
        hasSettings: boolean;
      };
    }
  | {
      ok: false;
      reason:
        | "invalid-json"
        | "unsupported-version"
        | "invalid-structure"
        | "empty-data";
      message: string;
    };

export interface WorkbenchImportResult {
  success: boolean;
  importedLists: number;
  importedTasks: number;
  importedSessions: number;
  error?: string;
}

/**
 * 导出当前完整工作台数据（任务、层级、计划、主题与设置、有效专注历史）
 */
export const createWorkbenchBackup = (): PomodorozWorkbenchBackup => {
  const state = store.getState();
  return {
    version: WORKBENCH_BACKUP_VERSION,
    app: "pomodoroz",
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    settings: state.settings,
    tasks: state.tasks.present,
    statistics: {
      sessions: state.statistics.sessions || [],
    },
  };
};

/**
 * 校验并解析待导入的工作台备份内容（严防猜造非法历史，严格结构校验）
 */
export const validateWorkbenchBackup = (
  rawContent: unknown
): WorkbenchValidationResult => {
  if (typeof rawContent !== "object" || rawContent === null) {
    return {
      ok: false,
      reason: "invalid-json",
      message: "导入文件内容不是合法的 JSON 对象",
    };
  }

  const obj = rawContent as Record<string, unknown>;

  if (
    obj.app !== "pomodoroz" ||
    obj.version !== WORKBENCH_BACKUP_VERSION
  ) {
    return {
      ok: false,
      reason: "unsupported-version",
      message: "不支持的备份文件版本或非 Pomodoroz 工作台备份",
    };
  }

  if (!Array.isArray(obj.tasks)) {
    return {
      ok: false,
      reason: "invalid-structure",
      message: "备份文件缺少有效的任务列表 (tasks 字段缺失或非数组)",
    };
  }

  const stats =
    typeof obj.statistics === "object" && obj.statistics !== null
      ? (obj.statistics as Record<string, unknown>)
      : undefined;
  const sessions = stats?.sessions;
  if (sessions && !Array.isArray(sessions)) {
    return {
      ok: false,
      reason: "invalid-structure",
      message: "统计数据格式非法 (sessions 必须为数组)",
    };
  }

  // 校验任务结构的有效性
  let totalTasks = 0;
  for (const list of obj.tasks as Array<Record<string, unknown>>) {
    if (
      !list._id ||
      typeof list.title !== "string" ||
      !Array.isArray(list.cards)
    ) {
      return {
        ok: false,
        reason: "invalid-structure",
        message: "任务分组列表数据结构缺失关键字段",
      };
    }
    totalTasks += list.cards.length;
  }

  return {
    ok: true,
    data: obj as unknown as PomodorozWorkbenchBackup,
    summary: {
      listCount: (obj.tasks as unknown[]).length,
      taskCount: totalTasks,
      sessionCount: Array.isArray(sessions) ? sessions.length : 0,
      hasSettings: Boolean(
        obj.settings && typeof obj.settings === "object"
      ),
    },
  };
};

/**
 * 应用备份数据：先在本地保留回滚快照，执行幂等合并，并触发云端同步
 */
export const applyWorkbenchBackup = async (
  backup: PomodorozWorkbenchBackup
): Promise<WorkbenchImportResult> => {
  try {
    // 1. 保留原本机数据快照，以便回滚
    const currentSnapshot = createWorkbenchBackup();
    saveToStorage(WORKBENCH_ROLLBACK_SNAPSHOT_KEY, currentSnapshot);

    // 2. 合并任务数据（基于 _id 幂等去重与打卡并集）
    const localLists = store.getState().tasks.present;
    const incomingLists = backup.tasks;

    const listMap = new Map<string, TaskList>();
    for (const l of localLists) {
      listMap.set(l._id, { ...l, cards: [...l.cards] });
    }

    for (const inList of incomingLists) {
      if (!listMap.has(inList._id)) {
        listMap.set(inList._id, {
          ...inList,
          cards: [...(inList.cards || [])],
        });
      } else {
        const existingList = listMap.get(inList._id)!;
        existingList.title = inList.title || existingList.title;

        const cardMap = new Map<string, Task>();
        for (const c of existingList.cards) {
          cardMap.set(c._id, { ...c });
        }

        for (const inCard of inList.cards || []) {
          if (!cardMap.has(inCard._id)) {
            cardMap.set(inCard._id, { ...inCard });
          } else {
            const exCard = cardMap.get(inCard._id)!;
            cardMap.set(inCard._id, {
              ...exCard,
              text: inCard.text || exCard.text,
              description: inCard.description || exCard.description,
              importance: inCard.importance ?? exCard.importance ?? 3,
              urgency: inCard.urgency ?? exCard.urgency ?? 3,
              schedule: inCard.schedule || exCard.schedule,
              completedDates: {
                ...(exCard.completedDates || {}),
                ...(inCard.completedDates || {}),
              },
              done: exCard.done || inCard.done,
            });
          }
        }
        existingList.cards = Array.from(cardMap.values());
      }
    }

    const mergedLists = Array.from(listMap.values());
    store.dispatch(setTaskLists(mergedLists));

    // 3. 合并设置（非空配置项合并）
    if (backup.settings && typeof backup.settings === "object") {
      store.dispatch(updateSettings(backup.settings));
    }

    // 4. 幂等合并专注记录（按 session.id 查重）
    let importedSessionCount = 0;
    if (
      backup.statistics?.sessions &&
      Array.isArray(backup.statistics.sessions)
    ) {
      for (const session of backup.statistics.sessions) {
        if (session && session.id && session.durationSeconds > 0) {
          store.dispatch(addStatisticsSession(session));
          importedSessionCount++;
        }
      }
    }

    // 5. 若已连接云端，将新合并的数据入队并同步
    syncEngine.enqueueTasksSync(mergedLists);
    if (backup.settings)
      syncEngine.enqueueSettingsSync(backup.settings);

    const totalTasks = mergedLists.reduce(
      (acc, l) => acc + (l.cards?.length || 0),
      0
    );

    return {
      success: true,
      importedLists: mergedLists.length,
      importedTasks: totalTasks,
      importedSessions: importedSessionCount,
    };
  } catch (e: unknown) {
    console.error("Failed to apply workbench backup", e);
    const errorMsg = e instanceof Error ? e.message : "导入执行失败";
    return {
      success: false,
      importedLists: 0,
      importedTasks: 0,
      importedSessions: 0,
      error: errorMsg,
    };
  }
};

/**
 * 检查是否存在可回滚的快照
 */
export const canRollbackWorkbenchBackup = (): boolean => {
  const snapshot = getFromStorage<PomodorozWorkbenchBackup>(
    WORKBENCH_ROLLBACK_SNAPSHOT_KEY
  );
  return Boolean(snapshot && snapshot.app === "pomodoroz");
};

/**
 * 执行回滚恢复
 */
export const rollbackWorkbenchBackup = (): boolean => {
  try {
    const snapshot = getFromStorage<PomodorozWorkbenchBackup>(
      WORKBENCH_ROLLBACK_SNAPSHOT_KEY
    );
    if (!snapshot || snapshot.app !== "pomodoroz") return false;

    if (snapshot.tasks) {
      store.dispatch(setTaskLists(snapshot.tasks));
    }
    if (snapshot.settings) {
      store.dispatch(updateSettings(snapshot.settings));
    }
    return true;
  } catch {
    return false;
  }
};
