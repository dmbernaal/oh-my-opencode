export {
  NOTEPAD_BASE_PATH,
  NOTEPAD_SUBDIRS,
  CONTRACT_FILES,
  LEARNING_FILES,
  LOG_FILES,
  INJECTION_LIMITS,
  CATEGORY_TO_LEARNING_FILE,
  type LearningCategory,
} from "./constants"

export {
  CONTRACT_TEMPLATES,
  LOG_TEMPLATES,
  LEARNING_TEMPLATES,
} from "./templates"

export type {
  NotepadContext,
  NotepadReadOptions,
  NotepadInjectionOptions,
  NotepadAppendOptions,
  ContractWriteOptions,
} from "./types"

export {
  notepadExists,
  initializeNotepads,
  readContracts,
  readDecisions,
  readStatus,
  readLearnings,
  getLearningCategoriesForCategory,
  appendToDecisions,
  appendToStatus,
  appendToLearnings,
  writeContract,
  listNotepads,
} from "./storage"

export {
  shouldInjectNotepad,
  readNotepadContext,
  buildInjectedPrompt,
  getActivePlanName,
  type BoulderStateReader,
} from "./injection"
