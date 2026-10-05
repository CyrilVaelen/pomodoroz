import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import { getFromStorage } from "../../utils";
import type { StatisticsSessionRecord, StatisticsState } from "./types";

export const STATISTICS_STORAGE_KEY = "statistics";

const getStatisticsStateFromStorage = ():
  StatisticsState | undefined => {
  const dedicatedState = getFromStorage<StatisticsState>(
    STATISTICS_STORAGE_KEY
  );

  if (Array.isArray(dedicatedState?.sessions)) {
    return dedicatedState;
  }

  const legacyState = getFromStorage<{
    statistics?: StatisticsState;
  }>("state");

  if (Array.isArray(legacyState?.statistics?.sessions)) {
    return legacyState.statistics;
  }

  return undefined;
};

const isMergeableSession = (
  current: StatisticsSessionRecord,
  next: StatisticsSessionRecord
): boolean => {
  if (current.cycleCompleted && next.cycleCompleted) {
    return false;
  }

  return (
    current.bucket === next.bucket &&
    current.timerType === next.timerType &&
    current.date === next.date &&
    current.round === next.round &&
    current.totalRounds === next.totalRounds &&
    current.listId === next.listId &&
    current.listTitle === next.listTitle &&
    current.taskId === next.taskId &&
    current.taskText === next.taskText
  );
};

const storedState = getStatisticsStateFromStorage();

const initialState: StatisticsState = {
  sessions: Array.isArray(storedState?.sessions)
    ? storedState.sessions
    : [],
};

const statisticsSlice = createSlice({
  name: "statistics",
  initialState,
  reducers: {
    addStatisticsSession(
      state,
      action: PayloadAction<StatisticsSessionRecord>
    ) {
      if (action.payload.durationSeconds <= 0) {
        return;
      }

      const existingIndex = state.sessions.findIndex(
        (session) => session.id === action.payload.id
      );

      if (existingIndex >= 0) {
        state.sessions[existingIndex] = action.payload;
        return;
      }

      state.sessions.push(action.payload);
    },

    setStatisticsSessions(
      state,
      action: PayloadAction<StatisticsState["sessions"]>
    ) {
      state.sessions = action.payload;
    },

    clearStatistics(state) {
      state.sessions = [];
    },
  },
});

export const {
  addStatisticsSession,
  setStatisticsSessions,
  clearStatistics,
} = statisticsSlice.actions;

export * from "./types";

export default statisticsSlice.reducer;
