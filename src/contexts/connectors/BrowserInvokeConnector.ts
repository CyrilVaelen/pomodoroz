import type {
  ExportTasksDialogPayload,
  FromMainChannel,
  FromMainPayloadMap,
  ToMainChannel,
  ToMainPayloadMap,
} from "../../ipc";
import {
  EXPORT_TASKS_DIALOG,
  IMPORT_TASKS_DIALOG,
  OPEN_RELEASE_PAGE,
  TASKS_EXPORT_RESULT,
  TASKS_IMPORT_RESULT,
} from "../../ipc";
import type { InvokeConnector } from "../InvokeConnector";

const GITHUB_REPO_URL = "https://github.com/cjdduarte/pomodoroz";

type ListenerCallback = (...args: unknown[]) => void;
const listeners = new Map<FromMainChannel, Set<ListenerCallback>>();

const emitToListeners = <C extends FromMainChannel>(
  channel: C,
  ...payload: FromMainPayloadMap[C]
) => {
  const channelListeners = listeners.get(channel);
  if (!channelListeners) return;

  channelListeners.forEach((listener) => {
    try {
      listener(...payload);
    } catch (error) {
      console.warn(
        `[Browser Connector] 监听器处理 ${channel} 出错:`,
        error
      );
    }
  });
};

const handleExportTasksInBrowser = (
  payload: ExportTasksDialogPayload
) => {
  try {
    const blob = new Blob([payload.content], {
      type: "application/json",
    });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    const filename =
      payload.suggestedFileName ||
      `pomodoroz-tasks-${new Date().toISOString().slice(0, 10)}.json`;

    downloadAnchor.href = blobUrl;
    downloadAnchor.download = filename;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);

    emitToListeners(TASKS_EXPORT_RESULT, {
      ok: true,
      canceled: false,
      filePath: filename,
    });
  } catch (error) {
    emitToListeners(TASKS_EXPORT_RESULT, {
      ok: false,
      canceled: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const handleImportTasksInBrowser = () => {
  if (typeof document === "undefined") return;

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.style.display = "none";

  fileInput.onchange = async () => {
    const selectedFile = fileInput.files?.[0];
    if (!selectedFile) {
      emitToListeners(TASKS_IMPORT_RESULT, {
        ok: false,
        canceled: true,
      });
      return;
    }

    try {
      const fileContent = await selectedFile.text();

      emitToListeners(TASKS_IMPORT_RESULT, {
        ok: true,
        canceled: false,
        filePath: selectedFile.name,
        content: fileContent,
      });
    } catch (error) {
      emitToListeners(TASKS_IMPORT_RESULT, {
        ok: false,
        canceled: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  document.body.appendChild(fileInput);
  fileInput.click();
  setTimeout(() => {
    document.body.removeChild(fileInput);
  }, 1000);
};

export const BrowserInvokeConnector: InvokeConnector = {
  send: <C extends ToMainChannel>(
    event: C,
    ...payload: ToMainPayloadMap[C]
  ) => {
    switch (event) {
      case EXPORT_TASKS_DIALOG: {
        const [exportPayload] =
          payload as ToMainPayloadMap[typeof EXPORT_TASKS_DIALOG];
        handleExportTasksInBrowser(exportPayload);
        break;
      }

      case IMPORT_TASKS_DIALOG: {
        handleImportTasksInBrowser();
        break;
      }

      case OPEN_RELEASE_PAGE: {
        if (typeof window !== "undefined") {
          window.open(
            `${GITHUB_REPO_URL}/releases`,
            "_blank",
            "noopener,noreferrer"
          );
        }
        break;
      }

      default:
        // 在普通浏览器环境下，窗口拖拽、最小化、始终置顶等原生命令安全降级处理
        break;
    }
  },

  receive: <C extends FromMainChannel>(
    event: C,
    response: (...payload: FromMainPayloadMap[C]) => void
  ) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    const channelSet = listeners.get(event)!;
    const typedCallback = response as unknown as ListenerCallback;
    channelSet.add(typedCallback);

    return () => {
      channelSet.delete(typedCallback);
    };
  },
};
