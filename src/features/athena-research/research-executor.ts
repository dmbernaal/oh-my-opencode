/**
 * Research Executor - Coordinates parallel research execution for Athena
 *
 * Handles batch dispatch of research queries, progress tracking, and result collection.
 * Uses the background_task infrastructure but adds research-specific coordination.
 */

import type {
  ResearchPlan,
  ResearchQuery,
  QueryPriority,
  LibrarianResult,
  ResearchCategory,
  ConsensusLevel,
  SynthesizedFinding,
  ResearchConflict,
  ResearchGap,
  ResearchSynthesis,
} from "./types"

export type ResearchTaskStatus = "pending" | "dispatched" | "running" | "completed" | "failed"

export interface ResearchTaskInfo {
  query: ResearchQuery
  taskId?: string
  sessionId?: string
  status: ResearchTaskStatus
  dispatchedAt?: Date
  completedAt?: Date
  result?: LibrarianResult
  retryCount: number
  error?: string
}

export interface ResearchExecutionState {
  planId: string
  topic: string
  startedAt: Date
  tasks: Map<string, ResearchTaskInfo>
  completedCount: number
  failedCount: number
  totalCount: number
}

export interface BatchDispatchResult {
  dispatched: Array<{ queryId: string; taskId: string }>
  failed: Array<{ queryId: string; error: string }>
}

export interface ProgressUpdate {
  total: number
  completed: number
  failed: number
  running: number
  pending: number
  completedQueries: string[]
  failedQueries: string[]
  runningQueries: string[]
}

const MAX_RETRIES = 2

export function createResearchExecutionState(plan: ResearchPlan): ResearchExecutionState {
  const tasks = new Map<string, ResearchTaskInfo>()

  const allQueries = [
    ...plan.queries.must,
    ...plan.queries.should,
    ...plan.queries.could,
  ]

  for (const query of allQueries) {
    tasks.set(query.id, {
      query,
      status: "pending",
      retryCount: 0,
    })
  }

  return {
    planId: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    topic: plan.topic,
    startedAt: new Date(),
    tasks,
    completedCount: 0,
    failedCount: 0,
    totalCount: allQueries.length,
  }
}

export function getQueriesByPriority(plan: ResearchPlan, priority: QueryPriority): ResearchQuery[] {
  return plan.queries[priority]
}

export function formatDispatchPrompt(query: ResearchQuery): string {
  return `Research Query ID: ${query.id}

Query: ${query.query}
Category: ${query.category}
Purpose: ${query.purpose}
Target Sources: ${query.target_sources.join(", ")}

Execute research according to your category-specific strategy.
Return structured findings in your standard output format.`
}

export function updateTaskStatus(
  state: ResearchExecutionState,
  queryId: string,
  update: Partial<ResearchTaskInfo>
): void {
  const task = state.tasks.get(queryId)
  if (!task) return

  const prevStatus = task.status

  Object.assign(task, update)

  if (prevStatus !== "completed" && task.status === "completed") {
    state.completedCount++
  }
  if (prevStatus !== "failed" && task.status === "failed") {
    state.failedCount++
  }
}

export function getProgress(state: ResearchExecutionState): ProgressUpdate {
  const completedQueries: string[] = []
  const failedQueries: string[] = []
  const runningQueries: string[] = []

  let running = 0
  let pending = 0

  for (const [queryId, task] of state.tasks) {
    switch (task.status) {
      case "completed":
        completedQueries.push(queryId)
        break
      case "failed":
        failedQueries.push(queryId)
        break
      case "running":
      case "dispatched":
        running++
        runningQueries.push(queryId)
        break
      case "pending":
        pending++
        break
    }
  }

  return {
    total: state.totalCount,
    completed: state.completedCount,
    failed: state.failedCount,
    running,
    pending,
    completedQueries,
    failedQueries,
    runningQueries,
  }
}

export function formatProgressMessage(state: ResearchExecutionState): string {
  const progress = getProgress(state)
  const lines: string[] = []

  const done = progress.completed + progress.failed
  lines.push(`⏳ Research Progress: ${done}/${progress.total} queries processed`)
  lines.push("")

  if (progress.completedQueries.length > 0) {
    for (const queryId of progress.completedQueries) {
      const task = state.tasks.get(queryId)
      if (task) {
        lines.push(`✓ [${queryId}] Complete: ${task.query.query.slice(0, 50)}...`)
      }
    }
  }

  if (progress.runningQueries.length > 0) {
    for (const queryId of progress.runningQueries) {
      const task = state.tasks.get(queryId)
      if (task) {
        lines.push(`🔎 [${queryId}] Running: ${task.query.query.slice(0, 50)}...`)
      }
    }
  }

  if (progress.failedQueries.length > 0) {
    lines.push("")
    for (const queryId of progress.failedQueries) {
      const task = state.tasks.get(queryId)
      if (task) {
        lines.push(`✗ [${queryId}] Failed: ${task.error || "Unknown error"}`)
      }
    }
  }

  return lines.join("\n")
}

export function formatResearchStartMessage(plan: ResearchPlan): string {
  const totalQueries = plan.queries.must.length + plan.queries.should.length + plan.queries.could.length
  const categories = new Set([
    ...plan.queries.must.map(q => q.category),
    ...plan.queries.should.map(q => q.category),
    ...plan.queries.could.map(q => q.category),
  ])

  return `🔍 Starting research on ${plan.topic}...

📋 Research plan created:
   • ${totalQueries} research queries across ${categories.size} domains
   • ${plan.queries.must.length} MUST queries (blocking)
   • ${plan.queries.should.length} SHOULD queries (important)
   • ${plan.queries.could.length} COULD queries (nice-to-have)
   • Complexity: ${plan.complexity}

🔎 Dispatching research agents...`
}

export function formatDispatchMessage(queries: ResearchQuery[], batchName: string): string {
  const lines = [`\n📤 Dispatching ${batchName} queries (${queries.length}):`, ""]

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i]
    lines.push(`   [${q.id}] ${q.query.slice(0, 60)}${q.query.length > 60 ? "..." : ""}`)
  }

  return lines.join("\n")
}

export function formatCompletionMessage(state: ResearchExecutionState): string {
  const progress = getProgress(state)
  const duration = formatDuration(state.startedAt, new Date())

  const lines = [
    "",
    "📊 All research complete. Synthesizing findings...",
    "",
    `✅ Research Summary:`,
    `   • ${progress.completed} queries completed successfully`,
    `   • ${progress.failed} queries failed`,
    `   • Duration: ${duration}`,
  ]

  if (progress.failedQueries.length > 0) {
    lines.push("")
    lines.push("⚠️ Failed queries (may need manual investigation):")
    for (const queryId of progress.failedQueries) {
      const task = state.tasks.get(queryId)
      if (task) {
        lines.push(`   - ${queryId}: ${task.query.query.slice(0, 50)}...`)
      }
    }
  }

  return lines.join("\n")
}

function formatDuration(start: Date, end: Date): string {
  const duration = end.getTime() - start.getTime()
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export function shouldRetry(task: ResearchTaskInfo): boolean {
  if (task.status !== "failed") return false
  if (task.retryCount >= MAX_RETRIES) return false
  if (task.query.priority !== "must") return false

  return true
}

export function getFailedMustQueries(state: ResearchExecutionState): ResearchQuery[] {
  const failed: ResearchQuery[] = []

  for (const [, task] of state.tasks) {
    if (task.status === "failed" && task.query.priority === "must" && shouldRetry(task)) {
      failed.push(task.query)
    }
  }

  return failed
}

export function isExecutionComplete(state: ResearchExecutionState): boolean {
  for (const [, task] of state.tasks) {
    if (task.status === "pending" || task.status === "dispatched" || task.status === "running") {
      return false
    }
  }
  return true
}

export function getCompletedResults(state: ResearchExecutionState): LibrarianResult[] {
  const results: LibrarianResult[] = []

  for (const [, task] of state.tasks) {
    if (task.status === "completed" && task.result) {
      results.push(task.result)
    }
  }

  return results
}

export interface ConsensusAnalysis {
  hasEarlyConsensus: boolean
  consensusTopic?: string
  consensusRecommendation?: string
  sourcesAgreeing: number
}

export function detectEarlyConsensus(
  state: ResearchExecutionState,
  minAgreement: number = 3
): ConsensusAnalysis {
  const results = getCompletedResults(state)

  if (results.length < minAgreement) {
    return { hasEarlyConsensus: false, sourcesAgreeing: 0 }
  }

  const recommendationCounts = new Map<string, number>()

  for (const result of results) {
    if (result.recommendations) {
      for (const rec of result.recommendations) {
        const normalized = rec.toLowerCase().trim()
        const count = recommendationCounts.get(normalized) || 0
        recommendationCounts.set(normalized, count + 1)
      }
    }
  }

  for (const [recommendation, count] of recommendationCounts) {
    if (count >= minAgreement) {
      return {
        hasEarlyConsensus: true,
        consensusRecommendation: recommendation,
        sourcesAgreeing: count,
      }
    }
  }

  return { hasEarlyConsensus: false, sourcesAgreeing: 0 }
}

export interface ConflictAnalysis {
  hasConflict: boolean
  conflictTopic?: string
  positions?: Array<{ recommendation: string; sources: string[] }>
}

export function detectConflicts(state: ResearchExecutionState): ConflictAnalysis {
  const results = getCompletedResults(state)

  if (results.length < 2) {
    return { hasConflict: false }
  }

  const positionMap = new Map<string, string[]>()

  for (const result of results) {
    if (result.recommendations) {
      for (const rec of result.recommendations) {
        const sources = positionMap.get(rec) || []
        sources.push(result.query_id)
        positionMap.set(rec, sources)
      }
    }
  }

  const positions = Array.from(positionMap.entries())
    .filter(([, sources]) => sources.length > 0)
    .map(([recommendation, sources]) => ({ recommendation, sources }))

  const usePatterns = positions.filter(p =>
    p.recommendation.toLowerCase().includes("use ") ||
    p.recommendation.toLowerCase().includes("recommend ")
  )

  const avoidPatterns = positions.filter(p =>
    p.recommendation.toLowerCase().includes("avoid ") ||
    p.recommendation.toLowerCase().includes("don't use")
  )

  if (usePatterns.length > 0 && avoidPatterns.length > 0) {
    return {
      hasConflict: true,
      conflictTopic: "Technology recommendation",
      positions: [...usePatterns.slice(0, 2), ...avoidPatterns.slice(0, 2)],
    }
  }

  return { hasConflict: false }
}

/**
 * Phase 4: Synthesis Functions
 * 
 * These functions transform raw LibrarianResults into structured synthesis output.
 */

export interface CategoryResults {
  category: ResearchCategory
  results: LibrarianResult[]
  queryIds: string[]
}

/**
 * Aggregate completed results by their research category
 */
export function aggregateByCategory(state: ResearchExecutionState): CategoryResults[] {
  const categoryMap = new Map<ResearchCategory, { results: LibrarianResult[]; queryIds: string[] }>()

  for (const [queryId, task] of state.tasks) {
    if (task.status === "completed" && task.result) {
      const category = task.query.category
      const existing = categoryMap.get(category) || { results: [], queryIds: [] }
      existing.results.push(task.result)
      existing.queryIds.push(queryId)
      categoryMap.set(category, existing)
    }
  }

  const aggregated: CategoryResults[] = []
  for (const [category, data] of categoryMap) {
    aggregated.push({
      category,
      results: data.results,
      queryIds: data.queryIds,
    })
  }

  return aggregated
}

/**
 * Calculate consensus level for a set of results within a category
 * 
 * Consensus is determined by how many results share similar recommendations:
 * - High: 3+ results agree on key recommendations
 * - Moderate: 2 results agree
 * - None: Results disagree or insufficient data
 */
export function calculateCategoryConsensus(results: LibrarianResult[]): {
  level: ConsensusLevel
  agreementCount: number
  topRecommendation?: string
} {
  if (results.length === 0) {
    return { level: "none", agreementCount: 0 }
  }

  if (results.length === 1) {
    const rec = results[0].recommendations?.[0]
    return { 
      level: "moderate", 
      agreementCount: 1,
      topRecommendation: rec,
    }
  }

  const recommendationCounts = new Map<string, number>()

  for (const result of results) {
    if (result.recommendations) {
      for (const rec of result.recommendations) {
        const normalized = rec.toLowerCase().trim()
        const count = recommendationCounts.get(normalized) || 0
        recommendationCounts.set(normalized, count + 1)
      }
    }
  }

  let maxCount = 0
  let topRec: string | undefined

  for (const [rec, count] of recommendationCounts) {
    if (count > maxCount) {
      maxCount = count
      topRec = rec
    }
  }

  let level: ConsensusLevel
  if (maxCount >= 3) {
    level = "high"
  } else if (maxCount >= 2) {
    level = "moderate"
  } else {
    level = "none"
  }

  return {
    level,
    agreementCount: maxCount,
    topRecommendation: topRec,
  }
}

/**
 * Extract conflicts from results - more thorough than in-flight detection
 */
export function extractConflicts(categoryResults: CategoryResults[]): ResearchConflict[] {
  const conflicts: ResearchConflict[] = []

  for (const { category, results } of categoryResults) {
    const positionMap = new Map<string, { description: string; sources: string[] }>()

    for (const result of results) {
      if (result.recommendations) {
        for (const rec of result.recommendations) {
          const normalized = rec.toLowerCase().trim()
          const existing = positionMap.get(normalized)
          if (existing) {
            existing.sources.push(result.query_id)
          } else {
            positionMap.set(normalized, {
              description: rec,
              sources: [result.query_id],
            })
          }
        }
      }
    }

    const positions = Array.from(positionMap.values())

    const usePositions = positions.filter(p =>
      p.description.toLowerCase().includes("use ") ||
      p.description.toLowerCase().includes("recommend ") ||
      p.description.toLowerCase().includes("prefer ")
    )

    const avoidPositions = positions.filter(p =>
      p.description.toLowerCase().includes("avoid ") ||
      p.description.toLowerCase().includes("don't use") ||
      p.description.toLowerCase().includes("not recommend")
    )

    if (usePositions.length > 0 && avoidPositions.length > 0) {
      conflicts.push({
        topic: `${category} technology choice`,
        position_a: usePositions[0],
        position_b: avoidPositions[0],
        decision_factors: [
          "Project requirements",
          "Team expertise",
          "Long-term maintenance",
          "Performance needs",
        ],
      })
    }

    for (let i = 0; i < usePositions.length; i++) {
      for (let j = i + 1; j < usePositions.length; j++) {
        const posA = usePositions[i]
        const posB = usePositions[j]

        const wordsA = new Set(posA.description.toLowerCase().split(/\s+/))
        const wordsB = new Set(posB.description.toLowerCase().split(/\s+/))
        const intersection = [...wordsA].filter(w => wordsB.has(w))
        const union = new Set([...wordsA, ...wordsB])
        const similarity = intersection.length / union.size

        if (similarity < 0.3 && posA.sources.length > 0 && posB.sources.length > 0) {
          conflicts.push({
            topic: `${category} approach`,
            position_a: posA,
            position_b: posB,
            decision_factors: [
              "Use case specifics",
              "Scale requirements",
              "Team preferences",
            ],
          })
        }
      }
    }
  }

  return conflicts
}

/**
 * Identify research gaps from failed queries and missing coverage
 */
export function identifyGaps(state: ResearchExecutionState): ResearchGap[] {
  const gaps: ResearchGap[] = []

  for (const [, task] of state.tasks) {
    if (task.status === "failed" && task.query.priority === "must") {
      gaps.push({
        topic: task.query.query,
        impact: `Critical research query failed: ${task.error || "Unknown error"}`,
        requires: "additional_research",
      })
    }

    if (task.status === "completed" && task.result?.gaps) {
      for (const gap of task.result.gaps) {
        gaps.push({
          topic: gap,
          impact: `Identified during ${task.query.category} research`,
          requires: "additional_research",
        })
      }
    }
  }

  const coveredCategories = new Set<ResearchCategory>()
  for (const [, task] of state.tasks) {
    if (task.status === "completed") {
      coveredCategories.add(task.query.category)
    }
  }

  const expectedCategories: ResearchCategory[] = [
    "foundation",
    "architecture",
    "implementation",
    "pitfalls",
  ]

  for (const expected of expectedCategories) {
    if (!coveredCategories.has(expected)) {
      gaps.push({
        topic: `${expected} research`,
        impact: `No successful queries in ${expected} category`,
        requires: "additional_research",
      })
    }
  }

  return gaps
}

/**
 * Create a synthesized finding from category results
 */
function createSynthesizedFinding(categoryResult: CategoryResults): SynthesizedFinding {
  const { category, results } = categoryResult
  const consensus = calculateCategoryConsensus(results)

  const allFindings: string[] = []
  const allRecommendations: string[] = []
  const caveats: string[] = []

  for (const result of results) {
    if (result.findings) {
      allFindings.push(...result.findings)
    }
    if (result.recommendations) {
      allRecommendations.push(...result.recommendations)
    }
    if (result.confidence === "low") {
      caveats.push(`Low confidence from query ${result.query_id}`)
    }
  }

  const recommendation = consensus.topRecommendation || 
    allRecommendations[0] || 
    allFindings[0] || 
    `See ${category} research results`

  const reasoning = allFindings.length > 0
    ? `Based on ${allFindings.length} findings from ${results.length} sources`
    : `Based on ${results.length} research queries`

  return {
    category,
    consensus: consensus.level,
    source_count: results.length,
    recommendation,
    reasoning,
    caveats: caveats.length > 0 ? caveats : undefined,
  }
}

/**
 * Calculate overall confidence based on synthesis results
 */
function calculateOverallConfidence(
  findings: SynthesizedFinding[],
  conflicts: ResearchConflict[],
  gaps: ResearchGap[]
): "high" | "medium" | "low" {
  const highConsensusCount = findings.filter(f => f.consensus === "high").length
  const totalFindings = findings.length

  if (gaps.length > 2 || conflicts.length > 2) {
    return "low"
  }

  if (highConsensusCount >= totalFindings * 0.6 && gaps.length === 0) {
    return "high"
  }

  if (highConsensusCount >= totalFindings * 0.3 && gaps.length <= 1) {
    return "medium"
  }

  return "low"
}

/**
 * Main synthesis function - transforms execution state into structured synthesis
 */
export function synthesizeFindings(state: ResearchExecutionState): ResearchSynthesis {
  const categoryResults = aggregateByCategory(state)

  const findings = categoryResults.map(createSynthesizedFinding)

  const conflicts = extractConflicts(categoryResults)

  const gaps = identifyGaps(state)

  const overall_confidence = calculateOverallConfidence(findings, conflicts, gaps)

  return {
    findings,
    conflicts,
    gaps,
    overall_confidence,
  }
}

/**
 * Format synthesis output for display
 */
export function formatSynthesisOutput(synthesis: ResearchSynthesis): string {
  const lines: string[] = []

  lines.push("## Research Synthesis")
  lines.push("")
  lines.push(`**Overall Confidence:** ${synthesis.overall_confidence.toUpperCase()}`)
  lines.push("")

  if (synthesis.findings.length > 0) {
    lines.push("### Key Findings")
    lines.push("")

    for (const finding of synthesis.findings) {
      const consensusIcon = finding.consensus === "high" ? "✓" : 
                           finding.consensus === "moderate" ? "~" : "?"
      lines.push(`**${finding.category}** [${consensusIcon} ${finding.consensus} consensus, ${finding.source_count} sources]`)
      lines.push(`- ${finding.recommendation}`)
      lines.push(`- _${finding.reasoning}_`)
      if (finding.caveats && finding.caveats.length > 0) {
        lines.push(`- ⚠️ Caveats: ${finding.caveats.join(", ")}`)
      }
      lines.push("")
    }
  }

  if (synthesis.conflicts.length > 0) {
    lines.push("### Conflicts Requiring Decision")
    lines.push("")

    for (const conflict of synthesis.conflicts) {
      lines.push(`**${conflict.topic}:**`)
      lines.push(`- Position A: ${conflict.position_a.description} (Sources: ${conflict.position_a.sources.join(", ")})`)
      lines.push(`- Position B: ${conflict.position_b.description} (Sources: ${conflict.position_b.sources.join(", ")})`)
      lines.push(`- Decision factors: ${conflict.decision_factors.join(", ")}`)
      lines.push("")
    }
  }

  if (synthesis.gaps.length > 0) {
    lines.push("### Research Gaps")
    lines.push("")

    for (const gap of synthesis.gaps) {
      lines.push(`- **${gap.topic}**: ${gap.impact}`)
      lines.push(`  - Requires: ${gap.requires.replace(/_/g, " ")}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}
