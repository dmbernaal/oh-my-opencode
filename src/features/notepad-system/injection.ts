import { CATEGORY_TO_LEARNING_FILE, type LearningCategory } from "./constants"
import type { NotepadContext, NotepadInjectionOptions } from "./types"
import {
  notepadExists,
  readContracts,
  readDecisions,
  readStatus,
  readLearnings,
  getLearningCategoriesForCategory,
} from "./storage"

const SKIP_INJECTION_AGENTS = new Set(["explore", "librarian"])

export function shouldInjectNotepad(options: NotepadInjectionOptions): boolean {
  const { planName, directory, agent } = options

  if (!planName) {
    return false
  }

  if (agent && SKIP_INJECTION_AGENTS.has(agent.toLowerCase())) {
    return false
  }

  return notepadExists(directory, planName)
}

export function readNotepadContext(options: NotepadInjectionOptions): NotepadContext {
  const { planName, directory, category } = options

  const learningCategories: LearningCategory[] = category
    ? getLearningCategoriesForCategory(category)
    : ["shared"]

  const contracts = readContracts({ directory, planName })
  const decisions = readDecisions({ directory, planName })
  const status = readStatus({ directory, planName })
  const { learnings, sharedLearnings } = readLearnings({
    directory,
    planName,
    categories: learningCategories,
  })

  return {
    contracts,
    decisions,
    status,
    learnings,
    sharedLearnings,
  }
}

export function buildInjectedPrompt(context: NotepadContext, originalPrompt: string): string {
  const sections: string[] = []

  if (context.contracts.trim()) {
    sections.push(`## INTERFACES (Conform to these exactly)

${context.contracts}`)
  }

  if (context.decisions.trim()) {
    sections.push(`## ARCHITECTURAL CONSTRAINTS

${context.decisions}`)
  }

  if (context.status.trim()) {
    sections.push(`## COMPLETED WORK

${context.status}`)
  }

  const hasLearnings = context.learnings.trim() || context.sharedLearnings.trim()
  if (hasLearnings) {
    const learningContent = [context.learnings.trim(), context.sharedLearnings.trim()]
      .filter(Boolean)
      .join("\n\n---\n\n")

    sections.push(`## ROLE CONTEXT

${learningContent}`)
  }

  if (sections.length === 0) {
    return originalPrompt
  }

  const notepadContent = sections.join("\n\n---\n\n")

  return `${notepadContent}

---

## YOUR ASSIGNED TASK

${originalPrompt}

IMPORTANT: Implement ONLY your assigned task. The interfaces above are your contract with other components. Do not implement functionality outside your role.`
}

export type BoulderStateReader = (directory: string) => { plan_name?: string } | null

export function getActivePlanName(
  directory: string,
  readBoulderStateFn: BoulderStateReader
): string | null {
  const state = readBoulderStateFn(directory)
  return state?.plan_name ?? null
}
