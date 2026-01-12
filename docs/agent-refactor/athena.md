# Athena: The Research Agent

**Named after**: Greek goddess of wisdom and strategic thinking  
**Role**: Deep research and understanding before any planning begins  
**Status**: IMPLEMENTED

---

## Executive Summary

Athena is a sophisticated research agent responsible for the first phase of the workflow: understanding the problem space through deep, multi-agent research before any planning or building occurs.

**Core Principle**: No agent should plan or build until the problem is thoroughly understood.

**Model**: `anthropic/claude-sonnet-4-5` (with 16k thinking budget)

---

## The Five Phases

Athena operates through a structured 5-phase workflow:

```
┌─────────┐   ┌─────────┐   ┌──────────┐   ┌───────────┐   ┌─────────┐
│ PROFILE │ → │  PLAN   │ → │ RESEARCH │ → │ SYNTHESIZE│ → │DOCUMENT │
│         │   │         │   │          │   │           │   │         │
│ Assess  │   │ Design  │   │ Execute  │   │ Analyze   │   │ Produce │
│ user &  │   │ research│   │ parallel │   │ findings  │   │ final   │
│ request │   │ queries │   │ searches │   │ & resolve │   │ artifact│
└─────────┘   └─────────┘   └──────────┘   └───────────┘   └─────────┘
```

---

## Phase 1: Profile Assessment

### Purpose
Classify user expertise and scenario type to adapt communication style and research depth throughout the session.

### Auto-Classification (Pre-computed)

User profiling is typically **pre-computed by a lightweight model** (explore agent) before Athena responds. This is handled by the `athena-profile-loader` hook.

When a user message arrives, the hook:
1. Checks for an existing profile in `.sisyphus/session/user-profile.json` (24-hour TTL)
2. If no profile exists, spawns the explore agent to classify the user
3. Injects a `<user_profile>` block into the message before Athena sees it

**Profile Structure:**
```typescript
interface UserProfile {
  expertise: "beginner" | "intermediate" | "expert"
  vocabulary_level: "plain" | "some_technical" | "highly_technical"
  focus: "problem" | "solution" | "implementation"
  signals: string[]
}
```

**Scenario Types:**
| Scenario | Trigger Phrases | Research Focus |
|----------|-----------------|----------------|
| `greenfield` | "build", "create", "new project" | Comprehensive: stack, architecture, infrastructure, UX |
| `feature` | "add to my app", "implement", "integrate" | Focused: best practices, integration patterns, security |
| `exploration` | "thinking about", "is it possible" | Product: market landscape, user pain points, feasibility |
| `tech_decision` | "should I use X or Y", "comparing" | Comparison: deep trade-offs, case studies, performance |

### Research Domain Priority Matrix

Athena adjusts research focus based on scenario:

| Domain | Greenfield | Feature | Exploration | Tech Decision |
|--------|------------|---------|-------------|---------------|
| Architecture patterns | PRIMARY | Light | Light | Important |
| Tech stack comparison | PRIMARY | Skip | Light | PRIMARY |
| UX/UI patterns | Important | Light | PRIMARY | Skip |
| Market/competitors | Light | Skip | PRIMARY | Light |
| Best practices | Important | PRIMARY | Light | Important |
| Implementation examples | Important | PRIMARY | Skip | Important |
| Pitfalls/anti-patterns | Important | Important | Light | Important |
| Security considerations | Important | Important | Light | Important |

### Expertise Adaptation

| Aspect | Beginner | Intermediate | Expert |
|--------|----------|--------------|--------|
| Question phrasing | Plain language, explain terms | Standard technical terms | Assume knowledge, go deep |
| Research depth | More foundational content | Balanced | Focus on advanced patterns |
| Explanation level | Detailed with analogies | Standard | Concise, assume context |
| Options presented | Curated recommendations | Multiple options with trade-offs | Full landscape with nuances |
| Max questions | 4 | 3 | 2 |

### Silent Upgrade Rule
If user responds with technical jargon that contradicts initial classification, silently upgrade expertise level without commenting on it.

---

## Phase 2: Research Planning

### Purpose
Create a DELIBERATE research plan before dispatching any librarians. This prevents vague queries that return shallow results.

### Complexity Assessment

Assess 6 factors to determine project complexity:

| Factor | Simple | Moderate | Complex | Enterprise |
|--------|--------|----------|---------|------------|
| Data model | Single entity | 3-5 entities | Complex relations | Multi-tenant, sharded |
| Real-time needs | None | Basic notifications | Core feature | Mission-critical |
| Expected scale | Personal use | Hundreds users | Thousands | Millions |
| External integrations | Standalone | 1-2 APIs | Many integrations | Legacy systems |
| Technology novelty | Standard patterns | Some custom | Specialized domain | Bleeding-edge |
| Security requirements | Basic auth | Standard security | Compliance needs | Regulated industry |

**Complexity Calculation:**
1. Score each factor (Simple=1, Moderate=2, Complex=3, Enterprise=4)
2. Count factors in each category
3. Overall = Highest category with 2+ factors
4. Adjust UP if any single factor is in a higher category

### Research Budget by Complexity

| Complexity | Librarian Count | Query Count | Estimated Duration |
|------------|-----------------|-------------|-------------------|
| Simple | 3-4 | 4-6 | 2-3 minutes |
| Moderate | 5-6 | 6-8 | 4-5 minutes |
| Complex | 7-8 | 8-10 | 6-8 minutes |
| Enterprise | 9-12 | 10-14 | 10-15 minutes |

### Query Structure

Each query MUST have:
```typescript
interface ResearchQuery {
  id: string                    // e.g., "q1", "q2"
  query: string                 // Specific search query
  category: ResearchCategory    // foundation, architecture, comparison, etc.
  priority: "must" | "should" | "could"
  purpose: string               // Why we need this
  target_sources: SourceType[]  // documentation, github, articles, etc.
}
```

**Research Categories:**
- `foundation` - Core best practices, fundamentals
- `architecture` - System design patterns
- `comparison` - Tech A vs Tech B analysis
- `implementation` - How to actually build it
- `pitfalls` - What to avoid, common mistakes
- `ux_patterns` - User experience research
- `market` - Competitive landscape
- `security` - Security considerations
- `performance` - Scalability, optimization

### Query Overlap Detection

The `plan-validator.ts` module detects overlapping queries using:
- Jaccard similarity on tokenized queries (>60% overlap = flagged)
- Same category with moderate overlap (>40% = flagged)
- Similar purposes (>70% similarity = flagged)

---

## Phase 3: Research Execution

### Batched Parallel Execution

Queries run in **parallel batches**, not sequentially:

**Batch 1 (MUST - Blocking):**
1. Dispatch ALL must queries simultaneously using `background_task`
2. Wait for ALL to complete before proceeding
3. If any MUST query fails, reformulate and retry (max 2 retries)

**Batch 2 (SHOULD - Important):**
1. Once MUST batch shows early results, dispatch ALL should queries
2. Can overlap with remaining MUST completions
3. Failures noted but don't block progress

**Batch 3 (COULD - If Needed):**
1. Only dispatch if earlier batches haven't provided coverage
2. Skip if early consensus detected

### Research Librarian Agent

**IMPORTANT:** Athena uses the specialized `research-librarian` agent, NOT the generic `librarian`.

The `research-librarian` is optimized for broad research (best practices, comparisons, market analysis) with category-specific search strategies. The generic `librarian` is for code lookup and GitHub permalinks.

### In-Flight Adjustments

Monitor early results for:

- **Early Consensus** (3+ sources agree): Skip redundant queries, add depth queries
- **Gap Detection**: Spawn additional queries for unexpected topics
- **Conflict Detection**: Spawn resolution queries for contradictory recommendations

### Execution State Tracking

The `research-executor.ts` module manages:
```typescript
interface ResearchExecutionState {
  planId: string
  topic: string
  startedAt: Date
  tasks: Map<string, ResearchTaskInfo>
  completedCount: number
  failedCount: number
  totalCount: number
}
```

---

## Phase 4: Synthesis

### Purpose
Analyze all findings, identify patterns and conflicts, resolve contradictions where possible.

### Synthesis Process

**Step 1: Aggregate by Category**
- Group all librarian results by research category
- Uses `aggregateByCategory()` function

**Step 2: Identify Consensus**
| Consensus Level | Criteria | Presentation |
|-----------------|----------|--------------|
| High | 3+ sources agree | Strong recommendation |
| Moderate | 2 sources agree | Recommended with caveats |
| None | Sources disagree | Options requiring user decision |

**Step 3: Flag Conflicts**
- Uses `extractConflicts()` to find contradictory recommendations
- Documents EXPLICITLY: Position A vs Position B with decision factors
- Does NOT hide conflicts or arbitrarily pick winners

**Step 4: Identify Gaps**
- Uses `identifyGaps()` to find:
  - Failed MUST queries
  - Gaps identified by librarians
  - Missing expected categories

**Step 5: Formulate Recommendations**
- Uses `synthesizeFindings()` to create structured `ResearchSynthesis`
- Calculates overall confidence based on consensus, conflicts, and gaps

---

## Phase 5: Document Production

### Output Location (Sacred Contract)

`.sisyphus/research/{topic}-research.md`

This path is an interface contract with Prometheus and Sisyphus.

### Document Structure

```markdown
# Research: {Topic}

**Generated:** {date}
**Complexity:** {Simple|Moderate|Complex|Enterprise}
**Scenario:** {Greenfield|Feature|Exploration|Tech Decision}

---

## Goal
{Clear statement of what the user wants to achieve}

## User Requirements
- Target users: {who}
- Core problem: {what}
- Platform: {web/mobile/desktop}
- Scope: {MVP/production/enterprise}
- Constraints: {timeline, budget, technical}

---

## Research Findings

### {Category}
**{Consensus level}** ({N} sources)
**Recommendation:** {recommendation}
_{reasoning}_

---

## Similar Implementations Found
1. **{Project Name}** - {description}
   - Link: {url}
   - Relevance: {why useful}

---

## Conflicting Information

### {Topic}
- **Position A:** {description} (Sources: X, Y)
- **Position B:** {description} (Sources: Z)
- **Decision Factors:** {what influences choice}

---

## Research Gaps
- {Gap}: {impact}
  - Requires: {additional_research|experimentation|user_input}

---

## Recommended Approach

### Technology Stack
- **{Technology}:** {justification}

### Architecture Pattern
**{Pattern}:** {justification}

### Key Decisions Made
- {decision}

### Open Decisions
- {decision needing user input}

---

## Next Steps
1. Review this research document
2. Provide input on open decisions (if any)
3. Switch to **Prometheus** agent to begin planning phase

---

## Research Metadata
- **Queries Executed:** {count}
- **Sources Consulted:** {count}
- **Research Duration:** {time}
- **Confidence Level:** {High|Medium|Low}
```

---

## Dynamic Question Framework

### Gap-Based Questioning

**DO NOT ask what user already told you.**

Before asking ANY question, analyze using:

```typescript
interface MessageAnalysis {
  has_target_user: boolean    // Who will use this?
  has_core_problem: boolean   // What problem does it solve?
  has_platform: boolean       // Web, mobile, desktop?
  has_scope: boolean          // MVP, beta, production?
  has_tech_preferences: boolean
  has_constraints: boolean    // Timeline, budget, team size?
}
```

Only generate questions for unchecked boxes.

### Question Limits (Multi-Factor)

Base limits by expertise, with modifiers:

```typescript
function calculateQuestionLimit(
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
  
  return Math.max(1, Math.min(5, baseLimit + modifier))
}
```

**Hard limits:** Minimum 1, Maximum 5. NEVER exceed 5 questions.

### Expertise-Adapted Question Phrasing

| Gap | Beginner | Expert |
|-----|----------|--------|
| Scope | "Are you looking to build something small to start, or the full vision?" | "MVP or production-ready?" |
| Platform | "Should this work on iPhones, Androids, or both? Or is it for computers?" | "iOS, Android, or cross-platform?" |
| Scale | "How many people do you expect to use this?" | "Expected concurrent users?" |
| Timeline | "When do you need this working? Is there a deadline?" | "Timeline constraints?" |
| Tech Stack | "Do you have any preferences for how this should be built?" | "Stack preferences or constraints?" |

### Use Assumptions Over Questions

Instead of asking, state assumptions:
- "I'll assume this is for mobile since you mentioned 'on the go'—let me know if that's wrong."
- "Since you mentioned this is for your team, I'll assume around 10-50 users initially."

**When to assume vs ask:**
- **Assume** when: Context strongly implies the answer, or the default is safe
- **Ask** when: Wrong assumption would waste significant research effort

---

## Done Researching Signal

### Self-Assessment Protocol

After each batch completes:
```
COVERAGE CHECK:
- [✓] Best practices: Found N sources
- [✗] Security: No results → RETRY

ACTIONABILITY CHECK:
- Can recommend tech stack? YES/NO
- Can recommend architecture? YES/NO

DIMINISHING RETURNS:
- Last results added novel info? YES → CONTINUE / NO → DONE

DECISION: DONE / NOT DONE - [reason]
```

### Completion Criteria (ALL must be true)
- **Coverage Check:** All MUST queries returned meaningful results
- **Actionability Check:** Can answer key questions (tech stack, architecture, MVP features)
- **Diminishing Returns:** Last 2-3 results mostly repeated earlier findings
- **Acceptable Gaps:** Remaining unknowns don't block next phase

---

## Implementation Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/agents/athena.ts` | Agent definition and system prompt | 964 |
| `src/agents/research-librarian.ts` | Specialized research subagent | 233 |
| `src/features/athena-research/types.ts` | All type definitions and constants | 458 |
| `src/features/athena-research/profile-classifier.ts` | Lightweight user classification | 197 |
| `src/features/athena-research/profile-persistence.ts` | Profile storage (24h TTL) | 69 |
| `src/features/athena-research/plan-validator.ts` | Query overlap detection | 362 |
| `src/features/athena-research/research-executor.ts` | Execution state management | 793 |
| `src/features/athena-research/document-generator.ts` | Markdown document production | 297 |
| `src/hooks/athena-profile-loader/index.ts` | Profile injection hook | 167 |

---

## Tool Access

Athena has restricted tool access to enforce research-only behavior:

```typescript
tools: {
  edit: false,              // Cannot edit files
  background_task: true,    // Dispatch research-librarian agents
  background_output: true,  // Collect research results
  call_omo_agent: true,     // Spawn explore agents
  write: true,              // Save research documents
  read: true,               // Read existing files
  glob: true,               // Find files
  grep: true,               // Search content
  bash: false,              // No shell access
  task: false,              // No Task tool
  sisyphus_task: false,     // No Sisyphus task delegation
}
```

---

## What Athena Does NOT Do

- ❌ Create PRDs or architecture documents (Prometheus's job)
- ❌ Write any code (Sisyphus's job)
- ❌ Make final decisions (user decides)
- ❌ Skip research and guess
- ❌ Ask implementation questions
- ❌ Investigate existing codebase deeply (unless FEATURE scenario)

---

## Handoff Protocol

When research is complete and user approves:

1. Save research to `.sisyphus/research/{topic}-research.md`
2. Tell user: "Switch to **Prometheus (Planner)** to create the detailed plan."
3. **STOP. DO NOT CONTINUE.**

**FORBIDDEN after research:**
- ❌ Creating PRD or architecture documents
- ❌ Starting implementation
- ❌ Any work beyond research and handoff

---

## Example Interaction

```
User: "I want to build a social calculator app"

[Profile classification runs in background]
[<user_profile> injected: expertise=intermediate, scenario=greenfield]

Athena: "Interesting! A social calculator where users can see each other's 
calculations in real-time. 

Based on what you've shared:
✓ Target user: general users wanting social math
✓ Core problem: social/shared calculation experience
? Scope: Are you building an MVP to test the idea, or production-ready?
? Platform: Web-only, or mobile apps too?

I'll assume web-first since you didn't mention mobile—let me know if wrong."

User: "Web for now, just want to validate the idea"

Athena: "Got it! Let me research the best approaches for a real-time social 
feed MVP on web...

📋 Research plan created:
   • 6 research queries across 4 domains
   • 3 MUST, 2 SHOULD, 1 COULD
   • Complexity: MODERATE

📤 Dispatching MUST queries:
   [q1] Real-time feed patterns for web apps 2025
   [q2] Calculator UX best practices
   [q3] WebSocket vs SSE vs Polling comparison

⏳ Waiting for results...

[Research completes]

Based on my research, here are your options:

## Real-Time Approach
1. **Polling** - Simplest, works serverless ✓ RECOMMENDED for MVP
2. **SSE** - One-way, simpler than WebSocket
3. **WebSocket** - True real-time, but needs server

## My Recommendation
For an MVP to validate the idea, **Polling** because:
- Works with Vercel (serverless)
- Simplest to implement
- 2-second delay is fine for validation

I found a great pattern from [Project X] that we could adapt.

Does this direction work for you?"

User: "Yes, let's go with polling"

Athena: "I've saved my research to:
.sisyphus/research/social-calculator-research.md

Time to create the detailed plan. Switch to **Prometheus (Planner)** mode.
Prometheus will use my research to create:
- Product Requirements Document
- System Architecture
- Implementation tasks"
```

---

## Success Criteria

Athena is complete when:

1. ✅ User profiling works via hook injection
2. ✅ Complexity assessment drives research budget
3. ✅ Query overlap detection prevents redundant research
4. ✅ Parallel research execution with state tracking
5. ✅ Synthesis produces structured findings with consensus/conflicts/gaps
6. ✅ Document generation matches template contract
7. ✅ Gap-based questioning prevents redundant questions
8. ✅ Question limits adapt to expertise/complexity/density
9. ✅ Expertise-adapted phrasing works
10. ✅ Handoff to Prometheus is clean

---

## Dependencies

### Existing Infrastructure (Ready)
- `.sisyphus/` directory structure ✅
- `background_task` for parallel agents ✅
- `background_output` for result collection ✅
- explore agent for classification ✅

### Created for Athena
- `research-librarian` agent ✅
- Profile persistence system ✅
- Plan validator with overlap detection ✅
- Research executor with state management ✅
- Document generator ✅
- Profile loader hook ✅
