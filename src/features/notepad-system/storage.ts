import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import {
  NOTEPAD_BASE_PATH,
  NOTEPAD_SUBDIRS,
  CONTRACT_FILES,
  LEARNING_FILES,
  LOG_FILES,
  INJECTION_LIMITS,
  CATEGORY_TO_LEARNING_FILE,
  type LearningCategory,
} from "./constants"
import { CONTRACT_TEMPLATES, LOG_TEMPLATES, LEARNING_TEMPLATES } from "./templates"
import type { NotepadReadOptions, NotepadAppendOptions, ContractWriteOptions } from "./types"

function getNotepadPath(directory: string, planName: string): string {
  return join(directory, NOTEPAD_BASE_PATH, planName)
}

function getContractsPath(directory: string, planName: string): string {
  return join(getNotepadPath(directory, planName), NOTEPAD_SUBDIRS.contracts)
}

function getDecisionsPath(directory: string, planName: string): string {
  return join(getNotepadPath(directory, planName), NOTEPAD_SUBDIRS.decisions)
}

function getStatusPath(directory: string, planName: string): string {
  return join(getNotepadPath(directory, planName), NOTEPAD_SUBDIRS.status)
}

function getLearningsPath(directory: string, planName: string): string {
  return join(getNotepadPath(directory, planName), NOTEPAD_SUBDIRS.learnings)
}

export function notepadExists(directory: string, planName: string): boolean {
  return existsSync(getNotepadPath(directory, planName))
}

export function initializeNotepads(directory: string, planName: string): void {
  const basePath = getNotepadPath(directory, planName)

  if (existsSync(basePath)) {
    return
  }

  mkdirSync(basePath, { recursive: true })
  mkdirSync(getContractsPath(directory, planName), { recursive: true })
  mkdirSync(getDecisionsPath(directory, planName), { recursive: true })
  mkdirSync(getStatusPath(directory, planName), { recursive: true })
  mkdirSync(getLearningsPath(directory, planName), { recursive: true })

  for (const [key, filename] of Object.entries(CONTRACT_FILES)) {
    const filePath = join(getContractsPath(directory, planName), filename)
    const template = CONTRACT_TEMPLATES[key as keyof typeof CONTRACT_TEMPLATES]
    writeFileSync(filePath, template, "utf-8")
  }

  const decisionsLog = join(getDecisionsPath(directory, planName), LOG_FILES.decisions)
  writeFileSync(decisionsLog, LOG_TEMPLATES.decisions, "utf-8")

  const statusLog = join(getStatusPath(directory, planName), LOG_FILES.status)
  writeFileSync(statusLog, LOG_TEMPLATES.status, "utf-8")

  for (const [key, filename] of Object.entries(LEARNING_FILES)) {
    const filePath = join(getLearningsPath(directory, planName), filename)
    const template = LEARNING_TEMPLATES[key as keyof typeof LEARNING_TEMPLATES]
    writeFileSync(filePath, template, "utf-8")
  }
}

function readTail(filePath: string, maxLines: number): string {
  if (!existsSync(filePath)) {
    return ""
  }

  try {
    const content = readFileSync(filePath, "utf-8")
    const lines = content.split("\n")
    if (lines.length <= maxLines) {
      return content
    }
    return lines.slice(-maxLines).join("\n")
  } catch {
    return ""
  }
}

function readFull(filePath: string): string {
  if (!existsSync(filePath)) {
    return ""
  }

  try {
    return readFileSync(filePath, "utf-8")
  } catch {
    return ""
  }
}

export function readContracts(options: NotepadReadOptions): string {
  const { directory, planName } = options
  const contractsPath = getContractsPath(directory, planName)

  if (!existsSync(contractsPath)) {
    return ""
  }

  const parts: string[] = []

  for (const filename of Object.values(CONTRACT_FILES)) {
    const filePath = join(contractsPath, filename)
    const content = readFull(filePath).trim()
    if (content) {
      parts.push(content)
    }
  }

  return parts.join("\n\n---\n\n")
}

export function readDecisions(options: NotepadReadOptions): string {
  const { directory, planName } = options
  const filePath = join(getDecisionsPath(directory, planName), LOG_FILES.decisions)
  return readTail(filePath, INJECTION_LIMITS.decisionsLines)
}

export function readStatus(options: NotepadReadOptions): string {
  const { directory, planName } = options
  const filePath = join(getStatusPath(directory, planName), LOG_FILES.status)
  return readTail(filePath, INJECTION_LIMITS.statusLines)
}

export function readLearnings(options: NotepadReadOptions): { learnings: string; sharedLearnings: string } {
  const { directory, planName, categories = [] } = options
  const learningsPath = getLearningsPath(directory, planName)

  if (!existsSync(learningsPath)) {
    return { learnings: "", sharedLearnings: "" }
  }

  const learningParts: string[] = []

  for (const category of categories) {
    if (category === "shared") continue

    const filename = LEARNING_FILES[category]
    if (filename) {
      const filePath = join(learningsPath, filename)
      const content = readTail(filePath, INJECTION_LIMITS.learningsLines).trim()
      if (content) {
        learningParts.push(content)
      }
    }
  }

  const sharedPath = join(learningsPath, LEARNING_FILES.shared)
  const sharedContent = readTail(sharedPath, INJECTION_LIMITS.sharedLearningsLines).trim()

  return {
    learnings: learningParts.join("\n\n---\n\n"),
    sharedLearnings: sharedContent,
  }
}

export function getLearningCategoriesForCategory(category: string): LearningCategory[] {
  return CATEGORY_TO_LEARNING_FILE[category.toLowerCase()] ?? ["shared"]
}

function formatTimestamp(): string {
  const now = new Date()
  return now.toISOString().slice(0, 16).replace("T", " ")
}

export function appendToDecisions(options: NotepadAppendOptions): boolean {
  const { directory, planName, content, taskName } = options
  const filePath = join(getDecisionsPath(directory, planName), LOG_FILES.decisions)

  if (!existsSync(filePath)) {
    return false
  }

  try {
    const timestamp = formatTimestamp()
    const header = taskName ? `## ${timestamp} | Task: ${taskName}\n\n` : `## ${timestamp}\n\n`
    appendFileSync(filePath, `${header}${content}\n\n---\n\n`, "utf-8")
    return true
  } catch {
    return false
  }
}

export function appendToStatus(options: NotepadAppendOptions): boolean {
  const { directory, planName, content, taskName } = options
  const filePath = join(getStatusPath(directory, planName), LOG_FILES.status)

  if (!existsSync(filePath)) {
    return false
  }

  try {
    const timestamp = formatTimestamp()
    const header = taskName
      ? `## ${timestamp} | Task: ${taskName} | Status: COMPLETE\n\n`
      : `## ${timestamp} | Status: COMPLETE\n\n`
    appendFileSync(filePath, `${header}${content}\n\n---\n\n`, "utf-8")
    return true
  } catch {
    return false
  }
}

export function appendToLearnings(options: NotepadAppendOptions): boolean {
  const { directory, planName, file, content, taskName } = options

  if (!Object.keys(LEARNING_FILES).includes(file as string)) {
    return false
  }

  const filename = LEARNING_FILES[file as LearningCategory]
  const filePath = join(getLearningsPath(directory, planName), filename)

  if (!existsSync(filePath)) {
    return false
  }

  try {
    const timestamp = formatTimestamp()
    const header = taskName ? `## ${timestamp} | Task: ${taskName}\n\n` : `## ${timestamp}\n\n`
    appendFileSync(filePath, `${header}${content}\n\n---\n\n`, "utf-8")
    return true
  } catch {
    return false
  }
}

export function writeContract(options: ContractWriteOptions): boolean {
  const { directory, planName, file, content } = options

  if (!Object.keys(CONTRACT_FILES).includes(file)) {
    return false
  }

  const filename = CONTRACT_FILES[file as keyof typeof CONTRACT_FILES]
  const filePath = join(getContractsPath(directory, planName), filename)

  try {
    const contractsPath = getContractsPath(directory, planName)
    if (!existsSync(contractsPath)) {
      mkdirSync(contractsPath, { recursive: true })
    }
    writeFileSync(filePath, content, "utf-8")
    return true
  } catch {
    return false
  }
}

export function listNotepads(directory: string): string[] {
  const basePath = join(directory, NOTEPAD_BASE_PATH)

  if (!existsSync(basePath)) {
    return []
  }

  try {
    return readdirSync(basePath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
  } catch {
    return []
  }
}
