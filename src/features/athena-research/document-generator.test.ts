import { describe, test, expect } from "bun:test"
import {
  generateTopicSlug,
  getResearchDocumentPath,
  generateResearchDocument,
  createResearchDocument,
  RESEARCH_OUTPUT_DIR,
} from "./document-generator"
import type { ResearchDocument } from "./types"

describe("generateTopicSlug", () => {
  test("converts topic to lowercase slug", () => {
    // #given
    const topic = "Recipe Sharing App"

    // #when
    const slug = generateTopicSlug(topic)

    // #then
    expect(slug).toBe("recipe-sharing-app")
  })

  test("removes special characters", () => {
    // #given
    const topic = "What's the best framework?"

    // #when
    const slug = generateTopicSlug(topic)

    // #then
    expect(slug).toBe("whats-the-best-framework")
  })

  test("handles multiple spaces", () => {
    // #given
    const topic = "Social   Calculator   App"

    // #when
    const slug = generateTopicSlug(topic)

    // #then
    expect(slug).toBe("social-calculator-app")
  })

  test("truncates long topics to 50 characters", () => {
    // #given
    const topic = "A very long topic name that should be truncated to fifty characters maximum"

    // #when
    const slug = generateTopicSlug(topic)

    // #then
    expect(slug.length).toBeLessThanOrEqual(50)
  })
})

describe("getResearchDocumentPath", () => {
  test("generates correct path with slug", () => {
    // #given
    const topic = "Recipe Sharing App"

    // #when
    const path = getResearchDocumentPath(topic)

    // #then
    expect(path).toBe(`${RESEARCH_OUTPUT_DIR}/recipe-sharing-app-research.md`)
  })
})

describe("createResearchDocument", () => {
  test("creates document with all required fields", () => {
    // #given
    const input = {
      topic: "Recipe Sharing App",
      complexity: "moderate" as const,
      scenario: "greenfield" as const,
      userRequirements: {
        goal: "Build a recipe sharing platform",
        target_users: "Home cooks",
        core_problem: "Finding and sharing recipes",
        platform: "Web",
        scope: "MVP",
      },
      synthesis: {
        findings: [],
        conflicts: [],
        gaps: [],
        overall_confidence: "high" as const,
      },
      recommendedApproach: {
        tech_stack: [{ technology: "Next.js", justification: "Best for SSR" }],
        key_decisions: ["Use PostgreSQL"],
        open_decisions: ["Image storage provider"],
      },
      queriesExecuted: 6,
      sourcesConsulted: 12,
      researchDuration: "4m 32s",
    }

    // #when
    const doc = createResearchDocument(input)

    // #then
    expect(doc.topic).toBe("Recipe Sharing App")
    expect(doc.complexity).toBe("moderate")
    expect(doc.scenario).toBe("greenfield")
    expect(doc.metadata.queries_executed).toBe(6)
    expect(doc.metadata.confidence_level).toBe("high")
  })
})

describe("generateResearchDocument", () => {
  test("generates markdown document with all sections", () => {
    // #given
    const doc: ResearchDocument = {
      topic: "Recipe Sharing App",
      generated_date: "2026-01-12",
      complexity: "moderate",
      scenario: "greenfield",
      user_requirements: {
        goal: "Build a recipe sharing platform where users can share and discover recipes",
        target_users: "Home cooks and food enthusiasts",
        core_problem: "Finding and organizing recipes is difficult",
        platform: "Web",
        scope: "MVP",
        constraints: ["3 month timeline", "Small team"],
      },
      synthesis: {
        findings: [
          {
            category: "architecture",
            consensus: "high",
            source_count: 3,
            recommendation: "Use Next.js with App Router",
            reasoning: "Based on 3 findings from 3 sources",
          },
        ],
        conflicts: [],
        gaps: [],
        overall_confidence: "high",
      },
      similar_implementations: [
        {
          name: "Paprika",
          description: "Popular recipe manager",
          url: "https://paprikaapp.com",
          relevance: "UI patterns for recipe display",
        },
      ],
      recommended_approach: {
        tech_stack: [
          { technology: "Next.js 14", justification: "Best for SSR and SEO" },
          { technology: "PostgreSQL", justification: "Relational data fits recipe model" },
        ],
        architecture_pattern: {
          pattern: "Monolith",
          justification: "Simpler for MVP, can split later",
        },
        key_decisions: ["Use NextAuth for authentication", "Cloudinary for images"],
        open_decisions: ["Recipe import format", "Social features scope"],
      },
      metadata: {
        queries_executed: 6,
        sources_consulted: 12,
        research_duration: "4m 32s",
        confidence_level: "high",
      },
    }

    // #when
    const markdown = generateResearchDocument(doc)

    // #then
    expect(markdown).toContain("# Research: Recipe Sharing App")
    expect(markdown).toContain("**Generated:** 2026-01-12")
    expect(markdown).toContain("**Complexity:** Moderate")
    expect(markdown).toContain("**Scenario:** Greenfield")
    expect(markdown).toContain("## Goal")
    expect(markdown).toContain("## User Requirements")
    expect(markdown).toContain("## Research Findings")
    expect(markdown).toContain("## Similar Implementations Found")
    expect(markdown).toContain("## Conflicting Information")
    expect(markdown).toContain("## Research Gaps")
    expect(markdown).toContain("## Recommended Approach")
    expect(markdown).toContain("## Next Steps")
    expect(markdown).toContain("Switch to **Prometheus**")
    expect(markdown).toContain("## Research Metadata")
    expect(markdown).toContain("**Queries Executed:** 6")
  })

  test("formats findings with consensus indicators", () => {
    // #given
    const doc: ResearchDocument = {
      topic: "Test",
      generated_date: "2026-01-12",
      complexity: "simple",
      scenario: "feature",
      user_requirements: {
        goal: "Test",
        target_users: "Test",
        core_problem: "Test",
        platform: "Web",
        scope: "MVP",
      },
      synthesis: {
        findings: [
          {
            category: "architecture",
            consensus: "high",
            source_count: 4,
            recommendation: "Use microservices",
            reasoning: "Multiple sources agree",
            caveats: ["Requires DevOps expertise"],
          },
          {
            category: "security",
            consensus: "moderate",
            source_count: 2,
            recommendation: "Use OAuth 2.0",
            reasoning: "Industry standard",
          },
          {
            category: "performance",
            consensus: "none",
            source_count: 3,
            recommendation: "Consider caching",
            reasoning: "Conflicting opinions",
          },
        ],
        conflicts: [],
        gaps: [],
        overall_confidence: "medium",
      },
      similar_implementations: [],
      recommended_approach: {
        tech_stack: [],
        key_decisions: [],
        open_decisions: [],
      },
      metadata: {
        queries_executed: 5,
        sources_consulted: 9,
        research_duration: "3m",
        confidence_level: "medium",
      },
    }

    // #when
    const markdown = generateResearchDocument(doc)

    // #then
    expect(markdown).toContain("✓ High consensus")
    expect(markdown).toContain("~ Moderate consensus")
    expect(markdown).toContain("? No consensus")
    expect(markdown).toContain("**Caveats:**")
    expect(markdown).toContain("Requires DevOps expertise")
  })

  test("formats conflicts with positions and decision factors", () => {
    // #given
    const doc: ResearchDocument = {
      topic: "Test",
      generated_date: "2026-01-12",
      complexity: "complex",
      scenario: "tech_decision",
      user_requirements: {
        goal: "Test",
        target_users: "Test",
        core_problem: "Test",
        platform: "Web",
        scope: "Production",
      },
      synthesis: {
        findings: [],
        conflicts: [
          {
            topic: "Database Choice",
            position_a: {
              description: "Use PostgreSQL for ACID compliance",
              sources: ["q1", "q3"],
            },
            position_b: {
              description: "Use MongoDB for flexible schema",
              sources: ["q2"],
            },
            decision_factors: ["Data structure", "Query patterns", "Scale requirements"],
          },
        ],
        gaps: [],
        overall_confidence: "medium",
      },
      similar_implementations: [],
      recommended_approach: {
        tech_stack: [],
        key_decisions: [],
        open_decisions: [],
      },
      metadata: {
        queries_executed: 4,
        sources_consulted: 8,
        research_duration: "5m",
        confidence_level: "medium",
      },
    }

    // #when
    const markdown = generateResearchDocument(doc)

    // #then
    expect(markdown).toContain("### Database Choice")
    expect(markdown).toContain("**Position A:** Use PostgreSQL")
    expect(markdown).toContain("**Position B:** Use MongoDB")
    expect(markdown).toContain("(Sources: q1, q3)")
    expect(markdown).toContain("**Decision Factors:**")
  })

  test("formats gaps with required actions", () => {
    // #given
    const doc: ResearchDocument = {
      topic: "Test",
      generated_date: "2026-01-12",
      complexity: "moderate",
      scenario: "exploration",
      user_requirements: {
        goal: "Test",
        target_users: "Test",
        core_problem: "Test",
        platform: "Mobile",
        scope: "MVP",
      },
      synthesis: {
        findings: [],
        conflicts: [],
        gaps: [
          {
            topic: "Performance benchmarks",
            impact: "Cannot estimate infrastructure costs",
            requires: "experimentation",
          },
          {
            topic: "User research",
            impact: "May miss key use cases",
            requires: "user_input",
          },
        ],
        overall_confidence: "low",
      },
      similar_implementations: [],
      recommended_approach: {
        tech_stack: [],
        key_decisions: [],
        open_decisions: [],
      },
      metadata: {
        queries_executed: 3,
        sources_consulted: 5,
        research_duration: "2m",
        confidence_level: "low",
      },
    }

    // #when
    const markdown = generateResearchDocument(doc)

    // #then
    expect(markdown).toContain("**Performance benchmarks:**")
    expect(markdown).toContain("Requires: experimentation")
    expect(markdown).toContain("**User research:**")
    expect(markdown).toContain("Requires: user input")
  })

  test("handles empty similar implementations gracefully", () => {
    // #given
    const doc: ResearchDocument = {
      topic: "Test",
      generated_date: "2026-01-12",
      complexity: "simple",
      scenario: "feature",
      user_requirements: {
        goal: "Test",
        target_users: "Test",
        core_problem: "Test",
        platform: "Web",
        scope: "MVP",
      },
      synthesis: {
        findings: [],
        conflicts: [],
        gaps: [],
        overall_confidence: "high",
      },
      similar_implementations: [],
      recommended_approach: {
        tech_stack: [],
        key_decisions: [],
        open_decisions: [],
      },
      metadata: {
        queries_executed: 2,
        sources_consulted: 4,
        research_duration: "1m",
        confidence_level: "high",
      },
    }

    // #when
    const markdown = generateResearchDocument(doc)

    // #then
    expect(markdown).toContain("## Similar Implementations Found")
    expect(markdown).toContain("_No similar implementations identified._")
  })
})
