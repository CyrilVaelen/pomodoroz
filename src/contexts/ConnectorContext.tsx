import React, { type PropsWithChildren } from "react";
import { isTauri } from "utils/environment";
import { TauriConnectorProvider } from "./connectors/TauriConnector";
import { TauriInvokeConnector } from "./connectors/TauriInvokeConnector";
import { BrowserConnectorProvider } from "./connectors/BrowserConnector";
import { BrowserInvokeConnector } from "./connectors/BrowserInvokeConnector";

export type ConnectorProps = {
  onMinimizeCallback?: () => void;
  onExitCallback?: () => void;
  onTitlebarDragStart?: () => void;
  connectorError?: string | null;
  dismissConnectorError?: () => void;
};

export const ConnectorContext = React.createContext<ConnectorProps>({});

export function getInvokeConnector() {
  return isTauri() ? TauriInvokeConnector : BrowserInvokeConnector;
}

export const ConnectorProvider = ({ children }: PropsWithChildren) => {
  return isTauri() ? (
    <TauriConnectorProvider>{children}</TauriConnectorProvider>
  ) : (
    <BrowserConnectorProvider>{children}</BrowserConnectorProvider>
  );
};
