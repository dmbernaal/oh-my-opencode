import { existsSync, readFileSync } from "node:fs"
import type { Hooks } from "@opencode-ai/plugin"
import { log } from "../../shared/logger"
import {
  readBoulderState,
  writeBoulderState,
  appendSessionId,
  findPrometheusPlans,
  getPlanProgress,
  createBoulderState,
  getPlanName,
} from "../../features/boulder-state"
import { initializeNotepads } from "../../features/notepad-system"

const HOOK_NAME = "sisyphus-plan-loader"
const SISYPHUS_AGENTS = ["Sisyphus", "build"]

interface HookInput {
  sessionID?: string
  agent?: string
}

interface HookOutput {
  parts?: Array<{ type: string; text?: string }>
}

function showToast(client: any, title: string, message: string, variant: "info" | "success" = "info"): void {
  const tuiClient = client as any
  if (!tuiClient?.tui?.showToast) return
  
  tuiClient.tui.showToast({
    body: { title, message, variant, duration: variant === "success" ? 2000 : 10000 },
  }).catch(() => {})
}

function dismissToast(client: any): void {
  const tuiClient = client as any
  if (!tuiClient?.tui?.dismissToast) return
  tuiClient.tui.dismissToast().catch(() => {})
}

function formatPlanSummary(planPath: string): string {
  if (!existsSync(planPath)) {
    return `[Plan file not found: ${planPath}]`
  }

  try {
    const content = readFileSync(planPath, "utf-8")
    
    // Extract first heading as title
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1] : getPlanName(planPath)
    
    // Extract first paragraph after title as summary
    const lines = content.split('\n')
    let summaryLines: string[] = []
    let foundTitle = false
    
    for (const line of lines) {
      if (line.startsWith('#')) {
        foundTitle = true
        continue
      }
      if (foundTitle && line.trim()) {
        summaryLines.push(line.trim())
        if (summaryLines.length >= 3) break
      }
    }
    
    const summary = summaryLines.join(' ').slice(0, 200)
    
    return `**${title}**\n${summary}${summary.length >= 200 ? '...' : ''}`
  } catch {
    return `[Error reading plan: ${planPath}]`
  }
}

function formatActivePlanContext(
  planPath: string,
  sessionId: string,
  existingState: any
): string {
  const progress = getPlanProgress(planPath)
  const planName = getPlanName(planPath)
  const summary = formatPlanSummary(planPath)
  
  return `[SYSTEM: Active work session detected - Resuming plan execution]

<active_plan>
  <name>${planName}</name>
  <path>${planPath}</path>
  <progress completed="${progress.completed}" total="${progress.total}" />
  <sessions>${existingState.session_ids.length + 1}</sessions>
  <started>${existingState.started_at}</started>
</active_plan>

## Plan Summary

${summary}

## Your Task

1. **Read the plan file**: \`${planPath}\`
2. **Find the first unchecked task**: Look for \`- [ ]\` checkboxes
3. **Continue execution**: Start from the first incomplete task
4. **Update progress**: Check off tasks as you complete them

The current session (${sessionId}) has been added to session_ids.`
}

function formatNewPlanContext(
  planPath: string,
  sessionId: string,
  timestamp: string
): string {
  const progress = getPlanProgress(planPath)
  const planName = getPlanName(planPath)
  const summary = formatPlanSummary(planPath)
  
  return `[SYSTEM: Plan selected - Starting new work session]

<active_plan>
  <name>${planName}</name>
  <path>${planPath}</path>
  <progress completed="${progress.completed}" total="${progress.total}" />
  <session_id>${sessionId}</session_id>
  <started>${timestamp}</started>
</active_plan>

## Plan Summary

${summary}

## Your Task

1. **Read the plan file**: \`${planPath}\`
2. **Understand the full scope**: Review all tasks and architecture
3. **Start execution**: Begin with the first task
4. **Track progress**: Check off tasks as you complete them

boulder.json has been created to track your progress.`
}

function formatMultiplePlansPrompt(
  plans: string[],
  sessionId: string,
  timestamp: string
): string {
  const planList = plans.map((p, i) => {
    const progress = getPlanProgress(p)
    const name = getPlanName(p)
    const summary = formatPlanSummary(p)
    return `${i + 1}. **${name}**
   Path: \`${p}\`
   Progress: ${progress.completed}/${progress.total} tasks
   
   ${summary}
`
  }).join('\n')
  
  return `[SYSTEM: Multiple plans found - User selection required]

<system-reminder>
## Multiple Plans Available

Current Time: ${timestamp}
Session ID: ${sessionId}

${planList}

**Ask the user which plan to work on.**

Present the options above clearly and wait for their response. Once they choose, you'll need to:
1. Create boulder.json with the selected plan
2. Read the plan file
3. Start execution
</system-reminder>`
}

function formatNoPlansContext(): string {
  return `[SYSTEM: No plans found]

<system-reminder>
## No Plans Available

No Prometheus plan files found at \`.sisyphus/plans/\`

**Options:**
1. **Create a plan first**: Switch to Prometheus (Planner) mode to create a work plan
2. **Work without a plan**: Proceed with ad-hoc implementation (not recommended for complex tasks)

If you need to create a plan, tell the user to switch to Prometheus mode.
</system-reminder>`
}

export function createSisyphusPlanLoaderHook(ctx: { directory: string; client?: any }): Hooks {
  const injectedSessions = new Set<string>()

  return {
    "chat.message": async (input: unknown, output: unknown): Promise<void> => {
      const hookInput = input as HookInput
      const hookOutput = output as HookOutput
      const sessionID = hookInput.sessionID
      const agentName = hookInput.agent

      if (!sessionID) {
        return
      }

      // Only inject for Sisyphus agents
      if (!agentName || !SISYPHUS_AGENTS.includes(agentName)) {
        return
      }

      // Only inject once per session
      if (injectedSessions.has(sessionID)) {
        return
      }

      const parts = hookOutput.parts
      if (!parts || parts.length === 0) {
        return
      }

      log(`[${HOOK_NAME}] Checking for Prometheus plans...`)

      const existingState = readBoulderState(ctx.directory)
      const timestamp = new Date().toISOString()

      let contextInfo = ""

      // Case 1: Active plan exists and is incomplete
      if (existingState) {
        const progress = getPlanProgress(existingState.active_plan)
        
        if (!progress.isComplete) {
          log(`[${HOOK_NAME}] Resuming active plan: ${existingState.plan_name}`)
          
          appendSessionId(ctx.directory, sessionID)
          contextInfo = formatActivePlanContext(
            existingState.active_plan,
            sessionID,
            existingState
          )
          
          if (ctx.client) {
            showToast(
              ctx.client,
              "📋 Resuming Plan",
              `Continuing: ${existingState.plan_name} (${progress.completed}/${progress.total})`,
              "success"
            )
          }
          
          injectedSessions.add(sessionID)
          
          const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text)
          if (textPartIndex >= 0 && parts[textPartIndex]) {
            parts[textPartIndex].text = `${contextInfo}\n\n${parts[textPartIndex].text ?? ""}`
          }
          
          return
        } else {
          log(`[${HOOK_NAME}] Previous plan complete, looking for new plans`)
        }
      }

      // Case 2: No active plan or previous plan complete - find new plans
      const plans = findPrometheusPlans(ctx.directory)
      const incompletePlans = plans.filter(p => !getPlanProgress(p).isComplete)

      if (plans.length === 0) {
        log(`[${HOOK_NAME}] No plans found`)
        contextInfo = formatNoPlansContext()
        
        if (ctx.client) {
          showToast(
            ctx.client,
            "📋 No Plans",
            "No Prometheus plans found. Create one first?",
            "info"
          )
        }
      } else if (incompletePlans.length === 0) {
        log(`[${HOOK_NAME}] All plans complete`)
        contextInfo = formatNoPlansContext()
        
        if (ctx.client) {
          showToast(
            ctx.client,
            "✓ All Plans Complete",
            `All ${plans.length} plan(s) are done!`,
            "success"
          )
        }
      } else if (incompletePlans.length === 1) {
        // Auto-select single incomplete plan
        const planPath = incompletePlans[0]
        const progress = getPlanProgress(planPath)
        const newState = createBoulderState(planPath, sessionID)
        writeBoulderState(ctx.directory, newState)
        initializeNotepads(ctx.directory, newState.plan_name)

        log(`[${HOOK_NAME}] Auto-selected plan: ${newState.plan_name}`)
        
        contextInfo = formatNewPlanContext(planPath, sessionID, timestamp)
        
        if (ctx.client) {
          dismissToast(ctx.client)
          showToast(
            ctx.client,
            "✓ Plan Loaded",
            `Starting: ${newState.plan_name} (${progress.total} tasks)`,
            "success"
          )
        }
      } else {
        // Multiple incomplete plans - ask user
        log(`[${HOOK_NAME}] Multiple incomplete plans found: ${incompletePlans.length}`)
        
        contextInfo = formatMultiplePlansPrompt(incompletePlans, sessionID, timestamp)
        
        if (ctx.client) {
          showToast(
            ctx.client,
            "📋 Multiple Plans",
            `Found ${incompletePlans.length} incomplete plans. Choose one to continue.`,
            "info"
          )
        }
      }

      injectedSessions.add(sessionID)

      const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text)
      if (textPartIndex >= 0 && parts[textPartIndex]) {
        parts[textPartIndex].text = `${contextInfo}\n\n${parts[textPartIndex].text ?? ""}`
      }

      log(`[${HOOK_NAME}] Plan context injected successfully`)
    },
  }
}
