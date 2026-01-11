import { join } from "node:path"

export const PLANNING_SESSION_DIR = ".sisyphus"
export const PLANNING_SESSION_FILE = "planning-session.json"
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function getPlanningSessionPath(directory: string): string {
  return join(directory, PLANNING_SESSION_DIR, PLANNING_SESSION_FILE)
}
