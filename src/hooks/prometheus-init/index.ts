import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import type { Hooks } from "@opencode-ai/plugin"
import { findNearestMessageWithFields, MESSAGE_STORAGE } from "../../features/hook-message-injector"
import { log } from "../../shared/logger"

const HOOK_NAME = "prometheus-init"
const PROMETHEUS_AGENTS = ["Prometheus (Planner)"]

const SISYPHUS_DIRS = [
  ".sisyphus",
  ".sisyphus/drafts",
  ".sisyphus/plans",
  ".sisyphus/notepads",
]

function getAgentFromSession(sessionID: string): string | undefined {
  const directPath = join(MESSAGE_STORAGE, sessionID)
  if (existsSync(directPath)) {
    return findNearestMessageWithFields(directPath)?.agent
  }
  return undefined
}

function ensureSisyphusStructure(directory: string): void {
  for (const dir of SISYPHUS_DIRS) {
    const fullPath = join(directory, dir)
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true })
      log(`[${HOOK_NAME}] Created directory: ${dir}`)
    }
  }
}

export function createPrometheusInitHook(ctx: { directory: string }) {
  let initialized = false

  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      _output: unknown
    ): Promise<void> => {
      if (initialized) return

      const agentName = getAgentFromSession(input.sessionID)
      if (!agentName || !PROMETHEUS_AGENTS.includes(agentName)) {
        return
      }

      ensureSisyphusStructure(ctx.directory)
      initialized = true
      log(`[${HOOK_NAME}] Initialized .sisyphus structure for Prometheus session`)
    },
  } satisfies Hooks
}

