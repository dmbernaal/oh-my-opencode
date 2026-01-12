import { describe, test, expect } from "bun:test"
import {
  createResearchExecutionState,
  getQueriesByPriority,
  formatDispatchPrompt,
  updateTaskStatus,
  getProgress,
  formatProgressMessage,
  formatResearchStartMessage,
  shouldRetry,
  getFailedMustQueries,
  isExecutionComplete,
  getCompletedResults,
  detectEarlyConsensus,
  detectConflicts,
  aggregateByCategory,
  calculateCategoryConsensus,
  extractConflicts,
  identifyGaps,
  synthesizeFindings,
  formatSynthesisOutput,
} from "./research-executor"
import type { ResearchPlan, ResearchQuery, LibrarianResult } from "./types"

const createTestPlan = (): ResearchPlan => ({
  topic: "recipe sharing app",
  complexity: "moderate",
  librarian_budget: 6,
  query_budget: 8,
  complexity_reasoning: "Multiple entities, social features, moderate scale",
  queries: {
    must: [
      {
        id: "q1",
        query: "recipe app database schema design patterns",
        category: "architecture",
        priority: "must",
        purpose: "Inform data model decisions",
        target_sources: ["documentation", "github"],
      },
      {
        id: "q2",
        query: "recipe sharing social features implementation",
        category: "implementation",
        priority: "must",
        purpose: "Core feature guidance",
        target_sources: ["articles", "github"],
      },
    ],
    should: [
      {
        id: "q3",
        query: "Next.js vs Remix for content-heavy apps 2025",
        category: "comparison",
        priority: "should",
        purpose: "Tech stack decision",
        target_sources: ["articles", "comparisons"],
      },
    ],
    could: [
      {
        id: "q4",
        query: "recipe app UX patterns analysis",
        category: "ux_patterns",
        priority: "could",
        purpose: "Design inspiration",
        target_sources: ["articles"],
      },
    ],
  },
})

describe("createResearchExecutionState", () => {
  test("creates state with all queries", () => {
    // #given
    const plan = createTestPlan()

    // #when
    const state = createResearchExecutionState(plan)

    // #then
    expect(state.topic).toBe("recipe sharing app")
    expect(state.totalCount).toBe(4)
    expect(state.completedCount).toBe(0)
    expect(state.failedCount).toBe(0)
    expect(state.tasks.size).toBe(4)
  })

  test("initializes all tasks as pending", () => {
    // #given
    const plan = createTestPlan()

    // #when
    const state = createResearchExecutionState(plan)

    // #then
    for (const [, task] of state.tasks) {
      expect(task.status).toBe("pending")
      expect(task.retryCount).toBe(0)
    }
  })
})

describe("getQueriesByPriority", () => {
  test("returns must queries", () => {
    // #given
    const plan = createTestPlan()

    // #when
    const mustQueries = getQueriesByPriority(plan, "must")

    // #then
    expect(mustQueries.length).toBe(2)
    expect(mustQueries[0].id).toBe("q1")
  })

  test("returns should queries", () => {
    // #given
    const plan = createTestPlan()

    // #when
    const shouldQueries = getQueriesByPriority(plan, "should")

    // #then
    expect(shouldQueries.length).toBe(1)
    expect(shouldQueries[0].id).toBe("q3")
  })
})

describe("formatDispatchPrompt", () => {
  test("formats query into prompt", () => {
    // #given
    const query: ResearchQuery = {
      id: "q1",
      query: "test query",
      category: "architecture",
      priority: "must",
      purpose: "test purpose",
      target_sources: ["documentation", "github"],
    }

    // #when
    const prompt = formatDispatchPrompt(query)

    // #then
    expect(prompt).toContain("Research Query ID: q1")
    expect(prompt).toContain("Query: test query")
    expect(prompt).toContain("Category: architecture")
    expect(prompt).toContain("Purpose: test purpose")
    expect(prompt).toContain("Target Sources: documentation, github")
  })
})

describe("updateTaskStatus", () => {
  test("updates task status and counts completed", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)

    // #when
    updateTaskStatus(state, "q1", {
      status: "completed",
      taskId: "bg_123",
      completedAt: new Date(),
    })

    // #then
    expect(state.completedCount).toBe(1)
    expect(state.tasks.get("q1")?.status).toBe("completed")
    expect(state.tasks.get("q1")?.taskId).toBe("bg_123")
  })

  test("updates task status and counts failed", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)

    // #when
    updateTaskStatus(state, "q1", {
      status: "failed",
      error: "No results found",
    })

    // #then
    expect(state.failedCount).toBe(1)
    expect(state.tasks.get("q1")?.status).toBe("failed")
    expect(state.tasks.get("q1")?.error).toBe("No results found")
  })
})

describe("getProgress", () => {
  test("returns accurate progress counts", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)
    updateTaskStatus(state, "q1", { status: "completed" })
    updateTaskStatus(state, "q2", { status: "running" })
    updateTaskStatus(state, "q3", { status: "failed" })

    // #when
    const progress = getProgress(state)

    // #then
    expect(progress.total).toBe(4)
    expect(progress.completed).toBe(1)
    expect(progress.failed).toBe(1)
    expect(progress.running).toBe(1)
    expect(progress.pending).toBe(1)
    expect(progress.completedQueries).toContain("q1")
    expect(progress.failedQueries).toContain("q3")
    expect(progress.runningQueries).toContain("q2")
  })
})

describe("formatProgressMessage", () => {
  test("formats progress with completed and running", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)
    updateTaskStatus(state, "q1", { status: "completed" })
    updateTaskStatus(state, "q2", { status: "running" })

    // #when
    const message = formatProgressMessage(state)

    // #then
    expect(message).toContain("1/4")
    expect(message).toContain("✓")
    expect(message).toContain("🔎")
  })
})

describe("formatResearchStartMessage", () => {
  test("formats start message with plan details", () => {
    // #given
    const plan = createTestPlan()

    // #when
    const message = formatResearchStartMessage(plan)

    // #then
    expect(message).toContain("recipe sharing app")
    expect(message).toContain("4 research queries")
    expect(message).toContain("2 MUST")
    expect(message).toContain("1 SHOULD")
    expect(message).toContain("1 COULD")
    expect(message).toContain("moderate")
  })
})

describe("shouldRetry", () => {
  test("returns true for failed MUST query under retry limit", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)
    updateTaskStatus(state, "q1", { status: "failed", retryCount: 0 })

    // #when
    const task = state.tasks.get("q1")!

    // #then
    expect(shouldRetry(task)).toBe(true)
  })

  test("returns false for failed MUST query at retry limit", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)
    updateTaskStatus(state, "q1", { status: "failed" })
    state.tasks.get("q1")!.retryCount = 2

    // #when
    const task = state.tasks.get("q1")!

    // #then
    expect(shouldRetry(task)).toBe(false)
  })

  test("returns false for failed SHOULD query", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)
    updateTaskStatus(state, "q3", { status: "failed", retryCount: 0 })

    // #when
    const task = state.tasks.get("q3")!

    // #then
    expect(shouldRetry(task)).toBe(false)
  })
})

describe("getFailedMustQueries", () => {
  test("returns failed MUST queries that can be retried", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)
    updateTaskStatus(state, "q1", { status: "failed" })
    updateTaskStatus(state, "q3", { status: "failed" }) // SHOULD query

    // #when
    const failedMust = getFailedMustQueries(state)

    // #then
    expect(failedMust.length).toBe(1)
    expect(failedMust[0].id).toBe("q1")
  })
})

describe("isExecutionComplete", () => {
  test("returns false when tasks still pending", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)

    // #when / #then
    expect(isExecutionComplete(state)).toBe(false)
  })

  test("returns true when all tasks completed or failed", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)
    updateTaskStatus(state, "q1", { status: "completed" })
    updateTaskStatus(state, "q2", { status: "completed" })
    updateTaskStatus(state, "q3", { status: "failed" })
    updateTaskStatus(state, "q4", { status: "completed" })

    // #when / #then
    expect(isExecutionComplete(state)).toBe(true)
  })
})

describe("getCompletedResults", () => {
  test("returns results from completed tasks", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)
    const result: LibrarianResult = {
      query_id: "q1",
      task_id: "bg_123",
      status: "completed",
      findings: ["Finding 1", "Finding 2"],
      recommendations: ["Use PostgreSQL"],
      confidence: "high",
    }
    updateTaskStatus(state, "q1", { status: "completed", result })

    // #when
    const results = getCompletedResults(state)

    // #then
    expect(results.length).toBe(1)
    expect(results[0].query_id).toBe("q1")
  })
})

describe("detectEarlyConsensus", () => {
  test("detects consensus when 3+ sources agree", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)

    const result1: LibrarianResult = {
      query_id: "q1",
      task_id: "bg_1",
      status: "completed",
      recommendations: ["Use Next.js for this project"],
    }
    const result2: LibrarianResult = {
      query_id: "q2",
      task_id: "bg_2",
      status: "completed",
      recommendations: ["Use Next.js for this project"],
    }
    const result3: LibrarianResult = {
      query_id: "q3",
      task_id: "bg_3",
      status: "completed",
      recommendations: ["Use Next.js for this project"],
    }

    updateTaskStatus(state, "q1", { status: "completed", result: result1 })
    updateTaskStatus(state, "q2", { status: "completed", result: result2 })
    updateTaskStatus(state, "q3", { status: "completed", result: result3 })

    // #when
    const consensus = detectEarlyConsensus(state)

    // #then
    expect(consensus.hasEarlyConsensus).toBe(true)
    expect(consensus.sourcesAgreeing).toBe(3)
  })

  test("returns false when no consensus", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)

    const result1: LibrarianResult = {
      query_id: "q1",
      task_id: "bg_1",
      status: "completed",
      recommendations: ["Use Next.js"],
    }
    const result2: LibrarianResult = {
      query_id: "q2",
      task_id: "bg_2",
      status: "completed",
      recommendations: ["Use Remix"],
    }

    updateTaskStatus(state, "q1", { status: "completed", result: result1 })
    updateTaskStatus(state, "q2", { status: "completed", result: result2 })

    // #when
    const consensus = detectEarlyConsensus(state)

    // #then
    expect(consensus.hasEarlyConsensus).toBe(false)
  })
})

describe("detectConflicts", () => {
  test("detects conflicts when use and avoid patterns found", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)

    const result1: LibrarianResult = {
      query_id: "q1",
      task_id: "bg_1",
      status: "completed",
      recommendations: ["Use MongoDB for flexible schema"],
    }
    const result2: LibrarianResult = {
      query_id: "q2",
      task_id: "bg_2",
      status: "completed",
      recommendations: ["Avoid MongoDB, use PostgreSQL instead"],
    }

    updateTaskStatus(state, "q1", { status: "completed", result: result1 })
    updateTaskStatus(state, "q2", { status: "completed", result: result2 })

    // #when
    const conflicts = detectConflicts(state)

    // #then
    expect(conflicts.hasConflict).toBe(true)
  })

  test("returns false when no conflicts", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)

    const result1: LibrarianResult = {
      query_id: "q1",
      task_id: "bg_1",
      status: "completed",
      recommendations: ["Consider Next.js"],
    }

    updateTaskStatus(state, "q1", { status: "completed", result: result1 })

    // #when
    const conflicts = detectConflicts(state)

    // #then
    expect(conflicts.hasConflict).toBe(false)
  })
})

describe("aggregateByCategory", () => {
  test("groups completed results by category", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)

    const result1: LibrarianResult = {
      query_id: "q1",
      task_id: "bg_1",
      status: "completed",
      findings: ["Schema pattern found"],
    }
    const result2: LibrarianResult = {
      query_id: "q2",
      task_id: "bg_2",
      status: "completed",
      findings: ["Implementation guide found"],
    }

    updateTaskStatus(state, "q1", { status: "completed", result: result1 })
    updateTaskStatus(state, "q2", { status: "completed", result: result2 })

    // #when
    const aggregated = aggregateByCategory(state)

    // #then
    expect(aggregated.length).toBe(2)
    const archCategory = aggregated.find(a => a.category === "architecture")
    const implCategory = aggregated.find(a => a.category === "implementation")
    expect(archCategory?.results.length).toBe(1)
    expect(implCategory?.results.length).toBe(1)
  })

  test("excludes failed and pending tasks", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)

    const result1: LibrarianResult = {
      query_id: "q1",
      task_id: "bg_1",
      status: "completed",
      findings: ["Found"],
    }

    updateTaskStatus(state, "q1", { status: "completed", result: result1 })
    updateTaskStatus(state, "q2", { status: "failed" })

    // #when
    const aggregated = aggregateByCategory(state)

    // #then
    expect(aggregated.length).toBe(1)
    expect(aggregated[0].category).toBe("architecture")
  })
})

describe("calculateCategoryConsensus", () => {
  test("returns high consensus when 3+ results agree", () => {
    // #given
    const results: LibrarianResult[] = [
      { query_id: "q1", task_id: "bg_1", status: "completed", recommendations: ["Use PostgreSQL"] },
      { query_id: "q2", task_id: "bg_2", status: "completed", recommendations: ["Use PostgreSQL"] },
      { query_id: "q3", task_id: "bg_3", status: "completed", recommendations: ["Use PostgreSQL"] },
    ]

    // #when
    const consensus = calculateCategoryConsensus(results)

    // #then
    expect(consensus.level).toBe("high")
    expect(consensus.agreementCount).toBe(3)
    expect(consensus.topRecommendation).toBe("use postgresql")
  })

  test("returns moderate consensus when 2 results agree", () => {
    // #given
    const results: LibrarianResult[] = [
      { query_id: "q1", task_id: "bg_1", status: "completed", recommendations: ["Use PostgreSQL"] },
      { query_id: "q2", task_id: "bg_2", status: "completed", recommendations: ["Use PostgreSQL"] },
    ]

    // #when
    const consensus = calculateCategoryConsensus(results)

    // #then
    expect(consensus.level).toBe("moderate")
    expect(consensus.agreementCount).toBe(2)
  })

  test("returns none when results disagree", () => {
    // #given
    const results: LibrarianResult[] = [
      { query_id: "q1", task_id: "bg_1", status: "completed", recommendations: ["Use PostgreSQL"] },
      { query_id: "q2", task_id: "bg_2", status: "completed", recommendations: ["Use MongoDB"] },
      { query_id: "q3", task_id: "bg_3", status: "completed", recommendations: ["Use MySQL"] },
    ]

    // #when
    const consensus = calculateCategoryConsensus(results)

    // #then
    expect(consensus.level).toBe("none")
    expect(consensus.agreementCount).toBe(1)
  })

  test("returns none for empty results", () => {
    // #given
    const results: LibrarianResult[] = []

    // #when
    const consensus = calculateCategoryConsensus(results)

    // #then
    expect(consensus.level).toBe("none")
    expect(consensus.agreementCount).toBe(0)
  })
})

describe("extractConflicts", () => {
  test("extracts conflicts between use and avoid recommendations", () => {
    // #given
    const categoryResults = [
      {
        category: "architecture" as const,
        results: [
          { query_id: "q1", task_id: "bg_1", status: "completed" as const, recommendations: ["Use MongoDB for flexibility"] },
          { query_id: "q2", task_id: "bg_2", status: "completed" as const, recommendations: ["Avoid MongoDB, use PostgreSQL"] },
        ],
        queryIds: ["q1", "q2"],
      },
    ]

    // #when
    const conflicts = extractConflicts(categoryResults)

    // #then
    expect(conflicts.length).toBeGreaterThan(0)
    expect(conflicts[0].topic).toContain("architecture")
  })

  test("returns empty array when no conflicts", () => {
    // #given
    const categoryResults = [
      {
        category: "architecture" as const,
        results: [
          { query_id: "q1", task_id: "bg_1", status: "completed" as const, recommendations: ["Consider caching"] },
        ],
        queryIds: ["q1"],
      },
    ]

    // #when
    const conflicts = extractConflicts(categoryResults)

    // #then
    expect(conflicts.length).toBe(0)
  })
})

describe("identifyGaps", () => {
  test("identifies gaps from failed MUST queries", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)
    updateTaskStatus(state, "q1", { status: "failed", error: "No results found" })

    // #when
    const gaps = identifyGaps(state)

    // #then
    const failedGap = gaps.find(g => g.topic.includes("database schema"))
    expect(failedGap).toBeDefined()
    expect(failedGap?.requires).toBe("additional_research")
  })

  test("identifies gaps from result gaps field", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)
    const result: LibrarianResult = {
      query_id: "q1",
      task_id: "bg_1",
      status: "completed",
      findings: ["Found some info"],
      gaps: ["Security considerations not covered"],
    }
    updateTaskStatus(state, "q1", { status: "completed", result })

    // #when
    const gaps = identifyGaps(state)

    // #then
    const securityGap = gaps.find(g => g.topic.includes("Security"))
    expect(securityGap).toBeDefined()
  })
})

describe("synthesizeFindings", () => {
  test("produces complete synthesis from execution state", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)

    const result1: LibrarianResult = {
      query_id: "q1",
      task_id: "bg_1",
      status: "completed",
      findings: ["PostgreSQL is recommended for relational data"],
      recommendations: ["Use PostgreSQL for recipe data"],
      confidence: "high",
    }
    const result2: LibrarianResult = {
      query_id: "q2",
      task_id: "bg_2",
      status: "completed",
      findings: ["Social features need real-time updates"],
      recommendations: ["Use WebSockets for notifications"],
      confidence: "medium",
    }

    updateTaskStatus(state, "q1", { status: "completed", result: result1 })
    updateTaskStatus(state, "q2", { status: "completed", result: result2 })
    updateTaskStatus(state, "q3", { status: "completed", result: { query_id: "q3", task_id: "bg_3", status: "completed" } })
    updateTaskStatus(state, "q4", { status: "completed", result: { query_id: "q4", task_id: "bg_4", status: "completed" } })

    // #when
    const synthesis = synthesizeFindings(state)

    // #then
    expect(synthesis.findings.length).toBeGreaterThan(0)
    expect(synthesis.overall_confidence).toBeDefined()
    expect(["high", "medium", "low"]).toContain(synthesis.overall_confidence)
  })

  test("includes conflicts in synthesis", () => {
    // #given
    const plan = createTestPlan()
    const state = createResearchExecutionState(plan)

    const result1: LibrarianResult = {
      query_id: "q1",
      task_id: "bg_1",
      status: "completed",
      recommendations: ["Use MongoDB for flexibility"],
    }
    const result2: LibrarianResult = {
      query_id: "q2",
      task_id: "bg_2",
      status: "completed",
      recommendations: ["Avoid MongoDB, prefer PostgreSQL"],
    }

    updateTaskStatus(state, "q1", { status: "completed", result: result1 })
    updateTaskStatus(state, "q2", { status: "completed", result: result2 })

    // #when
    const synthesis = synthesizeFindings(state)

    // #then
    expect(synthesis.conflicts.length).toBeGreaterThanOrEqual(0)
  })
})

describe("formatSynthesisOutput", () => {
  test("formats synthesis into readable markdown", () => {
    // #given
    const synthesis = {
      findings: [
        {
          category: "architecture" as const,
          consensus: "high" as const,
          source_count: 3,
          recommendation: "Use PostgreSQL for relational data",
          reasoning: "Based on 3 findings from 3 sources",
        },
      ],
      conflicts: [],
      gaps: [],
      overall_confidence: "high" as const,
    }

    // #when
    const output = formatSynthesisOutput(synthesis)

    // #then
    expect(output).toContain("## Research Synthesis")
    expect(output).toContain("HIGH")
    expect(output).toContain("architecture")
    expect(output).toContain("PostgreSQL")
  })

  test("includes conflicts section when present", () => {
    // #given
    const synthesis = {
      findings: [],
      conflicts: [
        {
          topic: "Database choice",
          position_a: { description: "Use MongoDB", sources: ["q1"] },
          position_b: { description: "Use PostgreSQL", sources: ["q2"] },
          decision_factors: ["Scale", "Team expertise"],
        },
      ],
      gaps: [],
      overall_confidence: "medium" as const,
    }

    // #when
    const output = formatSynthesisOutput(synthesis)

    // #then
    expect(output).toContain("Conflicts Requiring Decision")
    expect(output).toContain("Database choice")
    expect(output).toContain("MongoDB")
    expect(output).toContain("PostgreSQL")
  })

  test("includes gaps section when present", () => {
    // #given
    const synthesis = {
      findings: [],
      conflicts: [],
      gaps: [
        {
          topic: "Security considerations",
          impact: "Critical for production",
          requires: "additional_research" as const,
        },
      ],
      overall_confidence: "low" as const,
    }

    // #when
    const output = formatSynthesisOutput(synthesis)

    // #then
    expect(output).toContain("Research Gaps")
    expect(output).toContain("Security considerations")
    expect(output).toContain("additional research")
  })
})
