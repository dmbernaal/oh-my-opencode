import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { existsSync, mkdirSync, rmSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { loadUserProfile, saveUserProfile, isProfileFresh } from "./profile-persistence"
import type { UserProfile, StoredProfile } from "./types"

const TEST_DIR = "/tmp/athena-test-" + Date.now()
const SESSION_DIR = join(TEST_DIR, ".sisyphus", "session")

describe("athena-research profile-persistence", () => {
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

  describe("saveUserProfile", () => {
    test("should create session directory and save profile", () => {
      // #given
      const profile: UserProfile = {
        expertise: "intermediate",
        vocabulary_level: "some_technical",
        focus: "solution",
        signals: ["mentioned API", "asked about trade-offs"],
      }

      // #when
      const result = saveUserProfile(TEST_DIR, profile, "greenfield", "session-123")

      // #then
      expect(result).toBe(true)
      expect(existsSync(SESSION_DIR)).toBe(true)
      expect(existsSync(join(SESSION_DIR, "user-profile.json"))).toBe(true)
    })

    test("should save profile with correct structure", () => {
      // #given
      const profile: UserProfile = {
        expertise: "expert",
        vocabulary_level: "highly_technical",
        focus: "implementation",
        signals: ["mentioned React", "asked about edge functions"],
      }

      // #when
      saveUserProfile(TEST_DIR, profile, "tech_decision", "session-456")
      const content = readFileSync(join(SESSION_DIR, "user-profile.json"), "utf-8")
      const saved = JSON.parse(content) as StoredProfile

      // #then
      expect(saved.profile.expertise).toBe("expert")
      expect(saved.scenario).toBe("tech_decision")
      expect(saved.session_id).toBe("session-456")
      expect(saved.created_at).toBeDefined()
    })
  })

  describe("loadUserProfile", () => {
    test("should return null when no profile exists", () => {
      // #given - empty directory

      // #when
      const result = loadUserProfile(TEST_DIR)

      // #then
      expect(result).toBeNull()
    })

    test("should load existing fresh profile", () => {
      // #given
      const profile: UserProfile = {
        expertise: "beginner",
        vocabulary_level: "plain",
        focus: "problem",
        signals: ["no technical terms"],
      }
      saveUserProfile(TEST_DIR, profile, "exploration", "session-789")

      // #when
      const result = loadUserProfile(TEST_DIR)

      // #then
      expect(result).not.toBeNull()
      expect(result?.profile.expertise).toBe("beginner")
      expect(result?.scenario).toBe("exploration")
    })
  })

  describe("isProfileFresh", () => {
    test("should return true for profile created now", () => {
      // #given
      const profile: StoredProfile = {
        profile: {
          expertise: "intermediate",
          vocabulary_level: "some_technical",
          focus: "solution",
          signals: [],
        },
        scenario: "feature",
        created_at: new Date().toISOString(),
        session_id: "test",
      }

      // #when
      const result = isProfileFresh(profile)

      // #then
      expect(result).toBe(true)
    })

    test("should return false for profile older than 24 hours", () => {
      // #given
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000)
      const profile: StoredProfile = {
        profile: {
          expertise: "expert",
          vocabulary_level: "highly_technical",
          focus: "implementation",
          signals: [],
        },
        scenario: "greenfield",
        created_at: oldDate.toISOString(),
        session_id: "test",
      }

      // #when
      const result = isProfileFresh(profile)

      // #then
      expect(result).toBe(false)
    })
  })
})
