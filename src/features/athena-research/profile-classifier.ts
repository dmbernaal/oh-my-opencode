import type { UserProfile, ScenarioType } from "./types"
import { log } from "../../shared/logger"

const CLASSIFIER_AGENT = "multimodal-looker"
const CLASSIFIER_MODEL = { providerID: "opencode", modelID: "glm-4.7-free" }

export type ConfidenceLevel = "high" | "medium" | "low"

export interface ClassificationResult {
  profile: UserProfile
  scenario: ScenarioType
  /** Confidence in the classification - if low, Athena should ask clarifying questions */
  confidence: ConfidenceLevel
  /** Reasoning for the confidence level */
  confidence_reasoning?: string
}

export async function classifyUserProfile(
  userMessage: string,
  client: any,
  parentSessionID: string
): Promise<ClassificationResult | null> {
  if (!client || !parentSessionID) {
    log("[Profile Classifier] No client or session, cannot classify")
    return null
  }

  try {
    const result = await performClassification(userMessage, client, parentSessionID)
    return result
  } catch (error) {
    log("[Profile Classifier] Classification failed:", error)
    return null
  }
}

async function performClassification(
  userMessage: string,
  client: any,
  parentSessionID: string
): Promise<ClassificationResult> {
  const prompt = buildClassificationPrompt(userMessage)

  log(`[Profile Classifier] Creating classification session with parent: ${parentSessionID}`)
  const createResult = await client.session.create({
    body: {
      parentID: parentSessionID,
      title: `Profile Classification`,
    },
  })

  if (createResult.error) {
    log(`[Profile Classifier] Session create error:`, createResult.error)
    throw new Error(`Failed to create session: ${createResult.error}`)
  }

  const sessionID = createResult.data.id
  log(`[Profile Classifier] Created session: ${sessionID}`)

  try {
    const promptResult = await client.session.prompt({
      path: { id: sessionID },
      body: {
        agent: CLASSIFIER_AGENT,
        model: CLASSIFIER_MODEL,
        tools: {
          task: false,
          call_omo_agent: false,
          write: false,
          edit: false,
          bash: false,
          read: false,
          glob: false,
          grep: false,
        },
        parts: [{ type: "text", text: prompt }],
      },
    })

    if (promptResult.error) {
      log(`[Profile Classifier] Prompt error:`, promptResult.error)
      throw new Error(`Failed to send prompt: ${promptResult.error}`)
    }

    log(`[Profile Classifier] Prompt sent successfully, fetching response...`)
  } catch (promptError) {
    log(`[Profile Classifier] Prompt exception:`, promptError)
    throw promptError
  }

  const messagesResult = await client.session.messages({
    path: { id: sessionID },
  })

  if (messagesResult.error) {
    log(`[Profile Classifier] Messages error:`, messagesResult.error)
    throw new Error(`Failed to get messages: ${messagesResult.error}`)
  }

  const messages = messagesResult.data
  log(`[Profile Classifier] Got ${messages.length} messages`)

  const lastAssistantMessage = messages
    .filter((m: any) => m.info.role === "assistant")
    .sort((a: any, b: any) => (b.info.time?.created || 0) - (a.info.time?.created || 0))[0]

  if (!lastAssistantMessage) {
    log(`[Profile Classifier] No assistant message found`)
    throw new Error("No response from classifier")
  }

  const textParts = lastAssistantMessage.parts.filter((p: any) => p.type === "text")
  const responseText = textParts.map((p: any) => p.text).join("\n")

  log(`[Profile Classifier] Got response, length: ${responseText.length}`)

  return parseClassificationResponse(responseText)
}

function buildClassificationPrompt(userMessage: string): string {
  return `You are a user expertise classifier. Analyze this user's message and classify them.

USER MESSAGE:
"${userMessage}"

CLASSIFICATION CRITERIA:

**Expertise Level:**
- beginner: No technical terms, describes features in user-facing language, asks broad questions, expresses uncertainty
- intermediate: Some technical terms used correctly, mentions general technologies (database, API, mobile app), has opinions but seeks validation
- expert: Specific technical terms used correctly (framework names, architectural patterns), states clear preferences with reasoning, asks about edge cases

**Vocabulary Level:**
- plain: No technical jargon at all
- some_technical: Mix of plain language and general tech terms
- highly_technical: Heavy use of specific technical terminology

**Focus:**
- problem: Thinking about WHAT to solve (user-facing)
- solution: Thinking about HOW to solve (general approach)
- implementation: Thinking about specific TECH to use

**Scenario:**
- greenfield: Starting from scratch ("build", "create", "new project")
- feature: Adding to existing app ("add to my app", "implement", "integrate")
- exploration: Vague idea, not sure what to build ("thinking about", "is it possible")
- tech_decision: Needs help choosing between options ("should I use X or Y", "comparing")

**Confidence:**
- high: Clear signals in message, strong indicators for classification
- medium: Some signals but could interpret differently
- low: Very short message, ambiguous, or conflicting signals (e.g., expert vocabulary but beginner-style questions)

Return ONLY valid JSON with no markdown or explanation:
{
  "expertise": "beginner" | "intermediate" | "expert",
  "vocabulary_level": "plain" | "some_technical" | "highly_technical",
  "focus": "problem" | "solution" | "implementation",
  "signals": ["reason1", "reason2", "reason3"],
  "scenario": "greenfield" | "feature" | "exploration" | "tech_decision",
  "confidence": "high" | "medium" | "low",
  "confidence_reasoning": "brief explanation of confidence level"
}`
}

function parseClassificationResponse(responseText: string): ClassificationResult {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    log("[Profile Classifier] No JSON found in response, using defaults")
    return createDefaultClassification()
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])

    const validExpertise = ["beginner", "intermediate", "expert"]
    const validVocabulary = ["plain", "some_technical", "highly_technical"]
    const validFocus = ["problem", "solution", "implementation"]
    const validScenario = ["greenfield", "feature", "exploration", "tech_decision"]
    const validConfidence = ["high", "medium", "low"]

    const profile: UserProfile = {
      expertise: validExpertise.includes(parsed.expertise) ? parsed.expertise : "intermediate",
      vocabulary_level: validVocabulary.includes(parsed.vocabulary_level) ? parsed.vocabulary_level : "some_technical",
      focus: validFocus.includes(parsed.focus) ? parsed.focus : "solution",
      signals: Array.isArray(parsed.signals) ? parsed.signals.slice(0, 5) : [],
    }

    const scenario: ScenarioType = validScenario.includes(parsed.scenario) ? parsed.scenario : "greenfield"
    const confidence: ConfidenceLevel = validConfidence.includes(parsed.confidence) ? parsed.confidence : "medium"
    const confidence_reasoning = typeof parsed.confidence_reasoning === "string" ? parsed.confidence_reasoning : undefined

    log("[Profile Classifier] Classification result:", { expertise: profile.expertise, scenario, confidence })

    return { profile, scenario, confidence, confidence_reasoning }
  } catch (parseError) {
    log("[Profile Classifier] JSON parse error:", parseError)
    return createDefaultClassification()
  }
}

function createDefaultClassification(): ClassificationResult {
  return {
    profile: {
      expertise: "intermediate",
      vocabulary_level: "some_technical",
      focus: "solution",
      signals: ["Unable to classify, using defaults"],
    },
    scenario: "greenfield",
    confidence: "low",
    confidence_reasoning: "Classification failed or timed out",
  }
}
