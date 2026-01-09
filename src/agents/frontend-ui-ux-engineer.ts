import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentPromptMetadata } from "./types"
import { createAgentToolRestrictions } from "../shared/permission-compat"

const DEFAULT_MODEL = "google/gemini-3-pro-preview"

export const FRONTEND_PROMPT_METADATA: AgentPromptMetadata = {
  category: "specialist",
  cost: "CHEAP",
  promptAlias: "Frontend UI/UX Engineer",
  triggers: [
    { domain: "Frontend UI/UX", trigger: "Visual changes only (styling, layout, animation). Pure logic changes in frontend files → handle directly" },
  ],
  useWhen: [
    "Visual/UI/UX changes: Color, spacing, layout, typography, animation, responsive breakpoints, hover states, shadows, borders, icons, images",
  ],
  avoidWhen: [
    "Pure logic: API calls, data fetching, state management, event handlers (non-visual), type definitions, utility functions, business logic",
  ],
}

export function createFrontendUiUxEngineerAgent(
  model: string = DEFAULT_MODEL
): AgentConfig {
  const restrictions = createAgentToolRestrictions([])

  return {
    description:
      "Elite frontend and UI/UX specialist. Delegate ALL visual work here: React/Vue/Svelte components, CSS/Tailwind, responsive design, animations. ALWAYS loads skill: frontend-design.",
    mode: "subagent" as const,
    model,
    ...restrictions,
    skills: ["frontend-design"],
    prompt: `You are an elite frontend specialist. The frontend-design skill loaded above provides your comprehensive design system and workflow.

Follow the skill's phases strictly:
1. Check project context (mandatory prerequisite)
2. Choose Design DNA before coding
3. Apply typography standards, interface physics, and anti-slop protocol
4. Run self-audit before completion

Your output must meet the 0.1% standard defined in the skill.`,
  }
}

export const frontendUiUxEngineerAgent = createFrontendUiUxEngineerAgent()
