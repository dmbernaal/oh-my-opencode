import type { Hooks } from "@opencode-ai/plugin"
import { loadUserProfile, saveUserProfile, classifyUserProfile } from "../../features/athena-research"
import { log } from "../../shared/logger"

const HOOK_NAME = "athena-profile-loader"
const ATHENA_AGENTS = ["Athena (Researcher)"]

interface HookInput {
  sessionID?: string
  agent?: string
}

interface HookOutput {
  parts?: Array<{ type: string; text?: string }>
}

function showToast(client: any, title: string, message: string, variant: "info" | "success" = "info"): void {
  const tuiClient = client as any
  if (!tuiClient?.tui?.showToast) return
  
  tuiClient.tui.showToast({
    body: { title, message, variant, duration: variant === "success" ? 2000 : 10000 },
  }).catch(() => {})
}

function dismissToast(client: any): void {
  const tuiClient = client as any
  if (!tuiClient?.tui?.dismissToast) return
  tuiClient.tui.dismissToast().catch(() => {})
}

export function createAthenaProfileLoaderHook(ctx: { directory: string; client?: any }): Hooks {
  const injectedSessions = new Set<string>()

  return {
    "chat.message": async (input: unknown, output: unknown): Promise<void> => {
      const hookInput = input as HookInput
      const hookOutput = output as HookOutput
      const sessionID = hookInput.sessionID
      const agentName = hookInput.agent

      if (!sessionID) {
        return
      }

      if (!agentName || !ATHENA_AGENTS.includes(agentName)) {
        return
      }

      if (injectedSessions.has(sessionID)) {
        return
      }

      const parts = hookOutput.parts
      if (!parts || parts.length === 0) {
        return
      }

      const userMessage = parts
        .filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join("\n")
        .trim()

      if (!userMessage) {
        return
      }

      const storedProfile = loadUserProfile(ctx.directory)

      if (storedProfile) {
        log(`[${HOOK_NAME}] Found existing profile: expertise=${storedProfile.profile.expertise}, scenario=${storedProfile.scenario}`)

        const profileContext = formatExistingProfileContext(storedProfile)

        const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text)
        if (textPartIndex >= 0 && parts[textPartIndex]) {
          parts[textPartIndex].text = `${profileContext}\n\n${parts[textPartIndex].text ?? ""}`
        }

        injectedSessions.add(sessionID)
        return
      }

      log(`[${HOOK_NAME}] No existing profile, running lightweight classifier...`)

      if (!ctx.client) {
        log(`[${HOOK_NAME}] No client available, Athena will classify manually`)
        const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text)
        if (textPartIndex >= 0 && parts[textPartIndex]) {
          parts[textPartIndex].text = `[SYSTEM: No pre-computed profile. Run Phase 1: Profile Assessment manually.]\n\n${parts[textPartIndex].text ?? ""}`
        }
        injectedSessions.add(sessionID)
        return
      }

      showToast(ctx.client, "🔍 Athena", "Analyzing your message to tailor research...")

      try {
        const classification = await classifyUserProfile(userMessage, ctx.client, sessionID)

        dismissToast(ctx.client)

        if (classification) {
          log(`[${HOOK_NAME}] Classification complete: expertise=${classification.profile.expertise}, scenario=${classification.scenario}`)
          showToast(ctx.client, "✓ Profile Ready", `Identified as ${classification.profile.expertise} level`, "success")

          saveUserProfile(ctx.directory, classification.profile, classification.scenario, sessionID)

          const profileContext = formatNewProfileContext(
            classification.profile,
            classification.scenario,
            classification.confidence,
            classification.confidence_reasoning
          )

          const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text)
          if (textPartIndex >= 0 && parts[textPartIndex]) {
            parts[textPartIndex].text = `${profileContext}\n\n${parts[textPartIndex].text ?? ""}`
          }
        } else {
          log(`[${HOOK_NAME}] Classification returned null, Athena will classify manually`)
          const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text)
          if (textPartIndex >= 0 && parts[textPartIndex]) {
            parts[textPartIndex].text = `[SYSTEM: Classification failed. Run Phase 1: Profile Assessment manually.]\n\n${parts[textPartIndex].text ?? ""}`
          }
        }
      } catch (error) {
        dismissToast(ctx.client)
        log(`[${HOOK_NAME}] Classification error:`, error)
        const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text)
        if (textPartIndex >= 0 && parts[textPartIndex]) {
          parts[textPartIndex].text = `[SYSTEM: Classification error. Run Phase 1: Profile Assessment manually.]\n\n${parts[textPartIndex].text ?? ""}`
        }
      }

      injectedSessions.add(sessionID)
    },
  }
}

interface ProfileData {
  expertise: string
  vocabulary_level: string
  focus: string
  signals: string[]
}

interface StoredProfileData {
  profile: ProfileData
  scenario: string
  created_at: string
  session_id: string
}

function formatExistingProfileContext(storedProfile: StoredProfileData): string {
  const { profile, scenario, created_at } = storedProfile

  return `[SYSTEM: User profile loaded from previous session - SKIP Phase 1]

<user_profile source="cached" created="${created_at}">
  expertise: ${profile.expertise}
  vocabulary_level: ${profile.vocabulary_level}
  focus: ${profile.focus}
  scenario: ${scenario}
  signals: ${profile.signals.join(", ")}
</user_profile>

Adapt your communication to ${profile.expertise} level. Proceed with ${scenario} scenario research.`
}

function formatNewProfileContext(
  profile: ProfileData,
  scenario: string,
  confidence: string,
  confidenceReasoning?: string
): string {
  const isLowConfidence = confidence === "low"
  
  if (isLowConfidence) {
    return `[SYSTEM: User profile classified with LOW confidence - Phase 1 verification needed]

<user_profile source="auto-classified" confidence="${confidence}">
  expertise: ${profile.expertise} (uncertain)
  vocabulary_level: ${profile.vocabulary_level}
  focus: ${profile.focus}
  scenario: ${scenario}
  signals: ${profile.signals.join(", ")}
  confidence_reasoning: ${confidenceReasoning || "Insufficient signals in initial message"}
</user_profile>

⚠️ LOW CONFIDENCE CLASSIFICATION - The initial message did not provide enough signals.

REQUIRED: Before proceeding to Phase 2, ask 1-2 brief clarifying questions to verify:
- Is "${profile.expertise}" expertise level accurate?
- Is "${scenario}" the correct scenario?

Keep questions natural and conversational. Example: "Just to make sure I tailor my research correctly - are you fairly new to building apps like this, or do you have experience with similar projects?"

After verification, proceed to Phase 2: Research Planning.`
  }

  const maxQuestions = profile.expertise === "beginner" ? 3 : profile.expertise === "intermediate" ? 2 : 1

  return `[SYSTEM: User profile classified - Phase 1 Profile complete, proceed to Phase 1.5 Gap Analysis]

<user_profile source="auto-classified" confidence="${confidence}">
  expertise: ${profile.expertise}
  vocabulary_level: ${profile.vocabulary_level}
  focus: ${profile.focus}
  scenario: ${scenario}
  signals: ${profile.signals.join(", ")}
</user_profile>

User classified as ${profile.expertise} (${profile.vocabulary_level} vocabulary, ${profile.focus}-focused).
This is a ${scenario} scenario.

## PHASE 1.5: GAP ANALYSIS (MANDATORY BEFORE RESEARCH)

Before proceeding to Phase 2 Research Planning, you MUST:

1. **Analyze the user's message** for these information gaps:
   - Target platform (web/mobile/desktop)?
   - Scope (MVP vs full product)?
   - Scale expectations?
   - Timeline/urgency?
   - Tech preferences or constraints?

2. **Ask 1-${maxQuestions} brief clarifying questions** about the MOST IMPORTANT gaps.
   - Do NOT ask about everything - pick the gaps that would MOST affect research direction
   - Do NOT state assumptions and immediately start research
   - WAIT for user response before proceeding to Phase 2

3. **Adapt question style to ${profile.expertise} level:**
${profile.expertise === "beginner" ? "   - Use plain, friendly language\n   - Explain why you're asking\n   - Give examples of options" : ""}${profile.expertise === "intermediate" ? "   - Use standard technical terms\n   - Be direct but not terse" : ""}${profile.expertise === "expert" ? "   - Be concise and direct\n   - Skip obvious explanations" : ""}

**Example for ${profile.expertise}:**
${profile.expertise === "beginner" ? '"Before I dive into research, a couple quick questions:\\n1. Should this work on phones, computers, or both?\\n2. Are you looking to build a simple first version, or the full thing?"' : ""}${profile.expertise === "intermediate" ? '"Quick questions before research:\\n1. Web app, mobile, or both?\\n2. MVP scope or production-ready?"' : ""}${profile.expertise === "expert" ? '"Platform target? MVP or production scope?"' : ""}

ONLY after receiving answers, proceed to Phase 2: Research Planning.`
}
