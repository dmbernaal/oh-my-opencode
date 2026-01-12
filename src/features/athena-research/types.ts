/**
 * Athena Research System Types
 * 
 * These types define the data structures used throughout Athena's 5-phase research workflow.
 */

/**
 * User expertise level detected from their communication style
 */
export type ExpertiseLevel = "beginner" | "intermediate" | "expert"

/**
 * Vocabulary level in user's messages
 */
export type VocabularyLevel = "plain" | "some_technical" | "highly_technical"

/**
 * What the user is primarily focused on
 */
export type UserFocus = "problem" | "solution" | "implementation"

/**
 * Research scenario types
 */
export type ScenarioType = "greenfield" | "feature" | "exploration" | "tech_decision"

/**
 * User profile from Phase 1 assessment
 */
export interface UserProfile {
  /** Detected expertise level */
  expertise: ExpertiseLevel
  /** Vocabulary level used in messages */
  vocabulary_level: VocabularyLevel
  /** What the user is focused on */
  focus: UserFocus
  /** Signals that triggered this classification */
  signals: string[]
}

/**
 * Stored profile with metadata for persistence
 */
export interface StoredProfile {
  /** The user profile */
  profile: UserProfile
  /** Detected scenario type */
  scenario: ScenarioType
  /** ISO timestamp when profile was created */
  created_at: string
  /** Session ID where profile was created */
  session_id: string
}

/**
 * Project complexity levels
 */
export type ComplexityLevel = "simple" | "moderate" | "complex" | "enterprise"

/**
 * Research category for organizing queries
 */
export type ResearchCategory =
  | "foundation"    // Core best practices, fundamentals
  | "architecture"  // System design patterns
  | "comparison"    // Tech A vs Tech B analysis
  | "implementation" // How to actually build it
  | "pitfalls"      // What to avoid, common mistakes
  | "ux_patterns"   // User experience research
  | "market"        // Competitive landscape
  | "security"      // Security considerations
  | "performance"   // Scalability, optimization

/**
 * Source types for research queries
 */
export type SourceType =
  | "documentation" // Official docs
  | "github"        // Open source examples
  | "articles"      // Blog posts, tutorials
  | "comparisons"   // Benchmark sites, vs articles
  | "discussions"   // Reddit, HN, Stack Overflow

/**
 * Priority level for research queries
 */
export type QueryPriority = "must" | "should" | "could"

/**
 * Individual research query
 */
export interface ResearchQuery {
  /** Query identifier (q1, q2, etc.) */
  id: string
  /** The actual search query */
  query: string
  /** What type of research */
  category: ResearchCategory
  /** How important */
  priority: QueryPriority
  /** Why we need this (for synthesis) */
  purpose: string
  /** Where to look */
  target_sources: SourceType[]
}

/**
 * Research plan from Phase 2
 */
export interface ResearchPlan {
  /** Topic being researched */
  topic: string
  /** Assessed complexity */
  complexity: ComplexityLevel
  /** Number of librarian agents to dispatch */
  librarian_budget: number
  /** Total query count */
  query_budget: number
  /** Organized research queries */
  queries: {
    must: ResearchQuery[]
    should: ResearchQuery[]
    could: ResearchQuery[]
  }
  /** Reasoning for complexity assessment */
  complexity_reasoning: string
}

/**
 * Individual librarian result from Phase 3
 */
export interface LibrarianResult {
  /** Query ID this result is for */
  query_id: string
  /** Task ID from background_task */
  task_id: string
  /** Status of the research */
  status: "pending" | "running" | "completed" | "failed"
  /** Key findings (3-5 points) */
  findings?: string[]
  /** Specific recommendations */
  recommendations?: string[]
  /** Sources with links */
  sources?: Array<{ title: string; url: string }>
  /** Confidence level */
  confidence?: "high" | "medium" | "low"
  /** Gaps or uncertainties */
  gaps?: string[]
  /** Error message if failed */
  error?: string
}

/**
 * Consensus level for synthesis
 */
export type ConsensusLevel = "high" | "moderate" | "none"

/**
 * Synthesized finding from Phase 4
 */
export interface SynthesizedFinding {
  /** Category of the finding */
  category: ResearchCategory
  /** Consensus level across sources */
  consensus: ConsensusLevel
  /** Number of sources that agree */
  source_count: number
  /** The recommendation or finding */
  recommendation: string
  /** Reasoning behind the recommendation */
  reasoning: string
  /** Caveats or conditions */
  caveats?: string[]
}

/**
 * Conflict between sources
 */
export interface ResearchConflict {
  /** Topic of conflict */
  topic: string
  /** First position */
  position_a: {
    description: string
    sources: string[]
  }
  /** Second position */
  position_b: {
    description: string
    sources: string[]
  }
  /** What should influence the choice */
  decision_factors: string[]
}

/**
 * Research gap identified in synthesis
 */
export interface ResearchGap {
  /** Topic with insufficient coverage */
  topic: string
  /** Impact on the project */
  impact: string
  /** Whether it requires additional research or experimentation */
  requires: "additional_research" | "experimentation" | "user_input"
}

/**
 * Complete synthesis from Phase 4
 */
export interface ResearchSynthesis {
  /** Synthesized findings by category */
  findings: SynthesizedFinding[]
  /** Conflicts requiring user decision */
  conflicts: ResearchConflict[]
  /** Gaps in research coverage */
  gaps: ResearchGap[]
  /** Overall confidence level */
  overall_confidence: "high" | "medium" | "low"
}

/**
 * Phase 5: Document Production Types
 */

export interface UserRequirements {
  goal: string
  target_users: string
  core_problem: string
  platform: string
  scope: string
  constraints?: string[]
}

export interface SimilarImplementation {
  name: string
  description: string
  url: string
  relevance: string
}

export interface RecommendedApproach {
  tech_stack: Array<{ technology: string; justification: string }>
  architecture_pattern?: { pattern: string; justification: string }
  key_decisions: string[]
  open_decisions: string[]
}

export interface ResearchMetadata {
  queries_executed: number
  sources_consulted: number
  research_duration: string
  confidence_level: "high" | "medium" | "low"
}

export interface ResearchDocument {
  topic: string
  generated_date: string
  complexity: ComplexityLevel
  scenario: ScenarioType
  user_requirements: UserRequirements
  synthesis: ResearchSynthesis
  similar_implementations: SimilarImplementation[]
  recommended_approach: RecommendedApproach
  metadata: ResearchMetadata
}

/**
 * Research domain priority matrix
 */
export type DomainPriority = "primary" | "important" | "light" | "skip"

/**
 * Research domain matrix by scenario
 */
export const RESEARCH_DOMAIN_MATRIX: Record<ScenarioType, Record<string, DomainPriority>> = {
  greenfield: {
    architecture_patterns: "primary",
    tech_stack_comparison: "primary",
    ux_patterns: "important",
    market_competitors: "light",
    best_practices: "important",
    implementation_examples: "important",
    pitfalls: "important",
    security: "important",
  },
  feature: {
    architecture_patterns: "light",
    tech_stack_comparison: "skip",
    ux_patterns: "light",
    market_competitors: "skip",
    best_practices: "primary",
    implementation_examples: "primary",
    pitfalls: "important",
    security: "important",
  },
  exploration: {
    architecture_patterns: "light",
    tech_stack_comparison: "light",
    ux_patterns: "primary",
    market_competitors: "primary",
    best_practices: "light",
    implementation_examples: "skip",
    pitfalls: "light",
    security: "light",
  },
  tech_decision: {
    architecture_patterns: "important",
    tech_stack_comparison: "primary",
    ux_patterns: "skip",
    market_competitors: "light",
    best_practices: "important",
    implementation_examples: "important",
    pitfalls: "important",
    security: "important",
  },
}

/**
 * Research budget configuration by complexity
 */
export const RESEARCH_BUDGET: Record<ComplexityLevel, {
  librarian_count: { min: number; max: number }
  query_count: { min: number; max: number }
  estimated_duration: string
}> = {
  simple: {
    librarian_count: { min: 3, max: 4 },
    query_count: { min: 4, max: 6 },
    estimated_duration: "2-3 minutes",
  },
  moderate: {
    librarian_count: { min: 5, max: 6 },
    query_count: { min: 6, max: 8 },
    estimated_duration: "4-5 minutes",
  },
  complex: {
    librarian_count: { min: 7, max: 8 },
    query_count: { min: 8, max: 10 },
    estimated_duration: "6-8 minutes",
  },
  enterprise: {
    librarian_count: { min: 9, max: 12 },
    query_count: { min: 10, max: 14 },
    estimated_duration: "10-15 minutes",
  },
}

/**
 * Question adaptation based on expertise
 */
export const EXPERTISE_ADAPTATIONS: Record<ExpertiseLevel, {
  max_questions: number
  vocabulary: "plain" | "standard" | "technical"
  explanation_level: "detailed" | "standard" | "concise"
  options_style: "curated" | "with_tradeoffs" | "full_landscape"
}> = {
  beginner: {
    max_questions: 4,
    vocabulary: "plain",
    explanation_level: "detailed",
    options_style: "curated",
  },
  intermediate: {
    max_questions: 3,
    vocabulary: "standard",
    explanation_level: "standard",
    options_style: "with_tradeoffs",
  },
  expert: {
    max_questions: 2,
    vocabulary: "technical",
    explanation_level: "concise",
    options_style: "full_landscape",
  },
}

/**
 * Message analysis for gap-based questioning
 * Tracks what information the user has already provided
 */
export interface MessageAnalysis {
  /** User explicitly stated who the target users are */
  has_target_user: boolean
  /** User described the core problem they're solving */
  has_core_problem: boolean
  /** User specified the platform (web, mobile, desktop, etc.) */
  has_platform: boolean
  /** User indicated scope (MVP, full product, enterprise) */
  has_scope: boolean
  /** User mentioned technology preferences */
  has_tech_preferences: boolean
  /** User stated constraints (timeline, budget, team size) */
  has_constraints: boolean
}

/**
 * Message detail density levels
 */
export type MessageDensity = "sparse" | "moderate" | "detailed"

/**
 * Calculate effective question limit based on multiple factors
 * 
 * @param expertise - User's expertise level
 * @param complexity - Project complexity level
 * @param density - How much info user already provided
 * @returns Maximum number of questions to ask
 */
export function calculateQuestionLimit(
  expertise: ExpertiseLevel,
  complexity: ComplexityLevel,
  density: MessageDensity
): number {
  const baseLimit = EXPERTISE_ADAPTATIONS[expertise].max_questions
  
  let modifier = 0
  if (complexity === "simple") modifier -= 1
  if (complexity === "enterprise") modifier += 1
  if (density === "detailed") modifier -= 1
  if (density === "sparse") modifier += 1
  
  const result = baseLimit + modifier
  return Math.max(1, Math.min(5, result))
}

/**
 * Expertise-adapted question phrasing examples
 * Maps gap types to phrasing for different expertise levels
 */
export const QUESTION_PHRASING_EXAMPLES: Record<string, Record<ExpertiseLevel, string>> = {
  scope: {
    beginner: "Are you looking to build something small to start, or the full vision?",
    intermediate: "What's your target scope - MVP, beta, or production-ready?",
    expert: "MVP scope or production-ready?",
  },
  platform: {
    beginner: "Should this work on iPhones, Androids, or both? Or is it for computers?",
    intermediate: "What platforms are you targeting - iOS, Android, web, or cross-platform?",
    expert: "iOS, Android, or cross-platform?",
  },
  scale: {
    beginner: "How many people do you expect to use this? Just you, your team, or lots of people?",
    intermediate: "What's your expected user scale - tens, hundreds, thousands?",
    expert: "Expected concurrent users?",
  },
  timeline: {
    beginner: "When do you need this working? Is there a deadline?",
    intermediate: "What's your timeline - weeks, months, or ongoing development?",
    expert: "Timeline constraints?",
  },
  tech_stack: {
    beginner: "Do you have any preferences for how this should be built?",
    intermediate: "Any technology preferences or existing stack to integrate with?",
    expert: "Stack preferences or constraints?",
  },
}
