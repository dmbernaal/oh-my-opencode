/**
 * Research Plan Validator
 *
 * Validates research plans created by Athena to ensure:
 * 1. No overlapping queries (queries that would return similar results)
 * 2. Proper query structure (all required fields present)
 * 3. Budget constraints are respected
 * 4. Categories are properly distributed
 */

import type {
  ResearchPlan,
  ResearchQuery,
  ComplexityLevel,
} from "./types"
import { RESEARCH_BUDGET } from "./types"

/**
 * Result of query overlap detection
 */
export interface OverlapResult {
  /** Whether overlap was detected */
  hasOverlap: boolean
  /** Pairs of overlapping queries */
  overlappingPairs: Array<{
    query1: ResearchQuery
    query2: ResearchQuery
    reason: string
    similarity: number
  }>
}

/**
 * Result of plan validation
 */
export interface ValidationResult {
  /** Whether the plan is valid */
  isValid: boolean
  /** Validation errors */
  errors: string[]
  /** Validation warnings (non-blocking) */
  warnings: string[]
  /** Overlap detection results */
  overlapResult: OverlapResult
}

/**
 * Tokenize a query string for comparison
 */
function tokenize(text: string): Set<string> {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "need",
    "how", "what", "when", "where", "why", "which", "who", "whom",
    "this", "that", "these", "those", "i", "you", "he", "she", "it",
    "we", "they", "my", "your", "his", "her", "its", "our", "their",
    "best", "practices", "guide", "tutorial", "example", "examples",
  ])

  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
  )
}

/**
 * Calculate Jaccard similarity between two token sets
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])

  if (union.size === 0) return 0
  return intersection.size / union.size
}

/**
 * Check if two queries have significant semantic overlap
 */
function checkQueryOverlap(
  q1: ResearchQuery,
  q2: ResearchQuery
): { hasOverlap: boolean; similarity: number; reason: string } {
  const tokens1 = tokenize(q1.query)
  const tokens2 = tokenize(q2.query)

  const similarity = jaccardSimilarity(tokens1, tokens2)

  if (similarity > 0.6) {
    return {
      hasOverlap: true,
      similarity,
      reason: `High token overlap (${Math.round(similarity * 100)}%): queries share too many keywords`,
    }
  }

  if (q1.category === q2.category && similarity > 0.4) {
    return {
      hasOverlap: true,
      similarity,
      reason: `Same category "${q1.category}" with moderate overlap (${Math.round(similarity * 100)}%): likely redundant`,
    }
  }

  const purpose1 = tokenize(q1.purpose)
  const purpose2 = tokenize(q2.purpose)
  const purposeSimilarity = jaccardSimilarity(purpose1, purpose2)

  if (purposeSimilarity > 0.7) {
    return {
      hasOverlap: true,
      similarity: purposeSimilarity,
      reason: `Similar purposes (${Math.round(purposeSimilarity * 100)}%): queries serve the same goal`,
    }
  }

  return { hasOverlap: false, similarity, reason: "" }
}

/**
 * Detect overlapping queries in a research plan
 */
export function detectQueryOverlap(queries: ResearchQuery[]): OverlapResult {
  const overlappingPairs: OverlapResult["overlappingPairs"] = []

  for (let i = 0; i < queries.length; i++) {
    for (let j = i + 1; j < queries.length; j++) {
      const result = checkQueryOverlap(queries[i], queries[j])
      if (result.hasOverlap) {
        overlappingPairs.push({
          query1: queries[i],
          query2: queries[j],
          reason: result.reason,
          similarity: result.similarity,
        })
      }
    }
  }

  return {
    hasOverlap: overlappingPairs.length > 0,
    overlappingPairs,
  }
}

/**
 * Validate a single research query
 */
function validateQuery(query: ResearchQuery, index: number): string[] {
  const errors: string[] = []

  if (!query.id) {
    errors.push(`Query ${index + 1}: missing id`)
  }

  if (!query.query || query.query.trim().length < 10) {
    errors.push(`Query ${query.id || index + 1}: query text too short or missing`)
  }

  if (!query.category) {
    errors.push(`Query ${query.id || index + 1}: missing category`)
  }

  if (!query.priority) {
    errors.push(`Query ${query.id || index + 1}: missing priority`)
  }

  if (!query.purpose || query.purpose.trim().length < 10) {
    errors.push(`Query ${query.id || index + 1}: purpose too short or missing`)
  }

  if (!query.target_sources || query.target_sources.length === 0) {
    errors.push(`Query ${query.id || index + 1}: no target sources specified`)
  }

  const vaguePatterns = [
    /^how to/i,
    /best practices$/i,
    /^what is/i,
    /tutorial$/i,
    /guide$/i,
  ]

  for (const pattern of vaguePatterns) {
    if (pattern.test(query.query.trim())) {
      errors.push(
        `Query ${query.id || index + 1}: query "${query.query}" is too vague - be more specific`
      )
      break
    }
  }

  return errors
}

/**
 * Validate budget constraints
 */
function validateBudget(
  plan: ResearchPlan,
  complexity: ComplexityLevel
): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const budget = RESEARCH_BUDGET[complexity]

  const totalQueries =
    plan.queries.must.length +
    plan.queries.should.length +
    plan.queries.could.length

  if (totalQueries < budget.query_count.min) {
    warnings.push(
      `Query count (${totalQueries}) is below minimum (${budget.query_count.min}) for ${complexity} complexity`
    )
  }

  if (totalQueries > budget.query_count.max) {
    errors.push(
      `Query count (${totalQueries}) exceeds maximum (${budget.query_count.max}) for ${complexity} complexity`
    )
  }

  if (plan.librarian_budget < budget.librarian_count.min) {
    warnings.push(
      `Librarian budget (${plan.librarian_budget}) is below minimum (${budget.librarian_count.min}) for ${complexity} complexity`
    )
  }

  if (plan.librarian_budget > budget.librarian_count.max) {
    errors.push(
      `Librarian budget (${plan.librarian_budget}) exceeds maximum (${budget.librarian_count.max}) for ${complexity} complexity`
    )
  }

  if (plan.queries.must.length === 0) {
    errors.push("Research plan must have at least one MUST priority query")
  }

  return { errors, warnings }
}

/**
 * Validate category distribution
 */
function validateCategoryDistribution(queries: ResearchQuery[]): string[] {
  const warnings: string[] = []
  const categoryCounts: Record<string, number> = {}

  for (const query of queries) {
    categoryCounts[query.category] = (categoryCounts[query.category] || 0) + 1
  }

  const categories = Object.keys(categoryCounts)
  if (categories.length === 1 && queries.length > 3) {
    warnings.push(
      `All ${queries.length} queries are in the "${categories[0]}" category - consider diversifying`
    )
  }

  for (const [category, count] of Object.entries(categoryCounts)) {
    if (count > queries.length * 0.5 && queries.length > 4) {
      warnings.push(
        `Category "${category}" has ${count}/${queries.length} queries (${Math.round(count / queries.length * 100)}%) - may be over-represented`
      )
    }
  }

  return warnings
}

/**
 * Validate a complete research plan
 */
export function validateResearchPlan(plan: ResearchPlan): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!plan.topic || plan.topic.trim().length < 5) {
    errors.push("Research plan must have a topic")
  }

  if (!plan.complexity) {
    errors.push("Research plan must have a complexity level")
  }

  if (!plan.complexity_reasoning || plan.complexity_reasoning.trim().length < 20) {
    warnings.push("Complexity reasoning is missing or too brief")
  }

  const allQueries = [
    ...plan.queries.must,
    ...plan.queries.should,
    ...plan.queries.could,
  ]

  for (let i = 0; i < allQueries.length; i++) {
    errors.push(...validateQuery(allQueries[i], i))
  }

  const budgetValidation = validateBudget(plan, plan.complexity)
  errors.push(...budgetValidation.errors)
  warnings.push(...budgetValidation.warnings)

  warnings.push(...validateCategoryDistribution(allQueries))

  const overlapResult = detectQueryOverlap(allQueries)
  if (overlapResult.hasOverlap) {
    for (const pair of overlapResult.overlappingPairs) {
      errors.push(
        `Overlapping queries detected: "${pair.query1.id}" and "${pair.query2.id}" - ${pair.reason}`
      )
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    overlapResult,
  }
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = []

  if (result.isValid) {
    lines.push("✅ Research plan is valid")
  } else {
    lines.push("❌ Research plan has validation errors:")
    for (const error of result.errors) {
      lines.push(`  - ${error}`)
    }
  }

  if (result.warnings.length > 0) {
    lines.push("")
    lines.push("⚠️ Warnings:")
    for (const warning of result.warnings) {
      lines.push(`  - ${warning}`)
    }
  }

  if (result.overlapResult.hasOverlap) {
    lines.push("")
    lines.push("🔄 Overlapping queries detected:")
    for (const pair of result.overlapResult.overlappingPairs) {
      lines.push(`  - ${pair.query1.id} ↔ ${pair.query2.id}: ${pair.reason}`)
    }
  }

  return lines.join("\n")
}
