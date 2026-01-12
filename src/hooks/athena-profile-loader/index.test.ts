import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { existsSync, mkdirSync, rmSync } from "node:fs"
import { createAthenaProfileLoaderHook } from "./index"
import { saveUserProfile } from "../../features/athena-research"
import type { UserProfile } from "../../features/athena-research/types"

const TEST_DIR = "/tmp/athena-hook-test-" + Date.now()

function createOutput(text: string) {
  return { parts: [{ type: "text", text }] } as any
}

describe("athena-profile-loader hook", () => {
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

  test("should skip non-Athena agents", async () => {
    // #given
    const hook = createAthenaProfileLoaderHook({ directory: TEST_DIR })
    const input = { sessionID: "session-123", agent: "Sisyphus" }
    const output = createOutput("Hello")

    // #when
    await hook["chat.message"]?.(input, output)

    // #then
    expect(output.parts[0].text).toBe("Hello")
  })

  test("should inject manual classification signal when no client and no profile", async () => {
    // #given
    const hook = createAthenaProfileLoaderHook({ directory: TEST_DIR })
    const input = { sessionID: "session-123", agent: "Athena (Researcher)" }
    const output = createOutput("Build a recipe app")

    // #when
    await hook["chat.message"]?.(input, output)

    // #then
    expect(output.parts[0].text).toContain("[SYSTEM:")
    expect(output.parts[0].text).toContain("Build a recipe app")
  })

  test("should inject existing profile when profile exists", async () => {
    // #given
    const profile: UserProfile = {
      expertise: "intermediate",
      vocabulary_level: "some_technical",
      focus: "solution",
      signals: ["mentioned database", "asked about APIs"],
    }
    saveUserProfile(TEST_DIR, profile, "greenfield", "old-session")

    const hook = createAthenaProfileLoaderHook({ directory: TEST_DIR })
    const input = { sessionID: "session-456", agent: "Athena (Researcher)" }
    const output = createOutput("Continue with the project")

    // #when
    await hook["chat.message"]?.(input, output)

    // #then
    expect(output.parts[0].text).toContain("<user_profile")
    expect(output.parts[0].text).toContain("expertise: intermediate")
    expect(output.parts[0].text).toContain("scenario: greenfield")
    expect(output.parts[0].text).toContain("SKIP Phase 1")
  })

  test("should only inject once per session", async () => {
    // #given
    const hook = createAthenaProfileLoaderHook({ directory: TEST_DIR })
    const input = { sessionID: "session-789", agent: "Athena (Researcher)" }
    const output1 = createOutput("First message")
    const output2 = createOutput("Second message")

    // #when
    await hook["chat.message"]?.(input, output1)
    await hook["chat.message"]?.(input, output2)

    // #then
    expect(output1.parts[0].text).toContain("[SYSTEM:")
    expect(output2.parts[0].text).toBe("Second message")
  })
})
