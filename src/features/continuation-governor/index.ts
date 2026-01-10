/**
 * Continuation Governor
 * 
 * Safeguards against infinite continuation loops by enforcing limits on
 * automatic message injection after session.idle events.
 * 
 * Protects against:
 * - Compaction loops (system operations triggering continuations)
 * - Stuck task loops (agent can't complete, keeps retrying)
 * - Abandoned sessions (user walks away, agent keeps burning tokens)
 * - Runaway server costs (absolute session budget ceiling)
 * - Multiple hooks racing (single source of truth for continuation decisions)
 */

export interface ContinuationState {
  /** Timestamp of last user-initiated message */
  lastUserMessageTime: number
  /** Timestamp of last auto-continuation injection */
  lastContinuationTime: number
  /** Number of consecutive continuations without user input */
  consecutiveContinuations: number
  /** Flag set after system operations (compaction, recovery) */
  postSystemOperation: boolean
  /** Total continuations in this session (never resets) */
  sessionContinuationCount: number
}

export interface GovernorConfig {
  /** Maximum consecutive continuations before requiring user input */
  maxConsecutiveContinuations: number
  /** Minimum milliseconds between continuations */
  cooldownMs: number
  /** Maximum milliseconds since last user message before blocking */
  staleSessionMs: number
  /** Absolute maximum continuations per session */
  sessionBudgetMax: number
}

export interface ContinuationRequest {
  /** Name of the hook requesting continuation */
  hookName: string
  /** Reason for the continuation request */
  reason: string
  /** Session ID for per-session tracking */
  sessionID: string
}

export interface ContinuationDecision {
  /** Whether continuation is allowed */
  allowed: boolean
  /** Reason for blocking (if not allowed) */
  blockedReason?: string
}

const DEFAULT_CONFIG: GovernorConfig = {
  maxConsecutiveContinuations: 5,
  cooldownMs: 5000, // 5 seconds
  staleSessionMs: 300000, // 5 minutes
  sessionBudgetMax: 50,
}

// Per-session state tracking
const sessionStates = new Map<string, ContinuationState>()

// Global config
let config: GovernorConfig = { ...DEFAULT_CONFIG }

function getOrCreateState(sessionID: string): ContinuationState {
  let state = sessionStates.get(sessionID)
  if (!state) {
    state = {
      lastUserMessageTime: Date.now(),
      lastContinuationTime: 0,
      consecutiveContinuations: 0,
      postSystemOperation: false,
      sessionContinuationCount: 0,
    }
    sessionStates.set(sessionID, state)
  }
  return state
}

/**
 * Initialize the Continuation Governor with custom config
 */
export function initializeContinuationGovernor(customConfig?: Partial<GovernorConfig>): void {
  config = { ...DEFAULT_CONFIG, ...customConfig }
  console.log("[Continuation Governor] Initialized with config:", config)
}

/**
 * Request permission to inject a continuation message
 * 
 * Checks all safeguard rules in order and returns decision
 */
export function requestContinuation(request: ContinuationRequest): ContinuationDecision {
  const state = getOrCreateState(request.sessionID)
  const now = Date.now()

  console.log(`[Continuation Governor] ${request.hookName} requested continuation for session ${request.sessionID}`)
  console.log(`[Continuation Governor] Reason: ${request.reason}`)
  console.log(`[Continuation Governor] Current state:`, {
    consecutiveContinuations: state.consecutiveContinuations,
    sessionContinuationCount: state.sessionContinuationCount,
    postSystemOperation: state.postSystemOperation,
    timeSinceLastContinuation: now - state.lastContinuationTime,
    timeSinceLastUserMessage: now - state.lastUserMessageTime,
  })

  // Rule 1: Block immediately after system operations (compaction, recovery)
  if (state.postSystemOperation) {
    state.postSystemOperation = false // Clear flag after first block
    const decision: ContinuationDecision = {
      allowed: false,
      blockedReason: "Post-system operation cooldown (compaction/recovery just completed)",
    }
    console.log(`[Continuation Governor] Decision: BLOCKED - ${decision.blockedReason}`)
    return decision
  }

  // Rule 2: Block if too many consecutive continuations without user input
  if (state.consecutiveContinuations >= config.maxConsecutiveContinuations) {
    const decision: ContinuationDecision = {
      allowed: false,
      blockedReason: `Max consecutive continuations reached (${config.maxConsecutiveContinuations})`,
    }
    console.log(`[Continuation Governor] Decision: BLOCKED - ${decision.blockedReason}`)
    return decision
  }

  // Rule 3: Block if cooldown period is active
  const timeSinceLastContinuation = now - state.lastContinuationTime
  if (state.lastContinuationTime > 0 && timeSinceLastContinuation < config.cooldownMs) {
    const decision: ContinuationDecision = {
      allowed: false,
      blockedReason: `Cooldown period active (${Math.ceil((config.cooldownMs - timeSinceLastContinuation) / 1000)}s remaining)`,
    }
    console.log(`[Continuation Governor] Decision: BLOCKED - ${decision.blockedReason}`)
    return decision
  }

  // Rule 4: Block if session appears stale (user hasn't typed recently)
  const timeSinceLastUserMessage = now - state.lastUserMessageTime
  if (timeSinceLastUserMessage > config.staleSessionMs) {
    const decision: ContinuationDecision = {
      allowed: false,
      blockedReason: `Session appears stale (${Math.ceil(timeSinceLastUserMessage / 60000)} minutes since last user message)`,
    }
    console.log(`[Continuation Governor] Decision: BLOCKED - ${decision.blockedReason}`)
    return decision
  }

  // Rule 5: Block if session budget exhausted
  if (state.sessionContinuationCount >= config.sessionBudgetMax) {
    const decision: ContinuationDecision = {
      allowed: false,
      blockedReason: `Session budget exhausted (${config.sessionBudgetMax} continuations)`,
    }
    console.log(`[Continuation Governor] Decision: BLOCKED - ${decision.blockedReason}`)
    return decision
  }

  // All checks passed - ALLOW continuation
  state.consecutiveContinuations++
  state.sessionContinuationCount++
  state.lastContinuationTime = now

  console.log(`[Continuation Governor] Decision: ALLOWED`)
  console.log(`[Continuation Governor] Updated state:`, {
    consecutiveContinuations: state.consecutiveContinuations,
    sessionContinuationCount: state.sessionContinuationCount,
  })

  return { allowed: true }
}

/**
 * Call when user sends a message (resets consecutive counter)
 */
export function onUserMessage(sessionID: string): void {
  const state = getOrCreateState(sessionID)
  state.lastUserMessageTime = Date.now()
  state.consecutiveContinuations = 0
  state.postSystemOperation = false // User input clears system operation flag

  console.log(`[Continuation Governor] User message received for session ${sessionID}`)
  console.log(`[Continuation Governor] Reset consecutiveContinuations to 0`)
}

/**
 * Call when system operation completes (compaction, recovery, etc.)
 */
export function onSystemOperation(sessionID: string): void {
  const state = getOrCreateState(sessionID)
  state.postSystemOperation = true

  console.log(`[Continuation Governor] System operation completed for session ${sessionID}`)
  console.log(`[Continuation Governor] Set postSystemOperation flag - next continuation will be blocked`)
}

/**
 * Get current governor state for a session (for debugging)
 */
export function getGovernorState(sessionID: string): ContinuationState | undefined {
  return sessionStates.get(sessionID)
}

/**
 * Get current governor config (for debugging)
 */
export function getGovernorConfig(): GovernorConfig {
  return { ...config }
}

/**
 * Clean up state for deleted sessions
 */
export function cleanupSession(sessionID: string): void {
  sessionStates.delete(sessionID)
  console.log(`[Continuation Governor] Cleaned up state for session ${sessionID}`)
}

/**
 * Reset all state (for testing)
 */
export function resetGovernor(): void {
  sessionStates.clear()
  console.log(`[Continuation Governor] Reset all state`)
}
