import React, {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  addStatisticsSession,
  setPlay,
  setRound,
  setTimerType,
  StatisticsBucket,
  type StatisticsSessionRecord,
} from "store";
import { useNotification, useWakeLock } from "hooks";
import {
  getSpecialBreakTrigger,
  isEqualToOne,
  resolveActiveTaskSelection,
  type ResolvedActiveTaskSelection,
} from "utils";

import notificationIcon from "assets/logos/notification-dark.png";

import breakFinishedWav from "assets/audios/break-finished.wav";
import focusFinishedWav from "assets/audios/focus-finished.wav";
import sessionCompletedWav from "assets/audios/session-completed.wav";
import sixtySecondsLeftWav from "assets/audios/sixty-seconds-left.wav";
import specialBreakStartedWav from "assets/audios/special-break-started.wav";
import thirtySecondsLeftWav from "assets/audios/thirty-seconds-left.wav";
import { useAppDispatch, useAppSelector } from "hooks/storeHooks";
import { TimerStatus } from "store/timer/types";
import { FULLSCREEN_BREAK_ENTERED, FULLSCREEN_BREAK_EXITED } from "ipc";
import { getInvokeConnector } from "./ConnectorContext";

export type FocusMode = "pomodoro" | "countup";

type CounterProps = {
  count: number;
  duration: number;
  timerType?: TimerStatus;
  focusMode: FocusMode;
  switchFocusMode: (mode: FocusMode) => void;
  finishAndSaveSession: () => void;
  shouldPromptFocusExtension: boolean;
  shortFocusExtension: number;
  longFocusExtension: number;
  extendFocusSession?: (minutes: number) => void;
  resetTimerAction?: (options?: ResetTimerActionOptions) => void;
  shouldPromptFocusToIdleReset: boolean;
  shouldRequestFullscreen: boolean;
  shouldFullscreen: boolean;
};

const CounterContext = React.createContext<CounterProps>({
  count: 0,
  duration: 0,
  focusMode: "pomodoro",
  switchFocusMode: () => {},
  finishAndSaveSession: () => {},
  shouldPromptFocusExtension: false,
  shortFocusExtension: 5,
  longFocusExtension: 10,
  shouldPromptFocusToIdleReset: false,
  shouldRequestFullscreen: false,
  shouldFullscreen: false,
});

type ActiveTaskSnapshot = {
  listId: string | null;
  listTitle: string | null;
  taskId: string | null;
  taskText: string | null;
};

type TrackingSnapshot = ActiveTaskSnapshot & {
  bucket: StatisticsBucket;
  timerType: StatisticsSessionRecord["timerType"];
  round: number | null;
  totalRounds: number | null;
};

type TrackingSegment = TrackingSnapshot & {
  startedAt: number;
  lastTickAt: number;
  durationSeconds: number;
};

type ResetTimerActionOptions = {
  reclassifyFocusToIdle?: boolean;
};

const TRACKING_INTERVAL_MS = 1000;
const TRACKING_SLEEP_GAP_MS = 5000;
const TRACKING_PERSIST_CHUNK_SECONDS = 120;
const COUNTDOWN_INTERVAL_FALLBACK_MS = 1000;
const FOCUS_EXTENSION_PROMPT_THRESHOLD_SECONDS = 30;

const createStatisticsDateKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

const createTrackingSessionId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getStatisticsBucket = (
  timerType: TimerStatus,
  isPlaying: boolean
): StatisticsBucket => {
  if (!isPlaying) {
    return StatisticsBucket.IDLE;
  }

  if (
    timerType === TimerStatus.STAY_FOCUS ||
    timerType === TimerStatus.COUNT_UP
  ) {
    return StatisticsBucket.FOCUS;
  }

  return StatisticsBucket.BREAK;
};

const buildTrackingSnapshot = ({
  timerType,
  isPlaying,
  round,
  totalRounds,
  activeTaskSelection,
}: {
  timerType: TimerStatus;
  isPlaying: boolean;
  round: number;
  totalRounds: number;
  activeTaskSelection: ResolvedActiveTaskSelection | null;
}): TrackingSnapshot => {
  const bucket = getStatisticsBucket(timerType, isPlaying);
  const activeTask =
    bucket === StatisticsBucket.FOCUS && activeTaskSelection
      ? {
          listId: activeTaskSelection.listId,
          listTitle: activeTaskSelection.listTitle,
          taskId: activeTaskSelection.cardId,
          taskText: activeTaskSelection.taskText,
        }
      : {
          listId: null,
          listTitle: null,
          taskId: null,
          taskText: null,
        };

  return {
    ...activeTask,
    bucket,
    timerType: bucket === StatisticsBucket.IDLE ? "IDLE" : timerType,
    round:
      bucket === StatisticsBucket.IDLE ||
      timerType === TimerStatus.COUNT_UP
        ? null
        : round,
    totalRounds:
      bucket === StatisticsBucket.IDLE ||
      timerType === TimerStatus.COUNT_UP
        ? null
        : totalRounds,
  };
};

const areTrackingSnapshotsEqual = (
  current: TrackingSnapshot,
  next: TrackingSnapshot
): boolean =>
  current.bucket === next.bucket &&
  current.timerType === next.timerType &&
  current.round === next.round &&
  current.totalRounds === next.totalRounds &&
  current.listId === next.listId &&
  current.listTitle === next.listTitle &&
  current.taskId === next.taskId &&
  current.taskText === next.taskText;

const CounterProvider = ({ children }: PropsWithChildren) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const timer = useAppSelector((state) => state.timer);
  const config = useAppSelector((state) => state.config);
  const settings = useAppSelector((state) => state.settings);
  const tasks = useAppSelector((state) => state.tasks.present);
  const selectedTask = useAppSelector((state) => state.taskSelection);

  const { preventSleeping, allowSleeping } = useWakeLock();

  const notification = useNotification(
    {
      icon: notificationIcon,
      mute: !settings.notificationSoundOn,
      notificationSound: settings.notificationSound,
    },
    settings.notificationType !== "none"
  );

  const [shouldRequestFullscreen, setShouldRequestFullscreen] =
    useState(false);
  const [shouldFullscreen, setShouldFullscreen] = useState(false);
  const [fullscreenDismissed, setFullscreenDismissed] = useState(false);

  const [count, setCount] = useState(config.stayFocus * 60);
  const [lastCountTime, setLastCountTime] = useState(Date.now());
  const [hasNotified30Seconds, setHasNotified30Seconds] =
    useState(false);
  const [hasNotified60Seconds, setHasNotified60Seconds] =
    useState(false);
  const [hasNotifiedBreak, setHasNotifiedBreak] = useState(false);
  const [hasNotifiedFocusExtension, setHasNotifiedFocusExtension] =
    useState(false);

  const [duration, setDuration] = useState(config.stayFocus * 60);
  const focusExtensionUsedRef = useRef(false);
  const previousTimerTypeRef = useRef(timer.timerType);
  const trackingSegmentRef = useRef<TrackingSegment | null>(null);
  const pendingCycleCompletionRef = useRef(false);
  const triggeredSpecialBreakKeysRef = useRef(new Set<string>());
  const breakTransitionTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const currentSessionIdRef = useRef<string>(createTrackingSessionId());
  const sessionStartedAtRef = useRef<number | null>(null);

  const clearBreakTransitionTimeout = useCallback(() => {
    if (breakTransitionTimeoutRef.current === null) {
      return;
    }

    clearTimeout(breakTransitionTimeoutRef.current);
    breakTransitionTimeoutRef.current = null;
  }, []);

  const queueBreakTransition = useCallback(
    (callback: () => void, delayMs: number) => {
      clearBreakTransitionTimeout();

      breakTransitionTimeoutRef.current = setTimeout(() => {
        breakTransitionTimeoutRef.current = null;
        callback();
      }, delayMs);
    },
    [clearBreakTransitionTimeout]
  );

  const setTimerDuration = useCallback(
    (time: number) => {
      clearBreakTransitionTimeout();
      setDuration(time * 60);
      setCount(time * 60);
      setLastCountTime(Date.now());
      setHasNotified30Seconds(false);
      if (time > 1) {
        setHasNotified60Seconds(false);
      }
      setHasNotifiedBreak(false);
      setHasNotifiedFocusExtension(false);
      focusExtensionUsedRef.current = false;
    },
    [clearBreakTransitionTimeout]
  );

  const extendFocusSession = useCallback(
    (minutes: number) => {
      if (
        !settings.enableFocusExtension ||
        focusExtensionUsedRef.current ||
        timer.timerType !== TimerStatus.STAY_FOCUS ||
        !timer.playing ||
        count <= 0 ||
        minutes <= 0
      ) {
        return;
      }

      const extensionSeconds = minutes * 60;
      clearBreakTransitionTimeout();
      focusExtensionUsedRef.current = true;
      setDuration(
        (currentDuration) => currentDuration + extensionSeconds
      );
      setCount(
        (currentCount) => Math.max(0, currentCount) + extensionSeconds
      );
      setLastCountTime(Date.now());
      setHasNotified30Seconds(false);
      setHasNotifiedBreak(false);
    },
    [
      clearBreakTransitionTimeout,
      count,
      settings.enableFocusExtension,
      timer.playing,
      timer.timerType,
    ]
  );

  useEffect(() => {
    return () => {
      clearBreakTransitionTimeout();
    };
  }, [clearBreakTransitionTimeout]);

  const getMinuteLabel = useCallback(
    (value: number) =>
      isEqualToOne(value)
        ? t("timer.minuteSingular")
        : t("timer.minutePlural"),
    [t]
  );

  const activeTaskSelection = useMemo(
    () =>
      resolveActiveTaskSelection({
        taskLists: tasks,
        taskSelection: selectedTask,
      }),
    [selectedTask, tasks]
  );

  const focusMode: FocusMode =
    timer.timerType === TimerStatus.COUNT_UP ? "countup" : "pomodoro";

  const switchFocusMode = useCallback(
    (mode: FocusMode) => {
      dispatch(setPlay(false));
      clearBreakTransitionTimeout();
      trackingSegmentRef.current = null;
      pendingCycleCompletionRef.current = false;
      currentSessionIdRef.current = createTrackingSessionId();
      sessionStartedAtRef.current = null;

      if (mode === "countup") {
        dispatch(setTimerType(TimerStatus.COUNT_UP));
        setDuration(0);
        setCount(0);
      } else {
        dispatch(setTimerType(TimerStatus.STAY_FOCUS));
        setDuration(config.stayFocus * 60);
        setCount(config.stayFocus * 60);
      }
    },
    [clearBreakTransitionTimeout, config.stayFocus, dispatch]
  );

  const finishAndSaveSession = useCallback(() => {
    const now = Date.now();
    const sessionId =
      currentSessionIdRef.current || createTrackingSessionId();
    const startedAt = sessionStartedAtRef.current || now;

    trackingSegmentRef.current = null;
    pendingCycleCompletionRef.current = false;

    if (timer.timerType === TimerStatus.COUNT_UP) {
      const focusSeconds = Number(Math.max(0, count).toFixed(3));
      if (focusSeconds > 0) {
        dispatch(
          addStatisticsSession({
            id: sessionId,
            bucket: StatisticsBucket.FOCUS,
            timerType: TimerStatus.COUNT_UP,
            durationSeconds: focusSeconds,
            startedAt,
            completedAt: now,
            date: createStatisticsDateKey(now),
            round: null,
            totalRounds: null,
            cycleCompleted: false,
            listId: activeTaskSelection?.listId ?? null,
            listTitle: activeTaskSelection?.listTitle ?? null,
            taskId: activeTaskSelection?.cardId ?? null,
            taskText: activeTaskSelection?.taskText ?? null,
          })
        );
      }
      setCount(0);
      setDuration(0);
      dispatch(setPlay(false));
      currentSessionIdRef.current = createTrackingSessionId();
      sessionStartedAtRef.current = null;
      return;
    }

    if (timer.timerType === TimerStatus.STAY_FOCUS) {
      const focusSeconds = Number(
        Math.max(0, duration - count).toFixed(3)
      );
      if (focusSeconds > 0) {
        dispatch(
          addStatisticsSession({
            id: sessionId,
            bucket: StatisticsBucket.FOCUS,
            timerType: TimerStatus.STAY_FOCUS,
            durationSeconds: focusSeconds,
            startedAt,
            completedAt: now,
            date: createStatisticsDateKey(now),
            round: timer.round,
            totalRounds: config.sessionRounds,
            cycleCompleted: false,
            listId: activeTaskSelection?.listId ?? null,
            listTitle: activeTaskSelection?.listTitle ?? null,
            taskId: activeTaskSelection?.cardId ?? null,
            taskText: activeTaskSelection?.taskText ?? null,
          })
        );
      }
      setTimerDuration(config.stayFocus);
      dispatch(setPlay(false));
      currentSessionIdRef.current = createTrackingSessionId();
      sessionStartedAtRef.current = null;
    }
  }, [
    activeTaskSelection,
    config.sessionRounds,
    config.stayFocus,
    count,
    dispatch,
    duration,
    setTimerDuration,
    timer.round,
    timer.timerType,
  ]);

  const trackingSnapshot = useMemo(
    () =>
      buildTrackingSnapshot({
        timerType: timer.timerType,
        isPlaying: timer.playing,
        round: timer.round,
        totalRounds: config.sessionRounds,
        activeTaskSelection,
      }),
    [
      activeTaskSelection,
      config.sessionRounds,
      timer.playing,
      timer.round,
      timer.timerType,
    ]
  );

  const commitTrackingSegment = useCallback(
    (
      segment: TrackingSegment,
      completedAt: number,
      cycleCompleted: boolean
    ) => {
      // 核心保护：FOCUS 桶必须且只能由逻辑会话结算（自然完成或点击结束并保存）统一权威写入。
      // 追踪分段切片（TrackingSegment）绝不写入 FOCUS 统计，防止切片与会话双重入账及未保存会话误入账。
      if (segment.bucket === StatisticsBucket.FOCUS) {
        return;
      }

      const durationSeconds = Number(
        Math.max(0, segment.durationSeconds).toFixed(3)
      );

      if (durationSeconds <= 0) {
        return;
      }

      dispatch(
        addStatisticsSession({
          id: createTrackingSessionId(),
          bucket: segment.bucket,
          timerType: segment.timerType,
          durationSeconds,
          startedAt: segment.startedAt,
          completedAt,
          date: createStatisticsDateKey(completedAt),
          round: segment.round,
          totalRounds: segment.totalRounds,
          cycleCompleted,
          listId: segment.listId,
          listTitle: segment.listTitle,
          taskId: segment.taskId,
          taskText: segment.taskText,
        })
      );
    },
    [dispatch]
  );

  const resetTimerAction = useCallback(
    (options?: ResetTimerActionOptions) => {
      const canReclassifyCurrentFocusSegment =
        trackingSegmentRef.current?.bucket === StatisticsBucket.FOCUS;

      const shouldReclassifyFocusToIdle =
        options?.reclassifyFocusToIdle === true;

      if (
        shouldReclassifyFocusToIdle &&
        timer.timerType === TimerStatus.STAY_FOCUS &&
        canReclassifyCurrentFocusSegment
      ) {
        const now = Date.now();
        const currentSegment = trackingSegmentRef.current;

        if (currentSegment?.bucket === StatisticsBucket.FOCUS) {
          const elapsedMs = now - currentSegment.lastTickAt;
          currentSegment.lastTickAt = now;

          if (elapsedMs > 0 && elapsedMs <= TRACKING_SLEEP_GAP_MS) {
            currentSegment.durationSeconds += elapsedMs / 1000;
          }

          commitTrackingSegment(
            {
              ...currentSegment,
              bucket: StatisticsBucket.IDLE,
              timerType: "IDLE",
              round: null,
              totalRounds: null,
              listId: null,
              listTitle: null,
              taskId: null,
              taskText: null,
            },
            now,
            false
          );

          pendingCycleCompletionRef.current = false;
          trackingSegmentRef.current = {
            ...trackingSnapshot,
            startedAt: now,
            lastTickAt: now,
            durationSeconds: 0,
          };
        }
      }

      trackingSegmentRef.current = null;
      pendingCycleCompletionRef.current = false;

      if (timer.timerType === TimerStatus.COUNT_UP) {
        setCount(0);
        setDuration(0);
        dispatch(setPlay(false));
        currentSessionIdRef.current = createTrackingSessionId();
        sessionStartedAtRef.current = null;
        return;
      }

      dispatch(setPlay(false));
      currentSessionIdRef.current = createTrackingSessionId();
      sessionStartedAtRef.current = null;

      switch (timer.timerType) {
        case TimerStatus.STAY_FOCUS:
          setTimerDuration(config.stayFocus);
          break;
        case TimerStatus.SHORT_BREAK:
          setTimerDuration(config.shortBreak);
          break;
        case TimerStatus.LONG_BREAK:
          setTimerDuration(config.longBreak);
          break;
        case TimerStatus.SPECIAL_BREAK:
          setTimerDuration(duration / 60);
          break;
      }
    },
    [
      timer.timerType,
      duration,
      commitTrackingSegment,
      trackingSnapshot,
      config.longBreak,
      config.stayFocus,
      config.shortBreak,
      setTimerDuration,
      dispatch,
    ]
  );

  useEffect(() => {
    const consumeElapsed = (now: number) => {
      const currentSegment = trackingSegmentRef.current;

      if (!currentSegment) {
        return;
      }

      const elapsedMs = now - currentSegment.lastTickAt;
      currentSegment.lastTickAt = now;

      if (elapsedMs <= 0 || elapsedMs > TRACKING_SLEEP_GAP_MS) {
        return;
      }

      currentSegment.durationSeconds += elapsedMs / 1000;
    };

    const startSegment = (snapshot: TrackingSnapshot, now: number) => {
      trackingSegmentRef.current = {
        ...snapshot,
        startedAt: now,
        lastTickAt: now,
        durationSeconds: 0,
      };
    };

    const closeSegment = (now: number) => {
      const currentSegment = trackingSegmentRef.current;

      if (!currentSegment) {
        return;
      }

      const cycleCompleted =
        currentSegment.bucket === StatisticsBucket.FOCUS &&
        pendingCycleCompletionRef.current;

      commitTrackingSegment(currentSegment, now, cycleCompleted);

      if (currentSegment.bucket === StatisticsBucket.FOCUS) {
        pendingCycleCompletionRef.current = false;
      }

      trackingSegmentRef.current = null;
    };

    const syncTracking = (now: number) => {
      consumeElapsed(now);

      const currentSegment = trackingSegmentRef.current;

      if (!currentSegment) {
        startSegment(trackingSnapshot, now);
        return;
      }

      const shouldSplitSegment = !areTrackingSnapshotsEqual(
        currentSegment,
        trackingSnapshot
      );

      if (shouldSplitSegment) {
        closeSegment(now);
        startSegment(trackingSnapshot, now);
        return;
      }

      if (
        currentSegment.durationSeconds >= TRACKING_PERSIST_CHUNK_SECONDS
      ) {
        closeSegment(now);
        startSegment(trackingSnapshot, now);
      }
    };

    syncTracking(Date.now());

    const trackingInterval = setInterval(() => {
      syncTracking(Date.now());
    }, TRACKING_INTERVAL_MS);

    return () => {
      clearInterval(trackingInterval);

      const now = Date.now();
      consumeElapsed(now);
      closeSegment(now);
    };
  }, [trackingSnapshot, commitTrackingSegment]);

  useEffect(() => {
    if (timer.playing) {
      if (sessionStartedAtRef.current === null) {
        sessionStartedAtRef.current = Date.now();
      }
      setLastCountTime(Date.now());
    }
  }, [timer.playing]);

  useEffect(() => {
    if (timer.playing && timer.timerType !== TimerStatus.STAY_FOCUS) {
      preventSleeping();
    } else {
      allowSleeping();
    }
  }, [timer.playing, timer.timerType, preventSleeping, allowSleeping]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (timer.playing) {
      interval = setInterval(() => {
        const specialBreakTrigger = getSpecialBreakTrigger(
          config.specialBreaks,
          new Date(),
          triggeredSpecialBreakKeysRef.current
        );

        if (timer.timerType !== TimerStatus.SPECIAL_BREAK) {
          if (specialBreakTrigger) {
            triggeredSpecialBreakKeysRef.current.add(
              specialBreakTrigger.key
            );
            dispatch(setTimerType(TimerStatus.SPECIAL_BREAK));
            setTimerDuration(specialBreakTrigger.breakConfig.duration);
            notification(
              t("timer.notifSpecialBreakStartedTitle"),
              {
                body: t("timer.notifEnjoySpecialBreakBody", {
                  duration: specialBreakTrigger.breakConfig.duration,
                  minuteLabel: getMinuteLabel(
                    specialBreakTrigger.breakConfig.duration
                  ),
                }),
              },
              specialBreakStartedWav
            );
            return;
          }
        } else {
          return clearInterval(interval);
        }
      }, 500);
    }

    return () => clearInterval(interval);
  }, [
    config.specialBreaks,
    timer.timerType,
    timer.playing,
    dispatch,
    notification,
    getMinuteLabel,
    t,
    setTimerDuration,
  ]);

  useEffect(() => {
    switch (timer.timerType) {
      case TimerStatus.STAY_FOCUS:
        setTimerDuration(config.stayFocus);
        break;
      case TimerStatus.SHORT_BREAK:
        setTimerDuration(config.shortBreak);
        break;
      case TimerStatus.LONG_BREAK:
        setTimerDuration(config.longBreak);
        break;
    }
  }, [
    setTimerDuration,
    timer.timerType,
    config.stayFocus,
    config.shortBreak,
    config.longBreak,
  ]);

  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval>;

    // calculate how far off a full second the countdown timer is and adjust the countdown timer accordingly
    const offset = count % 1;
    const countdownIntervalMs =
      offset > 0 ? offset * 1000 : COUNTDOWN_INTERVAL_FALLBACK_MS;
    if (timer.playing) {
      timerInterval = setInterval(() => {
        setCount((prevState) => {
          // Calculate time passed since last count
          const now = Date.now();
          const timePassed = now - lastCountTime;

          setLastCountTime(Date.now());
          if (timer.timerType === TimerStatus.COUNT_UP) {
            return prevState + timePassed / 1000;
          }
          return prevState - timePassed / 1000;
        });
      }, countdownIntervalMs);
    }

    return () => clearInterval(timerInterval);
  }, [timer.playing, lastCountTime, count, timer.timerType]);

  useEffect(() => {
    const isFocusExtensionWindow =
      settings.enableFocusExtension &&
      timer.playing &&
      timer.timerType === TimerStatus.STAY_FOCUS &&
      !focusExtensionUsedRef.current &&
      count <= FOCUS_EXTENSION_PROMPT_THRESHOLD_SECONDS &&
      count > 0;
    const isAppInBackground =
      typeof document !== "undefined" &&
      (document.visibilityState !== "visible" || !document.hasFocus());
    const shouldNotifyFocusExtension =
      settings.notificationType !== "none" &&
      isFocusExtensionWindow &&
      isAppInBackground &&
      !hasNotifiedFocusExtension;

    if (settings.notificationType === "extra") {
      if (count <= 60 && count > 0 && !hasNotified60Seconds) {
        setHasNotified60Seconds(true);
        if (
          timer.timerType === TimerStatus.SHORT_BREAK ||
          timer.timerType === TimerStatus.LONG_BREAK ||
          timer.timerType === TimerStatus.SPECIAL_BREAK
        ) {
          notification(
            t("timer.notif60SecondsLeftTitle"),
            { body: t("timer.notifPrepareFocusBody") },
            settings.enableVoiceAssistance && sixtySecondsLeftWav
          );
        }
      } else if (
        count <= 30 &&
        count > 0 &&
        timer.timerType === TimerStatus.STAY_FOCUS &&
        !hasNotified30Seconds &&
        !shouldNotifyFocusExtension
      ) {
        setHasNotified30Seconds(true);
        notification(
          t("timer.notif30SecondsLeftTitle"),
          { body: t("timer.notifPauseMediaBody") },
          settings.enableVoiceAssistance && thirtySecondsLeftWav
        );
      }
    }

    if (shouldNotifyFocusExtension) {
      setHasNotifiedFocusExtension(true);
      setHasNotified30Seconds(true);
      notification(t("timer.notifFocusExtensionAvailableTitle"), {
        body: t("timer.notifFocusExtensionAvailableBody", {
          shortDuration: config.shortFocusExtension,
          shortMinuteLabel: getMinuteLabel(config.shortFocusExtension),
          longDuration: config.longFocusExtension,
          longMinuteLabel: getMinuteLabel(config.longFocusExtension),
        }),
      });
    }

    if (
      count <= 0 &&
      !hasNotifiedBreak &&
      timer.timerType !== TimerStatus.COUNT_UP
    ) {
      setHasNotifiedBreak(true);
      switch (timer.timerType) {
        case TimerStatus.STAY_FOCUS: {
          pendingCycleCompletionRef.current = true;
          const sessionId =
            currentSessionIdRef.current || createTrackingSessionId();
          const startedAt =
            sessionStartedAtRef.current || Date.now() - duration * 1000;
          dispatch(
            addStatisticsSession({
              id: sessionId,
              bucket: StatisticsBucket.FOCUS,
              timerType: TimerStatus.STAY_FOCUS,
              durationSeconds: Number(Math.max(0, duration).toFixed(3)),
              startedAt,
              completedAt: Date.now(),
              date: createStatisticsDateKey(Date.now()),
              round: timer.round,
              totalRounds: config.sessionRounds,
              cycleCompleted: true,
              listId: activeTaskSelection?.listId ?? null,
              listTitle: activeTaskSelection?.listTitle ?? null,
              taskId: activeTaskSelection?.cardId ?? null,
              taskText: activeTaskSelection?.taskText ?? null,
            })
          );
          currentSessionIdRef.current = createTrackingSessionId();
          sessionStartedAtRef.current = null;
          trackingSegmentRef.current = null;
          pendingCycleCompletionRef.current = false;

          const isLastRound = timer.round >= config.sessionRounds;
          const nextBreakDuration = isLastRound
            ? config.longBreak
            : config.shortBreak;

          const nextBreakTimerType = isLastRound
            ? TimerStatus.LONG_BREAK
            : TimerStatus.SHORT_BREAK;

          queueBreakTransition(
            () => {
              const breakNotificationBody =
                nextBreakDuration <= 0
                  ? settings.autoStartWorkTime
                    ? t("timer.notifBreakZeroAutoBody")
                    : t("timer.notifBreakZeroManualBody")
                  : isLastRound
                    ? t("timer.notifEnjoyLongBreakBody", {
                        duration: config.longBreak,
                        minuteLabel: getMinuteLabel(config.longBreak),
                      })
                    : t("timer.notifEnjoyShortBreakBody", {
                        duration: config.shortBreak,
                        minuteLabel: getMinuteLabel(config.shortBreak),
                      });

              notification(
                isLastRound
                  ? t("timer.notifSessionCompletedTitle")
                  : t("timer.notifFocusFinishedTitle"),
                {
                  body: breakNotificationBody,
                },
                settings.enableVoiceAssistance &&
                  (isLastRound ? sessionCompletedWav : focusFinishedWav)
              );

              if (nextBreakDuration <= 0) {
                setTimerDuration(config.stayFocus);
                dispatch(setRound(isLastRound ? 1 : timer.round + 1));

                if (!settings.autoStartWorkTime) {
                  dispatch(setPlay(false));
                }
                return;
              }

              dispatch(setTimerType(nextBreakTimerType));
            },
            nextBreakDuration <= 0 ? 0 : 1000
          );

          break;
        }

        case TimerStatus.SHORT_BREAK:
          queueBreakTransition(
            () => {
              notification(
                t("timer.notifBreakFinishedTitle"),
                {
                  body: t("timer.notifStayFocusedBody", {
                    duration: config.stayFocus,
                    minuteLabel: getMinuteLabel(config.stayFocus),
                  }),
                },
                settings.enableVoiceAssistance && breakFinishedWav
              );

              dispatch(setTimerType(TimerStatus.STAY_FOCUS));
              dispatch(setRound(timer.round + 1));

              if (!settings.autoStartWorkTime) {
                dispatch(setPlay(false));
              }
            },
            config.shortBreak <= 0 ? 0 : 1000
          );
          break;

        case TimerStatus.LONG_BREAK:
          queueBreakTransition(
            () => {
              notification(
                t("timer.notifBreakFinishedTitle"),
                {
                  body: t("timer.notifStayFocusedBody", {
                    duration: config.stayFocus,
                    minuteLabel: getMinuteLabel(config.stayFocus),
                  }),
                },
                settings.enableVoiceAssistance && breakFinishedWav
              );

              dispatch(setTimerType(TimerStatus.STAY_FOCUS));
              dispatch(setRound(1));

              if (!settings.autoStartWorkTime) {
                dispatch(setPlay(false));
              }
            },
            config.longBreak <= 0 ? 0 : 1000
          );
          break;

        case TimerStatus.SPECIAL_BREAK:
          queueBreakTransition(() => {
            notification(
              t("timer.notifBreakFinishedTitle"),
              {
                body: t("timer.notifStayFocusedBody", {
                  duration: config.stayFocus,
                  minuteLabel: getMinuteLabel(config.stayFocus),
                }),
              },
              settings.enableVoiceAssistance && breakFinishedWav
            );

            dispatch(setTimerType(TimerStatus.STAY_FOCUS));

            if (!settings.autoStartWorkTime) {
              dispatch(setPlay(false));
            }
          }, 1000);
          break;
      }
    }
  }, [
    count,
    timer.round,
    timer.playing,
    timer.timerType,
    dispatch,
    notification,
    config.stayFocus,
    config.shortBreak,
    config.longBreak,
    config.sessionRounds,
    config.shortFocusExtension,
    config.longFocusExtension,
    getMinuteLabel,
    settings.enableFocusExtension,
    settings.notificationType,
    settings.autoStartWorkTime,
    settings.enableVoiceAssistance,
    setTimerDuration,
    queueBreakTransition,
    hasNotified30Seconds,
    hasNotified60Seconds,
    hasNotifiedBreak,
    hasNotifiedFocusExtension,
    setHasNotified30Seconds,
    setHasNotified60Seconds,
    setHasNotifiedBreak,
    t,
    activeTaskSelection?.cardId,
    activeTaskSelection?.listId,
    activeTaskSelection?.listTitle,
    activeTaskSelection?.taskText,
    duration,
  ]);

  useEffect(() => {
    if (previousTimerTypeRef.current !== timer.timerType) {
      setFullscreenDismissed(false);
      previousTimerTypeRef.current = timer.timerType;
    }
  }, [timer.timerType]);

  useEffect(() => {
    if (!settings.enableFullscreenBreak) {
      setShouldRequestFullscreen(false);
      setShouldFullscreen(false);
      setFullscreenDismissed(false);
      return;
    }

    if (timer.timerType === TimerStatus.STAY_FOCUS) {
      setShouldRequestFullscreen(false);
      setShouldFullscreen(false);
      setFullscreenDismissed(false);
      return;
    }

    if (!fullscreenDismissed) {
      setShouldRequestFullscreen(true);
    }
  }, [
    settings.enableFullscreenBreak,
    timer.timerType,
    fullscreenDismissed,
  ]);

  useEffect(() => {
    const connector = getInvokeConnector();
    const cleanupEntered = connector.receive(
      FULLSCREEN_BREAK_ENTERED,
      () => {
        setShouldFullscreen(true);
      }
    );

    const cleanupExited = connector.receive(
      FULLSCREEN_BREAK_EXITED,
      () => {
        setShouldRequestFullscreen(false);
        setShouldFullscreen(false);
        setFullscreenDismissed(true);
      }
    );

    return () => {
      cleanupEntered();
      cleanupExited();
    };
  }, []);

  useEffect(() => {
    if (shouldRequestFullscreen) return;

    setShouldFullscreen(false);
  }, [shouldRequestFullscreen]);

  useEffect(() => {
    if (!settings.enableFullscreenBreak || !shouldFullscreen) {
      return;
    }

    const dismissFullscreenOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.code !== "Escape") {
        return;
      }

      setShouldRequestFullscreen(false);
      setShouldFullscreen(false);
      setFullscreenDismissed(true);
    };

    window.addEventListener("keydown", dismissFullscreenOnEscape);

    return () => {
      window.removeEventListener("keydown", dismissFullscreenOnEscape);
    };
  }, [settings.enableFullscreenBreak, shouldFullscreen]);

  const shouldPromptFocusToIdleReset =
    settings.resetFocusToIdleEnabled &&
    timer.timerType === TimerStatus.STAY_FOCUS &&
    duration - count > 0 &&
    trackingSegmentRef.current?.bucket === StatisticsBucket.FOCUS;

  const shouldPromptFocusExtension =
    settings.enableFocusExtension &&
    timer.playing &&
    timer.timerType === TimerStatus.STAY_FOCUS &&
    !focusExtensionUsedRef.current &&
    count > 0 &&
    count <= FOCUS_EXTENSION_PROMPT_THRESHOLD_SECONDS;

  return (
    <CounterContext.Provider
      value={{
        count: Math.ceil(count),
        duration,
        focusMode,
        switchFocusMode,
        finishAndSaveSession,
        shouldPromptFocusExtension,
        shortFocusExtension: config.shortFocusExtension,
        longFocusExtension: config.longFocusExtension,
        extendFocusSession,
        resetTimerAction,
        shouldPromptFocusToIdleReset,
        shouldRequestFullscreen,
        shouldFullscreen,
        timerType: timer.timerType,
      }}
    >
      {children}
    </CounterContext.Provider>
  );
};

export { CounterContext, CounterProvider };
