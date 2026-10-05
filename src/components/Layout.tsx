import React, {
  useEffect,
  useContext,
  useCallback,
  useState,
} from "react";
import styled from "styled-components";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  StyledLayout,
  StyledButtonNormal,
  StyledButtonPrimary,
} from "styles";

import Alert from "./Alert";
import ConfirmDialog from "./ConfirmDialog";
import Titlebar from "./Titlebar";
import Navigation from "./Navigation";
import Portal from "./Portal";
import {
  ThemeContext,
  ConnectorContext,
  CounterContext,
  getInvokeConnector,
} from "contexts";
import { INSTALL_UPDATE } from "ipc";
import { TimerStatus } from "store/timer/types";
import { useAppDispatch, useAppSelector } from "hooks/storeHooks";
import { isFreshInstallProfile, setEnableInAppAutoUpdate } from "store";
import { setUpdateVersion } from "store/update";
import {
  getFromStorage,
  isTauri,
  saveToStorage,
  shortcutMatchesEvent,
} from "utils";

const AUTO_UPDATE_POLICY_PROMPT_SEEN_KEY =
  "auto-update-policy-prompt-seen";
const AUTO_UPDATE_POLICY_PROMPT_PENDING_KEY =
  "auto-update-policy-prompt-pending-choice";

const FirstRunAutoUpdateOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  padding: 1.6rem;

  display: flex;
  align-items: center;
  justify-content: center;

  background-color: rgba(0, 0, 0, 0.28);
`;

const FirstRunAutoUpdateDialog = styled.section`
  width: min(40rem, 100%);
  border-radius: 4px;
  border: 1px solid var(--color-border-primary);
  background-color: var(--color-bg-primary);
  box-shadow: 0 12px 34px -10px var(--color-shadow-primary);
  padding: 1.6rem;

  display: grid;
  row-gap: 1.2rem;

  & > h3 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--color-title);
    text-align: center;
  }

  & > p {
    margin: 0;
    color: var(--color-body-text);
    line-height: 1.4;
    text-align: center;
  }
`;

const FirstRunAutoUpdateActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;

  @media (max-width: 380px) {
    grid-template-columns: 1fr;
  }
`;

const FirstRunAutoUpdatePrimaryButton = styled(StyledButtonPrimary)`
  min-width: 0;
  min-height: 3.4rem;
  height: auto;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.2;
  text-align: center;
  padding: 0.7rem 0.9rem;
`;

const FirstRunAutoUpdateNormalButton = styled(StyledButtonNormal)`
  min-width: 0;
  min-height: 3.4rem;
  height: auto;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.2;
  text-align: center;
  padding: 0.7rem 0.9rem;
`;

type Props = {
  children: React.ReactNode;
};

const Layout: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const timer = useAppSelector((state) => state.timer);

  const settings = useAppSelector((state) => state.settings);
  const update = useAppSelector((state) => state.update);
  const dispatch = useAppDispatch();

  const { toggleThemeAction } = useContext(ThemeContext);
  const { connectorError, dismissConnectorError } =
    useContext(ConnectorContext);
  const { shouldFullscreen } = useContext(CounterContext);

  const [noTransition, setNoTransition] = useState(false);
  const [
    showFirstRunAutoUpdatePrompt,
    setShowFirstRunAutoUpdatePrompt,
  ] = useState(false);
  const [
    dismissedUpdatePromptVersion,
    setDismissedUpdatePromptVersion,
  ] = useState("");

  const registerKey = useCallback(
    (e: KeyboardEvent) => {
      if (shortcutMatchesEvent(settings.shortcuts.toggleTheme, e)) {
        e.preventDefault();
        if (toggleThemeAction) toggleThemeAction();
      }
    },
    [settings.shortcuts.toggleTheme, toggleThemeAction]
  );

  useEffect(() => {
    document.addEventListener("keydown", registerKey);
    return () => document.removeEventListener("keydown", registerKey);
  }, [registerKey]);

  useEffect(() => {
    const isBreakMode =
      timer.timerType === TimerStatus.SHORT_BREAK ||
      timer.timerType === TimerStatus.LONG_BREAK ||
      timer.timerType === TimerStatus.SPECIAL_BREAK;

    const shouldLockToTimer =
      settings.enableFullscreenBreak && isBreakMode && shouldFullscreen;

    if (!shouldLockToTimer) {
      setNoTransition(false);
      return;
    }

    if (location.pathname !== "/") {
      setNoTransition(true);
      navigate("/");
    }
  }, [
    timer.timerType,
    location.pathname,
    navigate,
    settings.enableFullscreenBreak,
    shouldFullscreen,
  ]);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    const hasSeenPrompt =
      getFromStorage<boolean>(AUTO_UPDATE_POLICY_PROMPT_SEEN_KEY) ===
      true;
    const hasPendingChoice =
      getFromStorage<boolean>(AUTO_UPDATE_POLICY_PROMPT_PENDING_KEY) ===
      true;

    if (hasSeenPrompt) return;

    if (isFreshInstallProfile || hasPendingChoice) {
      // Keep asking on first-run flow until user explicitly chooses yes/no.
      saveToStorage(AUTO_UPDATE_POLICY_PROMPT_PENDING_KEY, true);
      setShowFirstRunAutoUpdatePrompt(true);
      return;
    }

    // Existing profiles should keep current setting and skip first-run prompt.
    saveToStorage(AUTO_UPDATE_POLICY_PROMPT_SEEN_KEY, true);
  }, []);

  const onSelectAutoUpdatePolicy = useCallback(
    (enableInAppAutoUpdate: boolean) => {
      dispatch(setEnableInAppAutoUpdate(enableInAppAutoUpdate));
      saveToStorage(AUTO_UPDATE_POLICY_PROMPT_SEEN_KEY, true);
      saveToStorage(AUTO_UPDATE_POLICY_PROMPT_PENDING_KEY, false);
      setShowFirstRunAutoUpdatePrompt(false);
    },
    [dispatch]
  );

  const clearUpdatePromptForSession = useCallback(() => {
    setDismissedUpdatePromptVersion(update.updateVersion);
    dispatch(setUpdateVersion(""));
  }, [dispatch, update.updateVersion]);

  const onInstallPromptConfirm = useCallback(() => {
    clearUpdatePromptForSession();
    getInvokeConnector().send(INSTALL_UPDATE);
  }, [clearUpdatePromptForSession]);

  const shouldShowFirstRunAutoUpdatePrompt =
    isTauri() && showFirstRunAutoUpdatePrompt;

  const shouldShowUpdateInstallPrompt =
    isTauri() &&
    Boolean(update.updateVersion) &&
    !settings.enableInAppAutoUpdate &&
    !showFirstRunAutoUpdatePrompt &&
    dismissedUpdatePromptVersion !== update.updateVersion;

  return (
    <StyledLayout noTransition={noTransition}>
      {!settings.useNativeTitlebar && (
        <Titlebar
          darkMode={settings.enableDarkTheme}
          timerType={timer.timerType}
        />
      )}
      {settings["compactMode"] ? null : (
        <Navigation timerType={timer.timerType} />
      )}
      {connectorError && (
        <Alert
          heading="Native integration warning"
          body={connectorError}
          onClose={dismissConnectorError}
        />
      )}
      {shouldShowFirstRunAutoUpdatePrompt && (
        <Portal id="portal">
          <FirstRunAutoUpdateOverlay
            role="dialog"
            aria-modal="true"
            aria-labelledby="auto-update-policy-title"
          >
            <FirstRunAutoUpdateDialog>
              <h3 id="auto-update-policy-title">
                {t("settings.autoUpdatePromptTitle")}
              </h3>
              <p>{t("settings.autoUpdatePromptBody")}</p>
              <FirstRunAutoUpdateActions>
                <FirstRunAutoUpdatePrimaryButton
                  onClick={() => onSelectAutoUpdatePolicy(true)}
                >
                  {t("settings.autoUpdatePromptEnable")}
                </FirstRunAutoUpdatePrimaryButton>
                <FirstRunAutoUpdateNormalButton
                  onClick={() => onSelectAutoUpdatePolicy(false)}
                >
                  {t("settings.autoUpdatePromptNotifyOnly")}
                </FirstRunAutoUpdateNormalButton>
              </FirstRunAutoUpdateActions>
            </FirstRunAutoUpdateDialog>
          </FirstRunAutoUpdateOverlay>
        </Portal>
      )}
      <ConfirmDialog
        open={shouldShowUpdateInstallPrompt}
        title={t("updater.promptTitle")}
        message={t("updater.promptBody", {
          version: update.updateVersion,
        })}
        cancelLabel={t("updater.notNow")}
        confirmLabel={t("updater.updateNow")}
        onCancel={clearUpdatePromptForSession}
        onConfirm={onInstallPromptConfirm}
      />
      {children}
    </StyledLayout>
  );
};

export default React.memo(Layout);
