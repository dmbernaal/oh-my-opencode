import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { StoredProfile, UserProfile, ScenarioType } from "./types"

const PROFILE_TTL_MS = 24 * 60 * 60 * 1000

function getSessionDir(directory: string): string {
  return join(directory, ".sisyphus", "session")
}

function getProfilePath(directory: string): string {
  return join(getSessionDir(directory), "user-profile.json")
}

export function isProfileFresh(profile: StoredProfile): boolean {
  const createdAt = new Date(profile.created_at).getTime()
  const now = Date.now()
  return now - createdAt < PROFILE_TTL_MS
}

export function loadUserProfile(directory: string): StoredProfile | null {
  const profilePath = getProfilePath(directory)

  if (!existsSync(profilePath)) {
    return null
  }

  try {
    const content = readFileSync(profilePath, "utf-8")
    const profile = JSON.parse(content) as StoredProfile

    if (!isProfileFresh(profile)) {
      return null
    }

    return profile
  } catch {
    return null
  }
}

export function saveUserProfile(
  directory: string,
  profile: UserProfile,
  scenario: ScenarioType,
  sessionId: string
): boolean {
  const sessionDir = getSessionDir(directory)
  const profilePath = getProfilePath(directory)

  try {
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true })
    }

    const storedProfile: StoredProfile = {
      profile,
      scenario,
      created_at: new Date().toISOString(),
      session_id: sessionId,
    }

    writeFileSync(profilePath, JSON.stringify(storedProfile, null, 2))
    return true
  } catch {
    return false
  }
}
