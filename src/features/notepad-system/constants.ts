import { NOTEPAD_BASE_PATH } from "../boulder-state/constants"

export { NOTEPAD_BASE_PATH }

export const NOTEPAD_SUBDIRS = {
  contracts: "contracts",
  decisions: "decisions",
  status: "status",
  learnings: "learnings",
} as const

export const CONTRACT_FILES = {
  api: "api.md",
  types: "types.md",
  events: "events.md",
} as const

export const LEARNING_FILES = {
  frontend: "frontend.md",
  backend: "backend.md",
  infrastructure: "infrastructure.md",
  shared: "shared.md",
} as const

export const LOG_FILES = {
  decisions: "log.md",
  status: "log.md",
} as const

export type LearningCategory = keyof typeof LEARNING_FILES

export const CATEGORY_TO_LEARNING_FILE: Record<string, LearningCategory[]> = {
  "visual": ["frontend", "shared"],
  "visual-engineering": ["frontend", "shared"],
  "frontend": ["frontend", "shared"],
  "ui": ["frontend", "shared"],
  "business-logic": ["backend", "shared"],
  "backend": ["backend", "shared"],
  "api": ["backend", "shared"],
  "ultrabrain": ["backend", "shared"],
  "infrastructure": ["infrastructure", "shared"],
  "devops": ["infrastructure", "shared"],
  "deploy": ["infrastructure", "shared"],
  "strategic": ["shared"],
  "oracle": ["shared"],
  "architect": ["shared"],
  "explore": [],
  "librarian": [],
  "quick": ["shared"],
  "general": ["shared"],
}

export const INJECTION_LIMITS = {
  decisionsLines: 50,
  statusLines: 30,
  learningsLines: 40,
  sharedLearningsLines: 20,
} as const
