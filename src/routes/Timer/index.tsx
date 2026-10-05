import { CounterContext } from "contexts";
import React, { useCallback, useContext, useEffect } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "hooks/storeHooks";
import { setEnableCompactMode } from "store";
import { StyledTimer } from "styles";
import Control from "./Control";
import Counter from "./Counter";
import CompactTaskDisplay from "./CompactTaskDisplay";
import FocusExtensionPrompt from "./FocusExtensionPrompt";

const StyledModeSwitchContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  margin-bottom: 0.4rem;
  z-index: 5;
`;

const StyledModeButton = styled.button<{ $active: boolean }>`
  border: 1px solid
    ${({ $active }) =>
      $active
        ? "var(--color-accent, #4f46e5)"
        : "var(--color-border-primary)"};
  background: ${({ $active }) =>
    $active ? "var(--color-bg-secondary)" : "transparent"};
  color: ${({ $active }) =>
    $active ? "var(--color-title)" : "var(--color-body-text)"};
  font-weight: ${({ $active }) => ($active ? "600" : "400")};
  font-size: 1.2rem;
  padding: 0.3rem 1.2rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-accent, #4f46e5);
  }
`;

type TimerLocationState = {
  enableCompactMode?: boolean;
};

export default function Timer() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const compactMode = useAppSelector(
    (state) => state.settings.compactMode
  );
  const {
    resetTimerAction,
    shouldPromptFocusToIdleReset,
    focusMode,
    switchFocusMode,
  } = useContext(CounterContext);

  useEffect(() => {
    const state = location.state as TimerLocationState | null;

    if (!state?.enableCompactMode || compactMode) {
      return;
    }

    dispatch(setEnableCompactMode(true));
    navigate(location.pathname, { replace: true, state: null });
  }, [
    compactMode,
    dispatch,
    location.pathname,
    location.state,
    navigate,
  ]);

  const onResetCallback = useCallback(
    (options?: { reclassifyFocusToIdle?: boolean }) => {
      if (resetTimerAction) resetTimerAction(options);
    },
    [resetTimerAction]
  );

  return (
    <StyledTimer className={compactMode ? "compact" : ""}>
      {!compactMode && (
        <StyledModeSwitchContainer>
          <StyledModeButton
            type="button"
            $active={focusMode === "pomodoro"}
            onClick={() => switchFocusMode("pomodoro")}
          >
            {t("timer.pomodoro", "番茄钟")}
          </StyledModeButton>
          <StyledModeButton
            type="button"
            $active={focusMode === "countup"}
            onClick={() => switchFocusMode("countup")}
          >
            {t("timer.countUp", "正计时")}
          </StyledModeButton>
        </StyledModeSwitchContainer>
      )}
      <Counter />
      <Control
        resetTimerAction={onResetCallback}
        shouldPromptFocusToIdleReset={shouldPromptFocusToIdleReset}
      />
      <FocusExtensionPrompt />
      <CompactTaskDisplay />
    </StyledTimer>
  );
}
