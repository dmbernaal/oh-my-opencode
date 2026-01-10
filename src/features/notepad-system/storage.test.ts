import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  notepadExists,
  initializeNotepads,
  readContracts,
  readDecisions,
  readStatus,
  readLearnings,
  appendToDecisions,
  appendToStatus,
  appendToLearnings,
  writeContract,
  listNotepads,
  getLearningCategoriesForCategory,
} from "./storage"
import {
  NOTEPAD_BASE_PATH,
  NOTEPAD_SUBDIRS,
  CONTRACT_FILES,
  LEARNING_FILES,
  LOG_FILES,
} from "./constants"

const TEST_DIR = join(new URL(".", import.meta.url).pathname, "__test_fixtures__")
const TEST_PLAN = "test-plan"

describe("notepad storage", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true })
    }
  })

  describe("notepadExists", () => {
    it("should return false when notepad does not exist", () => {
      // #given - no notepad directory
      // #when - checking if notepad exists
      const exists = notepadExists(TEST_DIR, TEST_PLAN)
      // #then - should return false
      expect(exists).toBe(false)
    })

    it("should return true when notepad exists", () => {
      // #given - notepad directory created
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #when - checking if notepad exists
      const exists = notepadExists(TEST_DIR, TEST_PLAN)
      // #then - should return true
      expect(exists).toBe(true)
    })
  })

  describe("initializeNotepads", () => {
    it("should create full directory structure", () => {
      // #given - empty directory
      // #when - initializing notepads
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #then - should create all directories
      const basePath = join(TEST_DIR, NOTEPAD_BASE_PATH, TEST_PLAN)
      expect(existsSync(basePath)).toBe(true)
      expect(existsSync(join(basePath, NOTEPAD_SUBDIRS.contracts))).toBe(true)
      expect(existsSync(join(basePath, NOTEPAD_SUBDIRS.decisions))).toBe(true)
      expect(existsSync(join(basePath, NOTEPAD_SUBDIRS.status))).toBe(true)
      expect(existsSync(join(basePath, NOTEPAD_SUBDIRS.learnings))).toBe(true)
    })

    it("should create contract template files", () => {
      // #given - empty directory
      // #when - initializing notepads
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #then - should create contract files with templates
      const contractsPath = join(TEST_DIR, NOTEPAD_BASE_PATH, TEST_PLAN, NOTEPAD_SUBDIRS.contracts)
      for (const filename of Object.values(CONTRACT_FILES)) {
        expect(existsSync(join(contractsPath, filename))).toBe(true)
      }
    })

    it("should create learning template files", () => {
      // #given - empty directory
      // #when - initializing notepads
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #then - should create learning files with templates
      const learningsPath = join(TEST_DIR, NOTEPAD_BASE_PATH, TEST_PLAN, NOTEPAD_SUBDIRS.learnings)
      for (const filename of Object.values(LEARNING_FILES)) {
        expect(existsSync(join(learningsPath, filename))).toBe(true)
      }
    })

    it("should create log files", () => {
      // #given - empty directory
      // #when - initializing notepads
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #then - should create log files
      const decisionsPath = join(TEST_DIR, NOTEPAD_BASE_PATH, TEST_PLAN, NOTEPAD_SUBDIRS.decisions)
      const statusPath = join(TEST_DIR, NOTEPAD_BASE_PATH, TEST_PLAN, NOTEPAD_SUBDIRS.status)
      expect(existsSync(join(decisionsPath, LOG_FILES.decisions))).toBe(true)
      expect(existsSync(join(statusPath, LOG_FILES.status))).toBe(true)
    })

    it("should not overwrite existing notepad", () => {
      // #given - notepad already exists with custom content
      initializeNotepads(TEST_DIR, TEST_PLAN)
      const apiPath = join(TEST_DIR, NOTEPAD_BASE_PATH, TEST_PLAN, NOTEPAD_SUBDIRS.contracts, CONTRACT_FILES.api)
      writeFileSync(apiPath, "CUSTOM CONTENT", "utf-8")
      // #when - initializing again
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #then - should not overwrite
      expect(readFileSync(apiPath, "utf-8")).toBe("CUSTOM CONTENT")
    })
  })

  describe("readContracts", () => {
    it("should return empty string when notepad does not exist", () => {
      // #given - no notepad
      // #when - reading contracts
      const contracts = readContracts({ directory: TEST_DIR, planName: TEST_PLAN })
      // #then - should return empty string
      expect(contracts).toBe("")
    })

    it("should return concatenated contracts", () => {
      // #given - notepad with custom contracts
      initializeNotepads(TEST_DIR, TEST_PLAN)
      const apiPath = join(TEST_DIR, NOTEPAD_BASE_PATH, TEST_PLAN, NOTEPAD_SUBDIRS.contracts, CONTRACT_FILES.api)
      writeFileSync(apiPath, "# API\nGET /users", "utf-8")
      // #when - reading contracts
      const contracts = readContracts({ directory: TEST_DIR, planName: TEST_PLAN })
      // #then - should include API content
      expect(contracts).toContain("# API")
      expect(contracts).toContain("GET /users")
    })
  })

  describe("readDecisions", () => {
    it("should return tail of decisions log", () => {
      // #given - notepad with decisions
      initializeNotepads(TEST_DIR, TEST_PLAN)
      const decisionsPath = join(TEST_DIR, NOTEPAD_BASE_PATH, TEST_PLAN, NOTEPAD_SUBDIRS.decisions, LOG_FILES.decisions)
      appendToDecisions({
        directory: TEST_DIR,
        planName: TEST_PLAN,
        file: "decisions",
        content: "Use JWT for auth",
        taskName: "auth-design",
      })
      // #when - reading decisions
      const decisions = readDecisions({ directory: TEST_DIR, planName: TEST_PLAN })
      // #then - should include decision content
      expect(decisions).toContain("Use JWT for auth")
      expect(decisions).toContain("auth-design")
    })
  })

  describe("readStatus", () => {
    it("should return tail of status log", () => {
      // #given - notepad with status
      initializeNotepads(TEST_DIR, TEST_PLAN)
      appendToStatus({
        directory: TEST_DIR,
        planName: TEST_PLAN,
        file: "status",
        content: "Implemented login endpoint",
        taskName: "login-api",
      })
      // #when - reading status
      const status = readStatus({ directory: TEST_DIR, planName: TEST_PLAN })
      // #then - should include status content
      expect(status).toContain("Implemented login endpoint")
      expect(status).toContain("login-api")
      expect(status).toContain("COMPLETE")
    })
  })

  describe("readLearnings", () => {
    it("should return learnings for specified categories", () => {
      // #given - notepad with frontend learnings
      initializeNotepads(TEST_DIR, TEST_PLAN)
      appendToLearnings({
        directory: TEST_DIR,
        planName: TEST_PLAN,
        file: "frontend",
        content: "Use React Query for data fetching",
        taskName: "setup-data-layer",
      })
      // #when - reading learnings with frontend category
      const { learnings, sharedLearnings } = readLearnings({
        directory: TEST_DIR,
        planName: TEST_PLAN,
        categories: ["frontend"],
      })
      // #then - should include frontend learning
      expect(learnings).toContain("React Query")
    })

    it("should always include shared learnings", () => {
      // #given - notepad with shared learnings
      initializeNotepads(TEST_DIR, TEST_PLAN)
      appendToLearnings({
        directory: TEST_DIR,
        planName: TEST_PLAN,
        file: "shared",
        content: "Use conventional commits",
        taskName: "git-setup",
      })
      // #when - reading learnings
      const { learnings, sharedLearnings } = readLearnings({
        directory: TEST_DIR,
        planName: TEST_PLAN,
        categories: [],
      })
      // #then - should include shared learning
      expect(sharedLearnings).toContain("conventional commits")
    })
  })

  describe("getLearningCategoriesForCategory", () => {
    it("should return frontend categories for visual category", () => {
      // #given - visual category
      // #when - getting learning categories
      const categories = getLearningCategoriesForCategory("visual")
      // #then - should include frontend and shared
      expect(categories).toContain("frontend")
      expect(categories).toContain("shared")
    })

    it("should return backend categories for business-logic category", () => {
      // #given - business-logic category
      // #when - getting learning categories
      const categories = getLearningCategoriesForCategory("business-logic")
      // #then - should include backend and shared
      expect(categories).toContain("backend")
      expect(categories).toContain("shared")
    })

    it("should return empty array for explore category", () => {
      // #given - explore category
      // #when - getting learning categories
      const categories = getLearningCategoriesForCategory("explore")
      // #then - should be empty (no injection for explore)
      expect(categories).toEqual([])
    })

    it("should return shared for unknown category", () => {
      // #given - unknown category
      // #when - getting learning categories
      const categories = getLearningCategoriesForCategory("unknown")
      // #then - should include shared only
      expect(categories).toContain("shared")
    })
  })

  describe("appendToDecisions", () => {
    it("should append with timestamp and task name", () => {
      // #given - notepad exists
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #when - appending decision
      const result = appendToDecisions({
        directory: TEST_DIR,
        planName: TEST_PLAN,
        file: "decisions",
        content: "Use PostgreSQL",
        taskName: "db-selection",
      })
      // #then - should succeed and include formatted entry
      expect(result).toBe(true)
      const decisions = readDecisions({ directory: TEST_DIR, planName: TEST_PLAN })
      expect(decisions).toContain("Use PostgreSQL")
      expect(decisions).toContain("db-selection")
    })

    it("should return false when notepad does not exist", () => {
      // #given - no notepad
      // #when - appending decision
      const result = appendToDecisions({
        directory: TEST_DIR,
        planName: TEST_PLAN,
        file: "decisions",
        content: "Test",
      })
      // #then - should fail
      expect(result).toBe(false)
    })
  })

  describe("writeContract", () => {
    it("should overwrite contract file", () => {
      // #given - notepad with existing contract
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #when - writing contract
      const result = writeContract({
        directory: TEST_DIR,
        planName: TEST_PLAN,
        file: "api",
        content: "# New API\nPOST /auth",
      })
      // #then - should succeed with new content
      expect(result).toBe(true)
      const contracts = readContracts({ directory: TEST_DIR, planName: TEST_PLAN })
      expect(contracts).toContain("# New API")
      expect(contracts).toContain("POST /auth")
    })

    it("should return false for invalid file", () => {
      // #given - notepad exists
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #when - writing to invalid file
      const result = writeContract({
        directory: TEST_DIR,
        planName: TEST_PLAN,
        file: "invalid" as "api",
        content: "test",
      })
      // #then - should fail
      expect(result).toBe(false)
    })
  })

  describe("listNotepads", () => {
    it("should return empty array when no notepads exist", () => {
      // #given - empty directory
      // #when - listing notepads
      const notepads = listNotepads(TEST_DIR)
      // #then - should be empty
      expect(notepads).toEqual([])
    })

    it("should return all notepad names", () => {
      // #given - multiple notepads
      initializeNotepads(TEST_DIR, "plan-1")
      initializeNotepads(TEST_DIR, "plan-2")
      // #when - listing notepads
      const notepads = listNotepads(TEST_DIR)
      // #then - should include both
      expect(notepads).toContain("plan-1")
      expect(notepads).toContain("plan-2")
    })
  })
})
