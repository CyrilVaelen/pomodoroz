import React, {
  type PropsWithChildren,
  useCallback,
  useState,
} from "react";
import { ConnectorContext } from "../ConnectorContext";

export const BrowserConnectorProvider = ({
  children,
}: PropsWithChildren) => {
  const [connectorError, setConnectorError] = useState<string | null>(
    null
  );

  const onMinimizeCallback = useCallback(() => {
    // 浏览器环境下无原生最小化能力，做友好降级
  }, []);

  const onExitCallback = useCallback(() => {
    // 浏览器环境下如果被直接关闭，尝试关闭或提示
    if (typeof window !== "undefined") {
      window.close();
    }
  }, []);

  const onTitlebarDragStart = useCallback(() => {
    // 浏览器环境下无需拖拽原生窗口
  }, []);

  const dismissConnectorError = useCallback(() => {
    setConnectorError(null);
  }, []);

  return (
    <ConnectorContext.Provider
      value={{
        onMinimizeCallback,
        onExitCallback,
        onTitlebarDragStart,
        connectorError,
        dismissConnectorError,
      }}
    >
      {children}
    </ConnectorContext.Provider>
  );
};
