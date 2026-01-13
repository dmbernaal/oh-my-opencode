import { existsSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import type { Hooks } from "@opencode-ai/plugin"
import { log } from "../../shared/logger"
import { loadUserProfile } from "../../features/athena-research"
import type { StoredProfile, ExpertiseLevel } from "../../features/athena-research"
import { parseResearchDocument } from "./parser"
import type { ResearchDocument } from "./types"

const HOOK_NAME = "prometheus-research-loader"
const PROMETHEUS_AGENTS = ["Prometheus (Planner)"]
const RESEARCH_DIR = ".sisyphus/research"

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

function findResearchDocuments(directory: string): string[] {
  const researchPath = join(directory, RESEARCH_DIR)
  
  if (!existsSync(researchPath)) {
    return []
  }

  try {
    const files = readdirSync(researchPath)
    return files
      .filter(file => file.endsWith('.md'))
      .map(file => join(researchPath, file))
      .filter(filePath => {
        try {
          return statSync(filePath).isFile()
        } catch {
          return false
        }
      })
  } catch (error) {
    log(`[${HOOK_NAME}] Error reading research directory:`, error)
    return []
  }
}

function formatProfileContext(profile: StoredProfile): string {
  const { expertise, vocabulary_level, focus } = profile.profile
  const { scenario } = profile
  
  const adaptations = getExpertiseAdaptations(expertise)
  
  return `<user_profile source="cached" created="${profile.created_at}">
  expertise: ${expertise}
  vocabulary_level: ${vocabulary_level}
  focus: ${focus}
  scenario: ${scenario}
</user_profile>

## Adaptive Questioning Guidelines

User is classified as **${expertise}** level. Adapt your questions accordingly:

${formatQuestioningStyle(expertise)}

**Question Limits**: Ask at most ${adaptations.maxQuestions} clarifying questions.
**Vocabulary**: Use ${adaptations.vocabulary} language.
**Explanations**: Provide ${adaptations.explanationLevel} explanations.
**Options**: Present options ${adaptations.optionsStyle}.
`
}

function getExpertiseAdaptations(expertise: ExpertiseLevel): {
  maxQuestions: number
  vocabulary: string
  explanationLevel: string
  optionsStyle: string
} {
  switch (expertise) {
    case "beginner":
      return {
        maxQuestions: 4,
        vocabulary: "plain, non-technical",
        explanationLevel: "detailed with context",
        optionsStyle: "as curated recommendations with your suggestion highlighted"
      }
    case "intermediate":
      return {
        maxQuestions: 3,
        vocabulary: "standard technical terms",
        explanationLevel: "standard with key tradeoffs",
        optionsStyle: "with clear tradeoffs"
      }
    case "expert":
      return {
        maxQuestions: 2,
        vocabulary: "technical/jargon-friendly",
        explanationLevel: "concise, skip basics",
        optionsStyle: "as full landscape with technical details"
      }
  }
}

function formatQuestioningStyle(expertise: ExpertiseLevel): string {
  switch (expertise) {
    case "beginner":
      return `**Style for Beginners**:
- Use simple, everyday language (avoid "queue system", "polling", "serverless")
- Explain WHY each question matters
- Provide 2-3 curated options with your recommendation
- Use analogies when helpful
- Example: "How should the app remember calculations? Option A (simpler) vs Option B (more flexible)"
- DO NOT overwhelm with technical choices - make recommendations instead`
    case "intermediate":
      return `**Style for Intermediate Users**:
- Use standard technical terms, explain advanced ones briefly
- Focus on tradeoffs that matter for their project
- Provide options with pros/cons
- Example: "For real-time updates: polling (simpler, less infrastructure) vs WebSockets (instant, more complex)?"`
    case "expert":
      return `**Style for Expert Users**:
- Use technical language freely
- Be concise and direct
- Present full technical landscape
- Skip basic explanations
- Example: "BullMQ+Redis vs PostgreSQL SKIP LOCKED for job queue?"`
  }
}

function formatResearchContext(research: ResearchDocument, profile: StoredProfile | null): string {
  const profileSection = profile ? formatProfileContext(profile) : ""
  
  return `[SYSTEM: Research document loaded - Use this as foundation for planning]

${profileSection}
<research_document source="${research.metadata.filename}" created="${research.metadata.created_at}">
  <goal>${research.goal}</goal>
  
  <requirements>
${research.requirements.map((req: string) => `    - ${req}`).join('\n')}
  </requirements>
  
  <findings>
${research.findings.map((finding: { category: string; summary: string }) => `    ${finding.category}: ${finding.summary}`).join('\n')}
  </findings>
  
  <recommendations>
${research.recommendations.map((rec: string) => `    - ${rec}`).join('\n')}
  </recommendations>
  
  ${research.gaps.length > 0 ? `<gaps>
${research.gaps.map((gap: string) => `    - ${gap}`).join('\n')}
  </gaps>` : ''}
</research_document>

## Phase 0: Research Consumption (COMPLETED)

Research has been conducted by Athena. Your task is to:
1. **Consume the research findings** above
2. **Ask about gaps** using the questioning style above (adapt to user's expertise level)
3. **Generate the three documents**:
   - PRD (Product Requirements Document)
   - Architecture (System Design)
   - Tasks (Task Breakdown)

Do NOT conduct deep research yourself. Use explore/librarian ONLY for codebase exploration, not research.`
}

function formatNoResearchContext(profile: StoredProfile | null): string {
  const profileSection = profile ? formatProfileContext(profile) : ""
  
  return `[SYSTEM: No research documents found - Standalone planning mode]

${profileSection}
## Phase 0: Research Detection (COMPLETED)

No research documents found in .sisyphus/research/. Operating in standalone mode.

You may proceed with:
1. **Interview the user** to understand requirements (use questioning style above if profile exists)
2. **Generate the three documents** directly:
   - PRD (Product Requirements Document)
   - Architecture (System Design)
   - Tasks (Task Breakdown)

Use explore/librarian for codebase exploration as needed.`
}

async function selectResearchDocument(
  client: any,
  documents: string[]
): Promise<string | null> {
  if (documents.length === 0) return null
  if (documents.length === 1) return documents[0]
  
  const sorted = documents.sort((a, b) => {
    try {
      const statA = statSync(a)
      const statB = statSync(b)
      return statB.mtimeMs - statA.mtimeMs
    } catch {
      return 0
    }
  })
  
  return sorted[0]
}

export function createPrometheusResearchLoaderHook(ctx: { directory: string; client?: any }): Hooks {
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

      if (!agentName || !PROMETHEUS_AGENTS.includes(agentName)) {
        return
      }

      if (injectedSessions.has(sessionID)) {
        return
      }

      const parts = hookOutput.parts
      if (!parts || parts.length === 0) {
        return
      }

      log(`[${HOOK_NAME}] Checking for research documents and user profile...`)

      const userProfile = loadUserProfile(ctx.directory)
      if (userProfile) {
        log(`[${HOOK_NAME}] Found user profile: expertise=${userProfile.profile.expertise}, scenario=${userProfile.scenario}`)
      } else {
        log(`[${HOOK_NAME}] No user profile found - using default questioning style`)
      }

      const researchDocs = findResearchDocuments(ctx.directory)

      if (researchDocs.length === 0) {
        log(`[${HOOK_NAME}] No research documents found, proceeding in standalone mode`)
        
        const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text)
        if (textPartIndex >= 0 && parts[textPartIndex]) {
          parts[textPartIndex].text = `${formatNoResearchContext(userProfile)}\n\n${parts[textPartIndex].text ?? ""}`
        }
        
        injectedSessions.add(sessionID)
        return
      }

      if (researchDocs.length > 1) {
        log(`[${HOOK_NAME}] Found ${researchDocs.length} research documents`)
        if (ctx.client) {
          showToast(
            ctx.client,
            "📚 Multiple Research Docs",
            `Found ${researchDocs.length} research documents. Using most recent.`,
            "info"
          )
        }
      }

      const selectedDoc = await selectResearchDocument(ctx.client, researchDocs)
      
      if (!selectedDoc) {
        log(`[${HOOK_NAME}] No research document selected`)
        const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text)
        if (textPartIndex >= 0 && parts[textPartIndex]) {
          parts[textPartIndex].text = `${formatNoResearchContext(userProfile)}\n\n${parts[textPartIndex].text ?? ""}`
        }
        injectedSessions.add(sessionID)
        return
      }

      log(`[${HOOK_NAME}] Loading research document: ${selectedDoc}`)

      try {
        const research = parseResearchDocument(selectedDoc)
        
        if (ctx.client) {
          dismissToast(ctx.client)
          const profileMsg = userProfile ? ` (${userProfile.profile.expertise} mode)` : ""
          showToast(
            ctx.client,
            "✓ Research Loaded",
            `Using research: ${research.metadata.filename}${profileMsg}`,
            "success"
          )
        }

        const researchContext = formatResearchContext(research, userProfile)

        const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text)
        if (textPartIndex >= 0 && parts[textPartIndex]) {
          parts[textPartIndex].text = `${researchContext}\n\n${parts[textPartIndex].text ?? ""}`
        }

        log(`[${HOOK_NAME}] Research context injected successfully`)
      } catch (error) {
        log(`[${HOOK_NAME}] Error parsing research document:`, error)
        
        if (ctx.client) {
          dismissToast(ctx.client)
          showToast(
            ctx.client,
            "⚠️ Research Parse Error",
            "Failed to parse research document. Proceeding without research.",
            "info"
          )
        }

        const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text)
        if (textPartIndex >= 0 && parts[textPartIndex]) {
          parts[textPartIndex].text = `${formatNoResearchContext(userProfile)}\n\n${parts[textPartIndex].text ?? ""}`
        }
      }

      injectedSessions.add(sessionID)
    },
  }
}
