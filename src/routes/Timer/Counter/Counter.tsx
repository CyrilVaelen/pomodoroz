import { CounterContext } from "contexts";
import { useTime } from "hooks";
import React, { useContext } from "react";
import { TimerStatus } from "store/timer/types";
import { useAppSelector } from "hooks/storeHooks";
import {
  StyledCounterContainer,
  StyledCounterProgress,
  StyledCounterWrapper,
} from "styles";
import CounterLabel from "./CounterLabel";
import CounterTimer from "./CounterTimer";
import CounterType from "./CounterType";
import { isCountUpElapsedTimeHidden } from "./utils";

const Counter: React.FC = () => {
  const settings = useAppSelector((state) => state.settings);

  const { count, duration, timerType, shouldFullscreen } =
    useContext(CounterContext);
  const safeCount = Math.max(0, count);

  const dashOffset =
    duration > 0 ? (duration - safeCount) * (674 / duration) : 0;

  const { hours, minutes, seconds } = useTime(safeCount);
  const isElapsedTimeHidden = isCountUpElapsedTimeHidden(
    settings.hideCountUpElapsedTime,
    timerType
  );

  if (settings.compactMode) {
    return (
      <StyledCounterContainer
        className="compact"
        fullscreen={shouldFullscreen}
      >
        {shouldFullscreen ? (
          <>
            <StyledCounterProgress
              offset={dashOffset}
              type={timerType}
              animate={
                settings.enableProgressAnimation ? "true" : "false"
              }
            />
            <StyledCounterWrapper>
              <CounterType timerType={timerType} />
              <CounterTimer
                compact
                fullscreen={shouldFullscreen}
                timerType={timerType}
                hours={hours}
                minutes={minutes}
                seconds={seconds}
                hideElapsedTime={isElapsedTimeHidden}
              />
              <CounterLabel timerType={timerType} />
            </StyledCounterWrapper>
          </>
        ) : (
          <CounterTimer
            compact
            timerType={timerType}
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            hideElapsedTime={isElapsedTimeHidden}
          />
        )}
      </StyledCounterContainer>
    );
  }

  return (
    <StyledCounterContainer fullscreen={shouldFullscreen}>
      <StyledCounterProgress
        offset={dashOffset}
        type={timerType}
        animate={settings.enableProgressAnimation ? "true" : "false"}
      />

      <StyledCounterWrapper>
        <CounterType timerType={timerType} />

        <CounterTimer
          hours={hours}
          timerType={timerType}
          minutes={minutes}
          seconds={seconds}
          hideElapsedTime={isElapsedTimeHidden}
        />

        <CounterLabel timerType={timerType} />
      </StyledCounterWrapper>
    </StyledCounterContainer>
  );
};

export default React.memo(Counter);
