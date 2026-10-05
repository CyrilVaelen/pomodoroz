export type OSTypes = "Windows" | "MacOS" | "Linux";

export function detectOS(): OSTypes {
  if (typeof navigator === "undefined" || !navigator.appVersion) {
    const nodeProcess = (
      globalThis as unknown as { process?: { platform?: string } }
    ).process;
    if (nodeProcess && nodeProcess.platform) {
      if (nodeProcess.platform === "win32") return "Windows";
      if (nodeProcess.platform === "darwin") return "MacOS";
      if (nodeProcess.platform === "linux") return "Linux";
    }
    return "Windows";
  }

  const { appVersion } = navigator;

  if (appVersion.indexOf("Win") !== -1) return "Windows";
  if (appVersion.indexOf("Mac") !== -1) return "MacOS";
  if (appVersion.indexOf("Linux") !== -1) return "Linux";

  return "Windows";
}
