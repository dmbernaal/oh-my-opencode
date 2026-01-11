import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import { dirname } from "node:path"
import { getPlanningSessionPath, SESSION_TIMEOUT_MS } from "./constants"
import type { PlanningSession, PlanningSessionOptions } from "./types"
import { log } from "../../shared/logger"

const HOOK_NAME = "planning-session"

export function createPlanningSession(
  directory: string,
  options: PlanningSessionOptions = {}
): PlanningSession {
  const session: PlanningSession = {
    active: true,
    agent: options.agent || "Prometheus (Planner)",
    startedAt: new Date().toISOString(),
    planName: options.planName || null,
    lastActivity: new Date().toISOString(),
  }

  const sessionPath = getPlanningSessionPath(directory)
  const sessionDir = dirname(sessionPath)

  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true })
  }

  writeFileSync(sessionPath, JSON.stringify(session, null, 2), "utf-8")
  log(`[${HOOK_NAME}] Created planning session`, { directory, agent: session.agent })

  return session
}

export function readPlanningSession(directory: string): PlanningSession | null {
  const sessionPath = getPlanningSessionPath(directory)

  if (!existsSync(sessionPath)) {
    return null
  }

  try {
    const content = readFileSync(sessionPath, "utf-8")
    const session = JSON.parse(content) as PlanningSession

    const lastActivity = new Date(session.lastActivity).getTime()
    const now = Date.now()

    if (now - lastActivity > SESSION_TIMEOUT_MS) {
      log(`[${HOOK_NAME}] Session timed out, cleaning up`, { directory })
      deletePlanningSession(directory)
      return null
    }

    return session
  } catch (err) {
    log(`[${HOOK_NAME}] Failed to read session`, { directory, error: String(err) })
    return null
  }
}

export function updatePlanningSession(
  directory: string,
  updates: Partial<PlanningSession>
): PlanningSession | null {
  const session = readPlanningSession(directory)

  if (!session) {
    return null
  }

  const updated: PlanningSession = {
    ...session,
    ...updates,
    lastActivity: new Date().toISOString(),
  }

  const sessionPath = getPlanningSessionPath(directory)
  writeFileSync(sessionPath, JSON.stringify(updated, null, 2), "utf-8")
  log(`[${HOOK_NAME}] Updated planning session`, { directory, updates })

  return updated
}

export function deletePlanningSession(directory: string): void {
  const sessionPath = getPlanningSessionPath(directory)

  if (existsSync(sessionPath)) {
    unlinkSync(sessionPath)
    log(`[${HOOK_NAME}] Deleted planning session`, { directory })
  }
}

export function isPlanningSessionActive(directory: string): boolean {
  const session = readPlanningSession(directory)
  return session !== null && session.active
}
