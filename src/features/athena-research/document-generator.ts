import type {
  ResearchDocument,
  ResearchSynthesis,
  UserRequirements,
  SimilarImplementation,
  RecommendedApproach,
  ResearchMetadata,
  ComplexityLevel,
  ScenarioType,
  SynthesizedFinding,
  ResearchConflict,
  ResearchGap,
} from "./types"

const RESEARCH_OUTPUT_DIR = ".sisyphus/research"

export function generateTopicSlug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50)
}

export function getResearchDocumentPath(topic: string): string {
  const slug = generateTopicSlug(topic)
  return `${RESEARCH_OUTPUT_DIR}/${slug}-research.md`
}

function formatDate(): string {
  return new Date().toISOString().split("T")[0]
}

function formatUserRequirements(req: UserRequirements): string {
  const lines = [
    "## User Requirements",
    "",
    req.goal,
    "",
    `- **Target users:** ${req.target_users}`,
    `- **Core problem:** ${req.core_problem}`,
    `- **Platform:** ${req.platform}`,
    `- **Scope:** ${req.scope}`,
  ]

  if (req.constraints && req.constraints.length > 0) {
    lines.push(`- **Constraints:** ${req.constraints.join(", ")}`)
  }

  return lines.join("\n")
}

function formatFinding(finding: SynthesizedFinding): string {
  const consensusLabel = finding.consensus === "high" 
    ? "✓ High consensus" 
    : finding.consensus === "moderate" 
      ? "~ Moderate consensus" 
      : "? No consensus"

  const lines = [
    `### ${finding.category.charAt(0).toUpperCase() + finding.category.slice(1)}`,
    "",
    `**${consensusLabel}** (${finding.source_count} sources)`,
    "",
    `**Recommendation:** ${finding.recommendation}`,
    "",
    `_${finding.reasoning}_`,
  ]

  if (finding.caveats && finding.caveats.length > 0) {
    lines.push("")
    lines.push(`**Caveats:**`)
    for (const caveat of finding.caveats) {
      lines.push(`- ${caveat}`)
    }
  }

  return lines.join("\n")
}

function formatResearchFindings(findings: SynthesizedFinding[]): string {
  if (findings.length === 0) {
    return "## Research Findings\n\n_No findings available._"
  }

  const lines = ["## Research Findings", ""]

  for (const finding of findings) {
    lines.push(formatFinding(finding))
    lines.push("")
  }

  return lines.join("\n")
}

function formatSimilarImplementations(implementations: SimilarImplementation[]): string {
  if (implementations.length === 0) {
    return "## Similar Implementations Found\n\n_No similar implementations identified._"
  }

  const lines = ["## Similar Implementations Found", ""]

  for (let i = 0; i < implementations.length; i++) {
    const impl = implementations[i]
    lines.push(`${i + 1}. **${impl.name}** - ${impl.description}`)
    lines.push(`   - Link: ${impl.url}`)
    lines.push(`   - Relevance: ${impl.relevance}`)
    lines.push("")
  }

  return lines.join("\n")
}

function formatConflicts(conflicts: ResearchConflict[]): string {
  if (conflicts.length === 0) {
    return "## Conflicting Information\n\n_No significant conflicts identified._"
  }

  const lines = ["## Conflicting Information", ""]

  for (const conflict of conflicts) {
    lines.push(`### ${conflict.topic}`)
    lines.push("")
    lines.push(`- **Position A:** ${conflict.position_a.description} (Sources: ${conflict.position_a.sources.join(", ")})`)
    lines.push(`- **Position B:** ${conflict.position_b.description} (Sources: ${conflict.position_b.sources.join(", ")})`)
    lines.push(`- **Decision Factors:** ${conflict.decision_factors.join(", ")}`)
    lines.push("")
  }

  return lines.join("\n")
}

function formatGaps(gaps: ResearchGap[]): string {
  if (gaps.length === 0) {
    return "## Research Gaps\n\n_No significant gaps identified._"
  }

  const lines = ["## Research Gaps", ""]

  for (const gap of gaps) {
    lines.push(`- **${gap.topic}:** ${gap.impact}`)
    lines.push(`  - Requires: ${gap.requires.replace(/_/g, " ")}`)
  }

  return lines.join("\n")
}

function formatRecommendedApproach(approach: RecommendedApproach): string {
  const lines = ["## Recommended Approach", ""]

  if (approach.tech_stack.length > 0) {
    lines.push("### Technology Stack")
    lines.push("")
    for (const tech of approach.tech_stack) {
      lines.push(`- **${tech.technology}:** ${tech.justification}`)
    }
    lines.push("")
  }

  if (approach.architecture_pattern) {
    lines.push("### Architecture Pattern")
    lines.push("")
    lines.push(`**${approach.architecture_pattern.pattern}:** ${approach.architecture_pattern.justification}`)
    lines.push("")
  }

  if (approach.key_decisions.length > 0) {
    lines.push("### Key Decisions Made")
    lines.push("")
    for (const decision of approach.key_decisions) {
      lines.push(`- ${decision}`)
    }
    lines.push("")
  }

  if (approach.open_decisions.length > 0) {
    lines.push("### Open Decisions")
    lines.push("")
    for (const decision of approach.open_decisions) {
      lines.push(`- ${decision}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

function formatNextSteps(): string {
  return `## Next Steps

1. Review this research document
2. Provide input on open decisions (if any)
3. Switch to **Prometheus** agent to begin planning phase
4. Prometheus will use this research to create PRD and architecture docs`
}

function formatMetadata(metadata: ResearchMetadata): string {
  return `## Research Metadata

- **Queries Executed:** ${metadata.queries_executed}
- **Sources Consulted:** ${metadata.sources_consulted}
- **Research Duration:** ${metadata.research_duration}
- **Confidence Level:** ${metadata.confidence_level.charAt(0).toUpperCase() + metadata.confidence_level.slice(1)}`
}

function formatComplexity(complexity: ComplexityLevel): string {
  return complexity.charAt(0).toUpperCase() + complexity.slice(1)
}

function formatScenario(scenario: ScenarioType): string {
  const scenarioLabels: Record<ScenarioType, string> = {
    greenfield: "Greenfield",
    feature: "Feature",
    exploration: "Exploration",
    tech_decision: "Tech Decision",
  }
  return scenarioLabels[scenario]
}

export function generateResearchDocument(doc: ResearchDocument): string {
  const sections = [
    `# Research: ${doc.topic}`,
    "",
    `**Generated:** ${doc.generated_date}`,
    `**Complexity:** ${formatComplexity(doc.complexity)}`,
    `**Scenario:** ${formatScenario(doc.scenario)}`,
    "",
    "---",
    "",
    "## Goal",
    "",
    doc.user_requirements.goal,
    "",
    formatUserRequirements(doc.user_requirements),
    "",
    "---",
    "",
    formatResearchFindings(doc.synthesis.findings),
    "---",
    "",
    formatSimilarImplementations(doc.similar_implementations),
    "---",
    "",
    formatConflicts(doc.synthesis.conflicts),
    "---",
    "",
    formatGaps(doc.synthesis.gaps),
    "---",
    "",
    formatRecommendedApproach(doc.recommended_approach),
    "---",
    "",
    formatNextSteps(),
    "",
    "---",
    "",
    formatMetadata(doc.metadata),
  ]

  return sections.join("\n")
}

export interface CreateResearchDocumentInput {
  topic: string
  complexity: ComplexityLevel
  scenario: ScenarioType
  userRequirements: UserRequirements
  synthesis: ResearchSynthesis
  similarImplementations?: SimilarImplementation[]
  recommendedApproach: RecommendedApproach
  queriesExecuted: number
  sourcesConsulted: number
  researchDuration: string
}

export function createResearchDocument(input: CreateResearchDocumentInput): ResearchDocument {
  return {
    topic: input.topic,
    generated_date: formatDate(),
    complexity: input.complexity,
    scenario: input.scenario,
    user_requirements: input.userRequirements,
    synthesis: input.synthesis,
    similar_implementations: input.similarImplementations || [],
    recommended_approach: input.recommendedApproach,
    metadata: {
      queries_executed: input.queriesExecuted,
      sources_consulted: input.sourcesConsulted,
      research_duration: input.researchDuration,
      confidence_level: input.synthesis.overall_confidence,
    },
  }
}

export { RESEARCH_OUTPUT_DIR }
