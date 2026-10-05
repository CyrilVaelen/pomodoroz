import React, { useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "hooks/storeHooks";
import {
  setAlwaysOnTop,
  setEnableStrictMode,
  setEnableProgressAnimation,
  setNotificationType,
  setEnableFullscreenBreak,
  setEnableFocusExtension,
  setUseNativeTitlebar,
  setAutoStartWorkTime,
  setResetFocusToIdleEnabled,
  setMinimizeToTray,
  setCloseToTray,
  setEnableVoiceAssistance,
  setEnableCompactMode,
  setEnableGridColorLoop,
  setShowGridRandomButton,
  setDrawOnlyPrioritizedTasks,
  setOpenAtLogin,
  setEnableInAppAutoUpdate,
  setFollowSystemTheme,
  setHideCountUpElapsedTime,
} from "store";
import { Toggler, TogglerProps, Collapse, Radio } from "components";
import { ThemeContext } from "contexts";

import SettingSection from "./SettingSection";
import { detectOS, requestDesktopNotificationPermission } from "utils";
import { NotificationTypes } from "store/settings/types";

const FeatureSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useAppSelector((state) => state.settings);

  const dispatch = useAppDispatch();

  const { isDarkMode, toggleThemeAction } = useContext(ThemeContext);

  const toggleCompactMode = useCallback(() => {
    const nextCompactMode = !settings.compactMode;

    // Compact mode only renders the timer route; request activation via route state.
    if (nextCompactMode && location.pathname !== "/") {
      navigate("/", {
        state: { enableCompactMode: true },
      });
      return;
    }

    dispatch(setEnableCompactMode(nextCompactMode));
  }, [dispatch, location.pathname, navigate, settings.compactMode]);

  const featureList: TogglerProps[] = [
    {
      id: "always-on-top",
      label: t("settings.alwaysOnTop"),
      checked: settings.alwaysOnTop,
      onChange: useCallback(() => {
        dispatch(setAlwaysOnTop(!settings.alwaysOnTop));
      }, [dispatch, settings.alwaysOnTop]),
    },
    {
      id: "compact-mode",
      label: t("settings.compactMode"),
      checked: settings.compactMode,
      onChange: toggleCompactMode,
    },
    {
      id: "grid-random-button",
      label: t("settings.showGridRandomButton"),
      checked: settings.showGridRandomButton,
      onChange: useCallback(() => {
        dispatch(
          setShowGridRandomButton(!settings.showGridRandomButton)
        );
      }, [dispatch, settings.showGridRandomButton]),
    },
    {
      id: "grid-draw-only-prioritized",
      label: t("settings.drawOnlyPrioritizedTasks"),
      checked: settings.drawOnlyPrioritizedTasks,
      disabled: !settings.showGridRandomButton,
      onChange: useCallback(() => {
        dispatch(
          setDrawOnlyPrioritizedTasks(
            !settings.drawOnlyPrioritizedTasks
          )
        );
      }, [dispatch, settings.drawOnlyPrioritizedTasks]),
    },
    {
      id: "grid-color-loop",
      label: t("settings.gridColorLoop"),
      checked: settings.enableGridColorLoop,
      onChange: useCallback(() => {
        dispatch(setEnableGridColorLoop(!settings.enableGridColorLoop));
      }, [dispatch, settings.enableGridColorLoop]),
    },
    {
      id: "fullscreen-break",
      label: t("settings.fullscreenBreak"),
      checked: settings.enableFullscreenBreak,
      onChange: useCallback(() => {
        dispatch(
          setEnableFullscreenBreak(!settings.enableFullscreenBreak)
        );
      }, [dispatch, settings.enableFullscreenBreak]),
    },
    {
      id: "strict-mode",
      label: t("settings.strictMode"),
      checked: settings.enableStrictMode,
      onChange: useCallback(() => {
        dispatch(setEnableStrictMode(!settings.enableStrictMode));
      }, [dispatch, settings.enableStrictMode]),
    },
    {
      id: "dark-theme",
      label: t("settings.darkTheme"),
      checked: isDarkMode,
      onChange: useCallback(() => {
        if (settings.followSystemTheme) {
          dispatch(setFollowSystemTheme(false));
        }
        if (toggleThemeAction) {
          toggleThemeAction();
        }
      }, [dispatch, settings.followSystemTheme, toggleThemeAction]),
    },
    {
      id: "follow-system-theme",
      label: t("settings.followSystemTheme"),
      checked: settings.followSystemTheme,
      onChange: useCallback(() => {
        dispatch(setFollowSystemTheme(!settings.followSystemTheme));
      }, [dispatch, settings.followSystemTheme]),
    },
    {
      id: "native-titlebar",
      label: t("settings.nativeTitlebar"),
      checked: settings.useNativeTitlebar,
      onChange: useCallback(() => {
        dispatch(setUseNativeTitlebar(!settings.useNativeTitlebar));
      }, [dispatch, settings.useNativeTitlebar]),
    },
    {
      id: "progress-animation",
      label: t("settings.progressAnimation"),
      checked: settings.enableProgressAnimation,
      onChange: useCallback(() => {
        dispatch(
          setEnableProgressAnimation(!settings.enableProgressAnimation)
        );
      }, [dispatch, settings.enableProgressAnimation]),
    },
    {
      id: "focus-extension",
      label: t("settings.focusExtension"),
      checked: settings.enableFocusExtension,
      onChange: useCallback(() => {
        dispatch(
          setEnableFocusExtension(!settings.enableFocusExtension)
        );
      }, [dispatch, settings.enableFocusExtension]),
    },
    {
      id: "hide-count-up-elapsed-time",
      label: t("settings.hideCountUpElapsedTime"),
      checked: settings.hideCountUpElapsedTime,
      onChange: useCallback(() => {
        dispatch(
          setHideCountUpElapsedTime(!settings.hideCountUpElapsedTime)
        );
      }, [dispatch, settings.hideCountUpElapsedTime]),
    },
    {
      id: "auto-start-work-time",
      label: t("settings.autoStartWorkTime"),
      checked: settings.autoStartWorkTime,
      onChange: useCallback(() => {
        dispatch(setAutoStartWorkTime(!settings.autoStartWorkTime));
      }, [dispatch, settings.autoStartWorkTime]),
    },
    {
      id: "reset-focus-to-idle",
      label: t("settings.resetFocusToIdle"),
      checked: settings.resetFocusToIdleEnabled,
      onChange: useCallback(() => {
        dispatch(
          setResetFocusToIdleEnabled(!settings.resetFocusToIdleEnabled)
        );
      }, [dispatch, settings.resetFocusToIdleEnabled]),
    },
    {
      id: "minimize-to-tray",
      label: t("settings.minimizeToTray"),
      checked: settings.minimizeToTray,
      onChange: useCallback(() => {
        dispatch(setMinimizeToTray(!settings.minimizeToTray));
      }, [dispatch, settings.minimizeToTray]),
    },
    {
      id: "close-to-tray",
      label: t("settings.closeToTray"),
      checked: settings.closeToTray,
      onChange: useCallback(() => {
        dispatch(setCloseToTray(!settings.closeToTray));
      }, [dispatch, settings.closeToTray]),
    },
    {
      id: "voice-assistance",
      label: t("settings.voiceAssistance"),
      checked: settings.enableVoiceAssistance,
      onChange: useCallback(() => {
        dispatch(
          setEnableVoiceAssistance(!settings.enableVoiceAssistance)
        );
      }, [dispatch, settings.enableVoiceAssistance]),
    },
    {
      id: "open-at-login",
      label: t("settings.openAtLogin"),
      checked: settings.openAtLogin,
      onChange: useCallback(() => {
        dispatch(setOpenAtLogin(!settings.openAtLogin));
      }, [dispatch, settings.openAtLogin]),
      style: {
        ...(detectOS() === "Linux" && {
          display: "none",
        }),
      },
    },
    {
      id: "in-app-auto-update",
      label: t("settings.inAppAutoUpdate"),
      checked: settings.enableInAppAutoUpdate,
      onChange: useCallback(() => {
        dispatch(
          setEnableInAppAutoUpdate(!settings.enableInAppAutoUpdate)
        );
      }, [dispatch, settings.enableInAppAutoUpdate]),
    },
  ];

  const onChangeNotificationProps = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextNotificationType = e.target.value as NotificationTypes;

      dispatch(setNotificationType(nextNotificationType));

      if (nextNotificationType !== NotificationTypes.NONE) {
        void requestDesktopNotificationPermission().then(
          (permission) => {
            if (permission === "denied") {
              console.warn(
                "[Notification] Permissão negada. Ajuste nas configurações do sistema para exibir avisos."
              );
            }
          }
        );
      }
    },
    [dispatch]
  );

  return (
    <SettingSection heading={t("settings.appFeatures")}>
      {featureList.map(
        ({
          id,
          label,
          checked,
          onChange,
          disabled = false,
          ...rest
        }) => (
          <Toggler
            id={id}
            key={id}
            label={label}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            {...rest}
          />
        )
      )}
      <Collapse>
        <Radio
          id="none"
          label={t("settings.notificationNone")}
          name="notification"
          value={NotificationTypes.NONE}
          checked={settings.notificationType === NotificationTypes.NONE}
          onChange={onChangeNotificationProps}
        />
        <Radio
          id="normal"
          label={t("settings.notificationNormal")}
          name="notification"
          value={NotificationTypes.NORMAL}
          checked={
            settings.notificationType === NotificationTypes.NORMAL
          }
          onChange={onChangeNotificationProps}
        />
        <Radio
          id="extra"
          label={t("settings.notificationExtra")}
          name="notification"
          value={NotificationTypes.EXTRA}
          checked={
            settings.notificationType === NotificationTypes.EXTRA
          }
          onChange={onChangeNotificationProps}
        />
      </Collapse>
    </SettingSection>
  );
};

export default FeatureSection;
