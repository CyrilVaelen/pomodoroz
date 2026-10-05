import { configureStore } from "@reduxjs/toolkit";
import debounce from "lodash.debounce";

import {
  backupCorruptStorageValue,
  readFromStorage,
  saveToStorage,
} from "utils";
import configReducer from "./config";
import settingReducer from "./settings";
import statisticsReducer from "./statistics";
import { STATISTICS_STORAGE_KEY } from "./statistics";
import taskSelectionReducer from "./taskSelection";
import timerReducer from "./timer";
import tasksReducer from "./tasks";
import updateReducer from "./update";
import { syncEngine } from "services/supabase";

export type AppStateTypes = ReturnType<typeof store.getState>;
export type AppDispatchTypes = typeof store.dispatch;

const store = configureStore({
  reducer: {
    config: configReducer,
    settings: settingReducer,
    statistics: statisticsReducer,
    taskSelection: taskSelectionReducer,
    timer: timerReducer,
    tasks: tasksReducer,
    update: updateReducer,
  },
});

const persistedRootStateResult = readFromStorage("state");
export const isFreshInstallProfile =
  persistedRootStateResult.status === "missing";
const canPersistRootState =
  persistedRootStateResult.status !== "corrupt" ||
  backupCorruptStorageValue("state") !== null;

if (canPersistRootState && persistedRootStateResult.status !== "ok") {
  saveToStorage("state", {
    config: store.getState().config,
    settings: store.getState().settings,
    taskSelection: store.getState().taskSelection,
    tasks: store.getState().tasks.present,
  });
}

const persistedStatisticsResult = readFromStorage(
  STATISTICS_STORAGE_KEY
);
const canPersistStatistics =
  persistedStatisticsResult.status !== "corrupt" ||
  backupCorruptStorageValue(STATISTICS_STORAGE_KEY) !== null;

if (canPersistStatistics && persistedStatisticsResult.status !== "ok") {
  saveToStorage(STATISTICS_STORAGE_KEY, store.getState().statistics);
}

let prevTasks = store.getState().tasks?.present;
let prevSettings = store.getState().settings;
let prevSessions = store.getState().statistics?.sessions ?? [];

const syncToCloudIfChanged = () => {
  if (syncEngine.isApplyingRemoteChanges()) {
    prevTasks = store.getState().tasks?.present;
    prevSettings = store.getState().settings;
    prevSessions = store.getState().statistics?.sessions ?? [];
    return;
  }

  const currentTasks = store.getState().tasks?.present;
  const currentSettings = store.getState().settings;
  const currentSessions = store.getState().statistics?.sessions ?? [];

  if (currentTasks && currentTasks !== prevTasks) {
    prevTasks = currentTasks;
    syncEngine.enqueueTasksSync(currentTasks);
  }

  if (currentSettings && currentSettings !== prevSettings) {
    prevSettings = currentSettings;
    syncEngine.enqueueSettingsSync(currentSettings);
  }

  if (currentSessions !== prevSessions) {
    const prevIds = new Set((prevSessions || []).map((s) => s.id));
    const newSessions = (currentSessions || []).filter(
      (s) => !prevIds.has(s.id)
    );
    for (const session of newSessions) {
      syncEngine.enqueueSessionSync(session);
    }
    prevSessions = currentSessions;
  }
};

const persistRootState = () => {
  if (canPersistRootState) {
    saveToStorage("state", {
      config: store.getState().config,
      settings: store.getState().settings,
      taskSelection: store.getState().taskSelection,
      tasks: store.getState().tasks?.present,
    });
  }

  if (canPersistStatistics && store.getState().statistics) {
    saveToStorage(STATISTICS_STORAGE_KEY, store.getState().statistics);
  }

  syncToCloudIfChanged();
};

const debouncedPersistRootState = debounce(persistRootState, 1000);

store.subscribe(() => {
  debouncedPersistRootState();
});

const flushPersistRootState = () => {
  debouncedPersistRootState.flush();
};

if (typeof window !== "undefined") {
  const flushOnPageLifecycleEvent = () => {
    flushPersistRootState();
  };

  const onVisibilityChange = () => {
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      flushOnPageLifecycleEvent();
    }
  };

  if (window.addEventListener) {
    window.addEventListener("beforeunload", flushOnPageLifecycleEvent);
    window.addEventListener("pagehide", flushOnPageLifecycleEvent);
  }

  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
}

export default store;
