import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  getCurrentUser,
} from "./client";
import type {
  CloudUserSettings,
  CloudTaskList,
  CloudTask,
  CloudFocusSession,
  SyncStatus,
  SyncQueueItem,
} from "./types";
import type {
  TaskList,
  Task,
  DayColor,
  TaskSchedule,
} from "store/tasks/types";
import type { SettingTypes } from "store/settings/types";
import type {
  StatisticsSessionRecord,
  StatisticsBucket,
  StatisticsTimerType,
} from "store/statistics/types";
import store, {
  setTaskLists,
  updateSettings,
  addStatisticsSession,
} from "store";
import { getFromStorage, saveToStorage } from "utils";

const SYNC_QUEUE_STORAGE_KEY = "pomodoroz_sync_queue";
const LAST_SYNC_TIME_KEY = "pomodoroz_last_sync_timestamp";

type SyncListener = (status: SyncStatus, errorMsg?: string) => void;

class SyncEngine {
  private status: SyncStatus = "idle";
  private listeners: Set<SyncListener> = new Set();
  private queue: SyncQueueItem[] = [];
  private realtimeChannel: RealtimeChannel | null = null;
  private isProcessingQueue = false;
  private isApplyingRemote = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadQueue();
    if (typeof window !== "undefined") {
      window.addEventListener("online", () =>
        this.handleNetworkChange(true)
      );
      window.addEventListener("offline", () =>
        this.handleNetworkChange(false)
      );
    }
  }

  public isApplyingRemoteChanges(): boolean {
    return this.isApplyingRemote;
  }

  public getStatus(): SyncStatus {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return "offline";
    }
    return this.status;
  }

  public subscribeStatus(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: SyncStatus, errorMsg?: string) {
    this.status = status;
    for (const listener of this.listeners) {
      listener(this.getStatus(), errorMsg);
    }
  }

  private loadQueue() {
    try {
      const saved = getFromStorage<SyncQueueItem[]>(
        SYNC_QUEUE_STORAGE_KEY
      );
      if (Array.isArray(saved)) {
        this.queue = saved;
      }
    } catch {
      this.queue = [];
    }
  }

  private persistQueue() {
    try {
      saveToStorage(SYNC_QUEUE_STORAGE_KEY, this.queue);
    } catch (e) {
      console.error("Failed to persist sync queue", e);
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    if (!isOnline) {
      this.setStatus("offline");
    } else {
      this.setStatus("idle");
      this.processQueue();
      this.pullChanges();
    }
  }

  /**
   * 初始化 Realtime 订阅与定时同步（5 秒内响应远端变更）
   */
  public async initRealtime() {
    if (!isSupabaseConfigured()) return;
    const client = getSupabaseClient();
    if (!client) return;

    const user = await getCurrentUser();
    if (!user) return;

    if (this.realtimeChannel) {
      client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    try {
      this.realtimeChannel = client
        .channel(`user-sync-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // 监听到远端修改，在短防抖后静默拉取
            this.pullChanges(true);
          }
        )
        .subscribe();
    } catch (e) {
      console.warn(
        "Realtime subscription error, fallback to polling",
        e
      );
    }

    // 设置 5 秒轻量同步兜底（符合 A18 5 秒内看到已提交变化的指标）
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      if (navigator.onLine && this.status !== "syncing") {
        this.pullChanges(true);
      }
    }, 5000);
  }

  public stopRealtime() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    const client = getSupabaseClient();
    if (client && this.realtimeChannel) {
      client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  /**
   * 将任务变动加入同步队列或直接推送
   */
  public async enqueueTasksSync(taskLists: TaskList[]) {
    this.queueItem({
      id: `tasks-${Date.now()}`,
      type: "tasks",
      payload: taskLists,
      timestamp: Date.now(),
      retryCount: 0,
    });
    return this.processQueue();
  }

  /**
   * 将设置变动加入同步队列或直接推送
   */
  public async enqueueSettingsSync(settings: Partial<SettingTypes>) {
    this.queueItem({
      id: `settings-${Date.now()}`,
      type: "settings",
      payload: settings,
      timestamp: Date.now(),
      retryCount: 0,
    });
    return this.processQueue();
  }

  /**
   * 将逻辑专注记录加入同步队列（以稳定 sessionId 幂等保存）
   */
  public async enqueueSessionSync(session: StatisticsSessionRecord) {
    this.queueItem({
      id: `session-${session.id}`,
      type: "session",
      payload: session,
      timestamp: Date.now(),
      retryCount: 0,
    });
    return this.processQueue();
  }

  private queueItem(item: SyncQueueItem) {
    // 替换同类型的旧队列项（session 需按 session.id 幂等去重）
    if (item.type === "tasks" || item.type === "settings") {
      this.queue = this.queue.filter((q) => q.type !== item.type);
    } else if (item.type === "session") {
      this.queue = this.queue.filter((q) => q.id !== item.id);
    }
    this.queue.push(item);
    this.persistQueue();
  }

  /**
   * 处理离线与待同步队列
   */
  public async processQueue() {
    if (this.isProcessingQueue) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setStatus("offline");
      return;
    }

    const client = getSupabaseClient();
    if (!client) return;

    const user = await getCurrentUser();
    if (!user) return;

    if (this.queue.length === 0) return;

    this.isProcessingQueue = true;
    this.setStatus("syncing");

    try {
      const items = [...this.queue];
      for (const item of items) {
        if (item.type === "tasks") {
          await this.pushTasksToCloud(
            user.id,
            item.payload as TaskList[]
          );
        } else if (item.type === "settings") {
          await this.pushSettingsToCloud(
            user.id,
            item.payload as Partial<SettingTypes>
          );
        } else if (item.type === "session") {
          await this.pushSessionToCloud(
            user.id,
            item.payload as StatisticsSessionRecord
          );
        }
        // 处理成功，从队列移除
        this.queue = this.queue.filter((q) => q.id !== item.id);
        this.persistQueue();
      }
      this.setStatus("idle");
    } catch (e: unknown) {
      console.error("Queue process error", e);
      const msg = e instanceof Error ? e.message : "Sync failed";
      this.setStatus("error", msg);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 推送任务到 Supabase（RLS 保护，绑定 user_id）
   */
  private async pushTasksToCloud(
    userId: string,
    taskLists: TaskList[]
  ) {
    const client = getSupabaseClient()!;

    // 1. 整理列表数据
    const cloudLists: CloudTaskList[] = taskLists.map(
      (list, index) => ({
        user_id: userId,
        id: list._id,
        title: list.title,
        priority: Boolean(list.priority),
        position: index,
        day_color: list.dayColor || null,
        day_color_date: list.dayColorDate || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    );

    if (cloudLists.length > 0) {
      const { error: listErr } = await client
        .from("task_lists")
        .upsert(cloudLists, { onConflict: "user_id,id" });
      if (listErr) throw listErr;
    }

    // 2. 整理卡片数据
    const cloudTasks: CloudTask[] = [];
    for (const list of taskLists) {
      list.cards.forEach((card, pos) => {
        cloudTasks.push({
          user_id: userId,
          id: card._id,
          list_id: list._id,
          text: card.text,
          description: card.description || "",
          done: Boolean(card.done),
          prioritized: Boolean(card.prioritized),
          position: pos,
          importance: card.importance ?? 3,
          urgency: card.urgency ?? 3,
          schedule: card.schedule || null,
          completed_dates: card.completedDates || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
    }

    if (cloudTasks.length > 0) {
      const { error: taskErr } = await client
        .from("tasks")
        .upsert(cloudTasks, { onConflict: "user_id,id" });
      if (taskErr) throw taskErr;
    }
  }

  /**
   * 推送设置到 Supabase
   */
  private async pushSettingsToCloud(
    userId: string,
    settings: Partial<SettingTypes>
  ) {
    const client = getSupabaseClient()!;
    const { error } = await client.from("user_settings").upsert(
      {
        user_id: userId,
        settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;
  }

  /**
   * 推送逻辑专注记录到 Supabase（幂等写入，防重复计数）
   */
  private async pushSessionToCloud(
    userId: string,
    session: StatisticsSessionRecord
  ) {
    const client = getSupabaseClient()!;
    const cloudSession: CloudFocusSession = {
      user_id: userId,
      session_id: session.id,
      bucket: session.bucket,
      timer_type: String(session.timerType),
      duration_seconds: session.durationSeconds,
      started_at: session.startedAt,
      completed_at: session.completedAt,
      date: session.date,
      round: session.round,
      total_rounds: session.totalRounds,
      cycle_completed: session.cycleCompleted,
      task_id: session.taskId,
      task_text: session.taskText,
      list_id: session.listId,
      list_title: session.listTitle,
      created_at: new Date(
        session.completedAt || Date.now()
      ).toISOString(),
    };

    const { error } = await client
      .from("focus_sessions")
      .upsert(cloudSession, { onConflict: "user_id,session_id" });
    if (error) throw error;
  }

  /**
   * 从云端拉取变更并进行安全合并（双向合并，保留并发修改与打卡日期）
   */
  public async pullChanges(silent = false) {
    if (!isSupabaseConfigured()) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setStatus("offline");
      return;
    }

    const client = getSupabaseClient();
    if (!client) return;

    const user = await getCurrentUser();
    if (!user) return;

    if (!silent) this.setStatus("syncing");

    try {
      this.isApplyingRemote = true;
      // 1. 获取云端列表与任务
      const [listsRes, tasksRes, settingsRes, sessionsRes] =
        await Promise.all([
          client
            .from("task_lists")
            .select("*")
            .order("position", { ascending: true }),
          client
            .from("tasks")
            .select("*")
            .order("position", { ascending: true }),
          client.from("user_settings").select("*").maybeSingle(),
          client
            .from("focus_sessions")
            .select("*")
            .order("completed_at", { ascending: false }),
        ]);

      if (listsRes.error) throw listsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      const remoteLists = listsRes.data || [];
      const remoteTasks = tasksRes.data || [];

      // 若云端有任务数据，进行字段级安全合并
      if (remoteLists.length > 0) {
        const localLists = store.getState().tasks.present;
        const mergedLists = this.mergeTaskData(
          localLists,
          remoteLists,
          remoteTasks
        );
        store.dispatch(setTaskLists(mergedLists));
      }

      // 2. 合并设置
      if (settingsRes.data && settingsRes.data.settings) {
        store.dispatch(updateSettings(settingsRes.data.settings));
      }

      // 3. 幂等合并专注会话
      if (sessionsRes.data && sessionsRes.data.length > 0) {
        for (const s of sessionsRes.data) {
          const sessionRecord: StatisticsSessionRecord = {
            id: s.session_id,
            bucket: s.bucket as StatisticsBucket,
            timerType: s.timer_type as StatisticsTimerType,
            durationSeconds: s.duration_seconds,
            startedAt: Number(s.started_at),
            completedAt: Number(s.completed_at),
            date: s.date,
            round: s.round,
            totalRounds: s.total_rounds,
            cycleCompleted: s.cycle_completed,
            taskId: s.task_id,
            taskText: s.task_text,
            listId: s.list_id,
            listTitle: s.list_title,
          };
          // addStatisticsSession 内部已有基于 id 的幂等去重判断
          store.dispatch(addStatisticsSession(sessionRecord));
        }
      }

      saveToStorage(LAST_SYNC_TIME_KEY, Date.now());
      this.setStatus("idle");
    } catch (e: unknown) {
      console.error("Pull changes error", e);
      if (!silent) {
        const msg =
          e instanceof Error
            ? e.message
            : "Failed to pull cloud changes";
        this.setStatus("error", msg);
      }
    } finally {
      this.isApplyingRemote = false;
    }
  }

  /**
   * 细粒度任务合并：
   * 1. 保留两端列表；
   * 2. 卡片 completedDates 取并集（防止两端独立打卡被冲掉）；
   * 3. 重要度、紧急度与排期若两端有差异，保留已设定的更精确版本；
   */
  public mergeTaskData(
    localLists: TaskList[],
    remoteLists: CloudTaskList[],
    remoteTasks: CloudTask[]
  ): TaskList[] {
    const listMap = new Map<string, TaskList>();

    // 先放入本地列表
    for (const l of localLists) {
      listMap.set(l._id, { ...l, cards: [...l.cards] });
    }

    // 合并云端列表
    for (const rl of remoteLists) {
      if (!listMap.has(rl.id)) {
        listMap.set(rl.id, {
          _id: rl.id,
          title: rl.title,
          cards: [],
          priority: rl.priority,
          dayColor: (rl.day_color as DayColor) || null,
          dayColorDate: rl.day_color_date || null,
        });
      } else {
        const existing = listMap.get(rl.id)!;
        existing.title = rl.title || existing.title;
        existing.priority = rl.priority ?? existing.priority;
      }
    }

    // 按云端任务归类并合并
    const remoteTaskMap = new Map<string, CloudTask>();
    for (const rt of remoteTasks) {
      remoteTaskMap.set(rt.id, rt);
    }

    // 遍历所有列表，合并卡片
    for (const [, list] of listMap) {
      const cardMap = new Map<string, Task>();
      for (const c of list.cards) {
        cardMap.set(c._id, { ...c });
      }

      // 提取属于当前列表的云端卡片
      const belongRemoteTasks = remoteTasks.filter(
        (t) => t.list_id === list._id
      );
      for (const rt of belongRemoteTasks) {
        if (!cardMap.has(rt.id)) {
          // 云端新卡片
          cardMap.set(rt.id, {
            _id: rt.id,
            text: rt.text,
            description: rt.description || "",
            done: rt.done,
            prioritized: rt.prioritized,
            importance: rt.importance ?? 3,
            urgency: rt.urgency ?? 3,
            schedule: (rt.schedule as TaskSchedule | null) || null,
            completedDates: rt.completed_dates || {},
          });
        } else {
          // 两端均存在同一卡片：合并 completedDates 并保留最新内容
          const existingCard = cardMap.get(rt.id)!;
          const mergedCompletedDates = {
            ...(existingCard.completedDates || {}),
            ...(rt.completed_dates || {}),
          };

          cardMap.set(rt.id, {
            ...existingCard,
            text: rt.text || existingCard.text,
            description: rt.description || existingCard.description,
            importance: rt.importance ?? existingCard.importance ?? 3,
            urgency: rt.urgency ?? existingCard.urgency ?? 3,
            schedule:
              rt.schedule !== undefined
                ? (rt.schedule as TaskSchedule | null)
                : existingCard.schedule,
            completedDates: mergedCompletedDates,
            done: existingCard.done || rt.done,
          });
        }
      }

      list.cards = Array.from(cardMap.values());
    }

    return Array.from(listMap.values());
  }

  /**
   * 将当前本地已有全部数据一次性上传并合并到当前登录的云端账号
   */
  public async migrateLocalDataToCloud(): Promise<{
    listCount: number;
    taskCount: number;
    sessionCount: number;
  }> {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase is not configured");

    const user = await getCurrentUser();
    if (!user) throw new Error("Not logged in");

    this.setStatus("syncing");

    const taskLists = store.getState().tasks.present;
    const settings = store.getState().settings;
    const sessions = store.getState().statistics.sessions;

    // 1. 上传设置
    await this.pushSettingsToCloud(user.id, settings);

    // 2. 上传任务
    await this.pushTasksToCloud(user.id, taskLists);

    // 3. 上传统计记录（幂等保存）
    for (const session of sessions) {
      await this.pushSessionToCloud(user.id, session);
    }

    this.setStatus("idle");

    const cardCount = taskLists.reduce(
      (acc, l) => acc + (l.cards?.length || 0),
      0
    );
    return {
      listCount: taskLists.length,
      taskCount: cardCount,
      sessionCount: sessions.length,
    };
  }
}

export const syncEngine = new SyncEngine();
