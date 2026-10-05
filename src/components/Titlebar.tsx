import React, { useContext, useCallback } from "react";
import { TimerStatus } from "store/timer/types";
import {
  StyledTitlebar,
  StyledTitlebarDragRegion,
  StyledWindowActions,
  StyledCloseButton,
  StyledMinimizeButton,
  StyledMarkWrapper,
  StyledMarkLogo,
  StyledMarkName,
} from "styles";
import { ConnectorContext } from "contexts";
import { APP_NAME, APP_VERSION } from "config";
import { isTauri } from "utils";

import appIcon from "assets/logos/tray.png";
import appIconDark from "assets/logos/tray-dark.png";
import appIconShortBreak from "assets/logos/tray-sb.png";
import appIconShortBreakDark from "assets/logos/tray-dark-sb.png";
import appIconLongBreak from "assets/logos/tray-lb.png";
import appIconLongBreakDark from "assets/logos/tray-dark-lb.png";

type Props = {
  darkMode: boolean;
  timerType?: TimerStatus;
};

const Titlebar: React.FC<Props> = ({ darkMode, timerType }) => {
  const { onMinimizeCallback, onExitCallback, onTitlebarDragStart } =
    useContext(ConnectorContext);

  const onDragRegionMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      onTitlebarDragStart?.();
    },
    [onTitlebarDragStart]
  );

  const getAppIcon = useCallback(() => {
    switch (timerType) {
      case TimerStatus.STAY_FOCUS:
        return darkMode ? appIconDark : appIcon;
      case TimerStatus.SHORT_BREAK:
        return darkMode ? appIconShortBreakDark : appIconShortBreak;
      case TimerStatus.LONG_BREAK:
        return darkMode ? appIconLongBreakDark : appIconLongBreak;
      default:
        return darkMode ? appIconLongBreakDark : appIconLongBreak;
    }
  }, [darkMode, timerType]);

  return (
    <StyledTitlebar>
      <StyledTitlebarDragRegion
        data-tauri-drag-region
        onMouseDown={onDragRegionMouseDown}
      >
        <StyledMarkWrapper>
          <StyledMarkLogo src={getAppIcon()} />
          <StyledMarkName>
            {APP_NAME} {APP_VERSION && <span>v{APP_VERSION}</span>}
          </StyledMarkName>
        </StyledMarkWrapper>
      </StyledTitlebarDragRegion>

      {isTauri() && (
        <StyledWindowActions>
          <StyledMinimizeButton onClick={onMinimizeCallback} />
          <StyledCloseButton onClick={onExitCallback} />
        </StyledWindowActions>
      )}
    </StyledTitlebar>
  );
};

export default React.memo(Titlebar);
