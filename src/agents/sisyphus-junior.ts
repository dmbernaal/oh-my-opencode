import type { AgentConfig } from "@opencode-ai/sdk"
import { isGptModel } from "./types"
import type { CategoryConfig } from "../config/schema"
import {
  createAgentToolRestrictions,
  migrateAgentConfig,
} from "../shared/permission-compat"

const SISYPHUS_JUNIOR_PROMPT = `<Role>
Sisyphus-Junior - Focused executor from OhMyOpenCode.
Execute tasks directly. NEVER delegate or spawn other agents.
</Role>

<Critical_Constraints>
BLOCKED ACTIONS (will fail if attempted):
- task tool: BLOCKED
- sisyphus_task tool: BLOCKED  
- sisyphus_task tool: BLOCKED (already blocked above, but explicit)
- call_omo_agent tool: BLOCKED

You work ALONE. No delegation. No background tasks. Execute directly.
</Critical_Constraints>

<Work_Context>
## Shared Whiteboard (Notepad System)

When working on a plan, context from the shared notepad is injected into your prompt automatically.
The notepad is the "whiteboard" for multi-agent coordination.

NOTEPAD STRUCTURE: .sisyphus/notepads/{plan-name}/
- contracts/ - API contracts, types, events (READ: you MUST conform to these)
- decisions/log.md - Architectural decisions (READ: constraints to follow)
- status/log.md - Task completions (READ: what's done, WRITE: your completions)
- learnings/{role}.md - Role-specific learnings (WRITE: patterns, gotchas)

AFTER completing work, append to relevant files:
- status/log.md: Brief summary of what you completed
- learnings/{your-role}.md: Patterns discovered, gotchas encountered

## Plan Location (READ ONLY)
PLAN PATH: .sisyphus/plans/{plan-name}.md

The plan file is SACRED and READ-ONLY. Only the Orchestrator manages it.
- You may READ to understand tasks
- You MUST NOT edit, modify, or mark checkboxes

VIOLATION = IMMEDIATE FAILURE.
</Work_Context>

<Todo_Discipline>
TODO OBSESSION (NON-NEGOTIABLE):
- 2+ steps → todowrite FIRST, atomic breakdown
- Mark in_progress before starting (ONE at a time)
- Mark completed IMMEDIATELY after each step
- NEVER batch completions

No todos on multi-step work = INCOMPLETE WORK.
</Todo_Discipline>

<Verification>
Task NOT complete without:
- lsp_diagnostics clean on changed files
- Build passes (if applicable)
- All todos marked completed
</Verification>

<Style>
- Start immediately. No acknowledgments.
- Match user's communication style.
- Dense > verbose.
</Style>`

function buildSisyphusJuniorPrompt(promptAppend?: string): string {
  if (!promptAppend) return SISYPHUS_JUNIOR_PROMPT
  return SISYPHUS_JUNIOR_PROMPT + "\n\n" + promptAppend
}

// Core tools that Sisyphus-Junior must NEVER have access to
const BLOCKED_TOOLS = ["task", "sisyphus_task", "call_omo_agent"]

export function createSisyphusJuniorAgent(
  categoryConfig: CategoryConfig,
  promptAppend?: string
): AgentConfig {
  const prompt = buildSisyphusJuniorPrompt(promptAppend)
  const model = categoryConfig.model

  const baseRestrictions = createAgentToolRestrictions(BLOCKED_TOOLS)
  const mergedConfig = migrateAgentConfig({
    ...baseRestrictions,
    ...(categoryConfig.tools ? { tools: categoryConfig.tools } : {}),
  })

  const base: AgentConfig = {
    description:
      "Sisyphus-Junior - Focused task executor. Same discipline, no delegation.",
    mode: "subagent" as const,
    model,
    maxTokens: categoryConfig.maxTokens ?? 64000,
    prompt,
    color: "#20B2AA",
    ...mergedConfig,
  }

  if (categoryConfig.temperature !== undefined) {
    base.temperature = categoryConfig.temperature
  }
  if (categoryConfig.top_p !== undefined) {
    base.top_p = categoryConfig.top_p
  }

  if (categoryConfig.thinking) {
    return { ...base, thinking: categoryConfig.thinking } as AgentConfig
  }

  if (categoryConfig.reasoningEffort) {
    return {
      ...base,
      reasoningEffort: categoryConfig.reasoningEffort,
      textVerbosity: categoryConfig.textVerbosity,
    } as AgentConfig
  }

  if (isGptModel(model)) {
    return { ...base, reasoningEffort: "medium" } as AgentConfig
  }

  return {
    ...base,
    thinking: { type: "enabled", budgetTokens: 32000 },
  } as AgentConfig
}
