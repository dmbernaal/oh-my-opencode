let globalConfigDebug: boolean = false;

export function initializeAideDebug(configValue?: boolean): void {
  globalConfigDebug = configValue ?? true;
}

export function isDebugEnabled(): boolean {
  const envDebug = process.env.AIDE_DEBUG === "1";
  const envDisabled = process.env.AIDE_DEBUG === "0";
  
  if (envDisabled) return false;
  if (envDebug) return true;
  
  return globalConfigDebug;
}

export function setDebugEnabled(enabled: boolean): void {
  globalConfigDebug = enabled;
}

export function getDebugStatus(): { enabled: boolean; source: "env" | "config" } {
  const envDebug = process.env.AIDE_DEBUG === "1";
  const envDisabled = process.env.AIDE_DEBUG === "0";
  
  if (envDisabled) return { enabled: false, source: "env" };
  if (envDebug) return { enabled: true, source: "env" };
  return { enabled: globalConfigDebug, source: "config" };
}
