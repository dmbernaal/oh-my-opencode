import type { LearningCategory } from "./constants"

export interface NotepadContext {
  contracts: string
  decisions: string
  status: string
  learnings: string
  sharedLearnings: string
}

export interface NotepadReadOptions {
  planName: string
  directory: string
  categories?: LearningCategory[]
}

export interface NotepadInjectionOptions {
  planName: string
  directory: string
  category?: string
  agent?: string
}

export interface NotepadAppendOptions {
  planName: string
  directory: string
  file: "decisions" | "status" | LearningCategory
  content: string
  timestamp?: boolean
  taskName?: string
}

export interface ContractWriteOptions {
  planName: string
  directory: string
  file: "api" | "types" | "events"
  content: string
}
