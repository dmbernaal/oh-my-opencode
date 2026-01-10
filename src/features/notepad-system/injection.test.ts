import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { existsSync, mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import {
  shouldInjectNotepad,
  readNotepadContext,
  buildInjectedPrompt,
  getActivePlanName,
} from "./injection"
import { initializeNotepads, appendToDecisions, writeContract } from "./storage"
import type { NotepadContext } from "./types"

const TEST_DIR = join(new URL(".", import.meta.url).pathname, "__test_fixtures_injection__")
const TEST_PLAN = "test-plan"

describe("notepad injection", () => {
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

  describe("shouldInjectNotepad", () => {
    it("should return false when planName is empty", () => {
      // #given - no plan name
      // #when - checking should inject
      const result = shouldInjectNotepad({
        planName: "",
        directory: TEST_DIR,
      })
      // #then - should not inject
      expect(result).toBe(false)
    })

    it("should return false when notepad does not exist", () => {
      // #given - plan name but no notepad
      // #when - checking should inject
      const result = shouldInjectNotepad({
        planName: TEST_PLAN,
        directory: TEST_DIR,
      })
      // #then - should not inject
      expect(result).toBe(false)
    })

    it("should return false for explore agent", () => {
      // #given - notepad exists but agent is explore
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #when - checking should inject for explore
      const result = shouldInjectNotepad({
        planName: TEST_PLAN,
        directory: TEST_DIR,
        agent: "explore",
      })
      // #then - should not inject (explore skips injection)
      expect(result).toBe(false)
    })

    it("should return false for librarian agent", () => {
      // #given - notepad exists but agent is librarian
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #when - checking should inject for librarian
      const result = shouldInjectNotepad({
        planName: TEST_PLAN,
        directory: TEST_DIR,
        agent: "librarian",
      })
      // #then - should not inject (librarian skips injection)
      expect(result).toBe(false)
    })

    it("should return true for other agents when notepad exists", () => {
      // #given - notepad exists and agent is frontend
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #when - checking should inject
      const result = shouldInjectNotepad({
        planName: TEST_PLAN,
        directory: TEST_DIR,
        agent: "frontend-ui-ux-engineer",
      })
      // #then - should inject
      expect(result).toBe(true)
    })
  })

  describe("readNotepadContext", () => {
    it("should return context with all sections", () => {
      // #given - notepad with content
      initializeNotepads(TEST_DIR, TEST_PLAN)
      writeContract({
        directory: TEST_DIR,
        planName: TEST_PLAN,
        file: "api",
        content: "# API\nGET /users",
      })
      appendToDecisions({
        directory: TEST_DIR,
        planName: TEST_PLAN,
        file: "decisions",
        content: "Use REST",
        taskName: "api-design",
      })
      // #when - reading context
      const context = readNotepadContext({
        planName: TEST_PLAN,
        directory: TEST_DIR,
        category: "backend",
      })
      // #then - should include all sections
      expect(context.contracts).toContain("GET /users")
      expect(context.decisions).toContain("Use REST")
    })

    it("should scope learnings by category", () => {
      // #given - notepad with learnings
      initializeNotepads(TEST_DIR, TEST_PLAN)
      // #when - reading context for frontend category
      const context = readNotepadContext({
        planName: TEST_PLAN,
        directory: TEST_DIR,
        category: "visual",
      })
      // #then - should use frontend learning categories
      expect(context).toBeDefined()
    })
  })

  describe("buildInjectedPrompt", () => {
    it("should return original prompt when context is empty", () => {
      // #given - empty context
      const context: NotepadContext = {
        contracts: "",
        decisions: "",
        status: "",
        learnings: "",
        sharedLearnings: "",
      }
      const originalPrompt = "Build a login form"
      // #when - building injected prompt
      const result = buildInjectedPrompt(context, originalPrompt)
      // #then - should return original prompt unchanged
      expect(result).toBe(originalPrompt)
    })

    it("should include contracts section when present", () => {
      // #given - context with contracts
      const context: NotepadContext = {
        contracts: "# API\nGET /users",
        decisions: "",
        status: "",
        learnings: "",
        sharedLearnings: "",
      }
      const originalPrompt = "Build a login form"
      // #when - building injected prompt
      const result = buildInjectedPrompt(context, originalPrompt)
      // #then - should include contracts header and content
      expect(result).toContain("## INTERFACES")
      expect(result).toContain("GET /users")
      expect(result).toContain("Build a login form")
    })

    it("should include all sections when present", () => {
      // #given - context with all sections
      const context: NotepadContext = {
        contracts: "# API\nGET /users",
        decisions: "Use JWT",
        status: "Login done",
        learnings: "Use React Query",
        sharedLearnings: "Use TypeScript",
      }
      const originalPrompt = "Build a dashboard"
      // #when - building injected prompt
      const result = buildInjectedPrompt(context, originalPrompt)
      // #then - should include all sections
      expect(result).toContain("## INTERFACES")
      expect(result).toContain("## ARCHITECTURAL CONSTRAINTS")
      expect(result).toContain("## COMPLETED WORK")
      expect(result).toContain("## ROLE CONTEXT")
      expect(result).toContain("## YOUR ASSIGNED TASK")
      expect(result).toContain("Build a dashboard")
    })

    it("should include implementation warning", () => {
      // #given - context with content
      const context: NotepadContext = {
        contracts: "# API",
        decisions: "",
        status: "",
        learnings: "",
        sharedLearnings: "",
      }
      const originalPrompt = "Build something"
      // #when - building injected prompt
      const result = buildInjectedPrompt(context, originalPrompt)
      // #then - should include warning about scope
      expect(result).toContain("IMPORTANT: Implement ONLY your assigned task")
    })
  })

  describe("getActivePlanName", () => {
    it("should return null when boulder state is null", () => {
      // #given - no boulder state
      const mockReader = () => null
      // #when - getting active plan name
      const result = getActivePlanName(TEST_DIR, mockReader)
      // #then - should return null
      expect(result).toBeNull()
    })

    it("should return plan_name from boulder state", () => {
      // #given - boulder state with plan name
      const mockReader = () => ({ plan_name: "my-plan" })
      // #when - getting active plan name
      const result = getActivePlanName(TEST_DIR, mockReader)
      // #then - should return plan name
      expect(result).toBe("my-plan")
    })

    it("should return null when plan_name is undefined", () => {
      // #given - boulder state without plan name
      const mockReader = () => ({})
      // #when - getting active plan name
      const result = getActivePlanName(TEST_DIR, mockReader)
      // #then - should return null
      expect(result).toBeNull()
    })
  })
})
