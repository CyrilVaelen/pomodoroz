import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  getFromStorage,
  isReservedShortcut,
  normalizeShortcut,
  RESERVED_SHORTCUTS,
} from "utils";
import {
  NotificationSoundTypes,
  NotificationTypes,
  SettingTypes,
  SettingsPayload,
} from "./types";
import type { ShortcutSettings } from "utils/shortcuts";
import { defaultSettings } from "./defaultSettings";

export type { SettingTypes };

type SettingsOverride = Partial<Record<keyof SettingTypes, unknown>>;

const isNotificationType = (
  value: unknown
): value is SettingTypes["notificationType"] => {
  return (
    value === NotificationTypes.NONE ||
    value === NotificationTypes.NORMAL ||
    value === NotificationTypes.EXTRA
  );
};

const isNotificationSound = (
  value: unknown
): value is SettingTypes["notificationSound"] => {
  return (
    value === NotificationSoundTypes.DEFAULT ||
    value === NotificationSoundTypes.CUSTOM
  );
};

const isLanguageOption = (
  value: unknown
): value is SettingTypes["language"] => {
  return (
    value === "auto" ||
    value === "en" ||
    value === "es" ||
    value === "zh" ||
    value === "ja" ||
    value === "pt" ||
    value === "de" ||
    value === "fr"
  );
};

const cloneSettings = (
  settings: Readonly<SettingTypes>
): SettingTypes => ({
  ...settings,
  shortcuts: { ...settings.shortcuts },
});

const normalizeShortcutSettings = (
  value: unknown,
  base: ShortcutSettings
): ShortcutSettings | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = (
    value as Partial<Record<keyof ShortcutSettings, unknown>>
  ).toggleTheme;
  if (typeof candidate !== "string") {
    return null;
  }

  const normalizedShortcut = normalizeShortcut(candidate);
  if (
    !normalizedShortcut ||
    isReservedShortcut(normalizedShortcut, RESERVED_SHORTCUTS)
  ) {
    return null;
  }

  return {
    ...base,
    toggleTheme: normalizedShortcut,
  };
};

const isSettingValue = <K extends keyof SettingTypes>(
  key: K,
  value: unknown
): value is SettingTypes[K] => {
  switch (key) {
    case "ignoreUpdate":
      return typeof value === "string";
    case "notificationType":
      return isNotificationType(value);
    case "notificationSound":
      return isNotificationSound(value);
    case "language":
      return isLanguageOption(value);
    case "themePreset":
      return typeof value === "string";
    case "customPrimaryColor":
      return value === null || typeof value === "string";
    case "shortcuts":
      return (
        normalizeShortcutSettings(value, defaultSettings.shortcuts) !==
        null
      );
    default:
      return typeof value === "boolean";
  }
};

const getSettingsOverride = (): SettingsOverride => {
  const state = getFromStorage("state");

  if (typeof state !== "object" || state === null) {
    return {};
  }

  const stateRecord = state as Record<string, unknown>;
  const settings = stateRecord.settings;

  if (typeof settings !== "object" || settings === null) {
    return {};
  }

  return settings as SettingsOverride;
};

function mergeSettings(
  base: SettingTypes,
  override: SettingsOverride
): SettingTypes {
  const merged: SettingTypes = cloneSettings(base);
  const setMergedValue = <K extends keyof SettingTypes>(
    key: K,
    value: SettingTypes[K]
  ) => {
    merged[key] = value;
  };

  for (const key of Object.keys(base) as Array<keyof SettingTypes>) {
    const candidateValue = override[key];

    if (key === "shortcuts") {
      const shortcuts = normalizeShortcutSettings(
        candidateValue,
        base.shortcuts
      );
      if (shortcuts) {
        setMergedValue(key, shortcuts);
      }
      continue;
    }

    if (
      candidateValue !== undefined &&
      isSettingValue(key, candidateValue)
    ) {
      setMergedValue(key, candidateValue);
    }
  }

  return merged;
}

const settings = mergeSettings(defaultSettings, getSettingsOverride());

const initialState: SettingTypes = settings;

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setIgnoreUpdate(state, action: SettingsPayload<"ignoreUpdate">) {
      state.ignoreUpdate = action.payload;
    },

    setAlwaysOnTop(state, action: SettingsPayload<"alwaysOnTop">) {
      state.alwaysOnTop = action.payload;
    },

    toggleNotificationSound(state) {
      state.notificationSoundOn = !state.notificationSoundOn;
    },

    setNotificationSound(
      state,
      action: SettingsPayload<"notificationSound">
    ) {
      state.notificationSound = action.payload;
    },

    setEnableDarkTheme(
      state,
      action: SettingsPayload<"enableDarkTheme">
    ) {
      state.enableDarkTheme = action.payload;
    },

    setFollowSystemTheme(
      state,
      action: SettingsPayload<"followSystemTheme">
    ) {
      state.followSystemTheme = action.payload;
    },

    setEnableCompactMode(
      state,
      action: SettingsPayload<"compactMode">
    ) {
      state.compactMode = action.payload;
    },

    setShowGridRandomButton(
      state,
      action: SettingsPayload<"showGridRandomButton">
    ) {
      state.showGridRandomButton = action.payload;
    },

    setDrawOnlyPrioritizedTasks(
      state,
      action: SettingsPayload<"drawOnlyPrioritizedTasks">
    ) {
      state.drawOnlyPrioritizedTasks = action.payload;
    },

    setEnableGridColorLoop(
      state,
      action: SettingsPayload<"enableGridColorLoop">
    ) {
      state.enableGridColorLoop = action.payload;
    },

    setEnableFullscreenBreak(
      state,
      action: SettingsPayload<"enableFullscreenBreak">
    ) {
      state.enableFullscreenBreak = action.payload;
    },

    setEnableStrictMode(
      state,
      action: SettingsPayload<"enableStrictMode">
    ) {
      state.enableStrictMode = action.payload;
    },

    setEnableProgressAnimation(
      state,
      action: SettingsPayload<"enableProgressAnimation">
    ) {
      state.enableProgressAnimation = action.payload;
    },

    setEnableFocusExtension(
      state,
      action: SettingsPayload<"enableFocusExtension">
    ) {
      state.enableFocusExtension = action.payload;
    },

    setEnableVoiceAssistance(
      state,
      action: SettingsPayload<"enableVoiceAssistance">
    ) {
      state.enableVoiceAssistance = action.payload;
    },

    setUseNativeTitlebar(
      state,
      action: SettingsPayload<"useNativeTitlebar">
    ) {
      state.useNativeTitlebar = action.payload;
    },

    setNotificationType(
      state,
      action: SettingsPayload<"notificationType">
    ) {
      state.notificationType = action.payload;
    },

    setCloseToTray(state, action: SettingsPayload<"closeToTray">) {
      state.closeToTray = action.payload;
    },

    setMinimizeToTray(
      state,
      action: SettingsPayload<"minimizeToTray">
    ) {
      state.minimizeToTray = action.payload;
    },

    setAutoStartWorkTime(
      state,
      action: SettingsPayload<"autoStartWorkTime">
    ) {
      state.autoStartWorkTime = action.payload;
    },

    setResetFocusToIdleEnabled(
      state,
      action: SettingsPayload<"resetFocusToIdleEnabled">
    ) {
      state.resetFocusToIdleEnabled = action.payload;
    },

    setOpenAtLogin(state, action: SettingsPayload<"openAtLogin">) {
      state.openAtLogin = action.payload;
    },

    setEnableInAppAutoUpdate(
      state,
      action: SettingsPayload<"enableInAppAutoUpdate">
    ) {
      state.enableInAppAutoUpdate = action.payload;
    },

    setLanguage(state, action: SettingsPayload<"language">) {
      state.language = action.payload;
    },

    setHideCountUpElapsedTime(
      state,
      action: SettingsPayload<"hideCountUpElapsedTime">
    ) {
      state.hideCountUpElapsedTime = action.payload;
    },

    setShortcut(
      state,
      action: {
        payload: {
          shortcut: keyof ShortcutSettings;
          value: string;
        };
      }
    ) {
      const normalizedShortcut = normalizeShortcut(
        action.payload.value
      );
      if (
        !normalizedShortcut ||
        isReservedShortcut(normalizedShortcut, RESERVED_SHORTCUTS)
      ) {
        return;
      }

      state.shortcuts[action.payload.shortcut] = normalizedShortcut;
    },

    setThemePreset(state, action: PayloadAction<string>) {
      state.themePreset = action.payload;
    },

    setCustomPrimaryColor(state, action: PayloadAction<string | null>) {
      state.customPrimaryColor = action.payload;
    },

    updateSettings(
      state,
      action: PayloadAction<Partial<SettingTypes>>
    ) {
      Object.assign(state, action.payload);
      if (action.payload.shortcuts) {
        state.shortcuts = {
          ...state.shortcuts,
          ...action.payload.shortcuts,
        };
      }
    },

    resetThemeSettings(state) {
      state.themePreset = "default";
      state.customPrimaryColor = null;
    },

    restoreDefaultSettings() {
      return cloneSettings(defaultSettings);
    },
  },
});

export const {
  updateSettings,
  restoreDefaultSettings,
  resetThemeSettings,
  setThemePreset,
  setCustomPrimaryColor,
  setAlwaysOnTop,
  setAutoStartWorkTime,
  setResetFocusToIdleEnabled,
  setCloseToTray,
  setEnableCompactMode,
  setEnableDarkTheme,
  setEnableGridColorLoop,
  setShowGridRandomButton,
  setDrawOnlyPrioritizedTasks,
  setFollowSystemTheme,
  setEnableFullscreenBreak,
  setEnableFocusExtension,
  setEnableProgressAnimation,
  setEnableStrictMode,
  setEnableVoiceAssistance,
  setHideCountUpElapsedTime,
  setIgnoreUpdate,
  setMinimizeToTray,
  setNotificationSound,
  setNotificationType,
  setEnableInAppAutoUpdate,
  setOpenAtLogin,
  setShortcut,
  setLanguage,
  setUseNativeTitlebar,
  toggleNotificationSound,
} = settingsSlice.actions;

export default settingsSlice.reducer;
