# Athena: The Research Agent

**Named after**: Greek goddess of wisdom and strategic thinking  
**Role**: Deep research and understanding before any planning begins  
**Status**: NOT YET IMPLEMENTED

---

## Executive Summary

Athena is a NEW agent responsible for the first phase of the workflow: understanding the problem space through deep research before any planning or building occurs. 

**Core Principle**: No agent should plan or build until the problem is thoroughly understood.

---

## Why Athena is Needed

### Current Problem

Today, when a user says "I have an idea for X":
- Prometheus asks clarifying questions (guessing, not researching)
- Sisyphus ALSO asks clarifying questions (redundant)
- Neither agent actually RESEARCHES the best approaches
- Users must do their own research on ChatGPT/Claude/Gemini beforehand

### The Solution

Athena performs deep research via multi-agent orchestration:
- Spawns multiple librarian agents in parallel
- Gathers information about best practices, patterns, and approaches
- Synthesizes findings into actionable recommendations
- THEN hands off to Prometheus for planning

---

## Role & Responsibilities

### What Athena DOES

1. **Understand the Goal**
   - Parse user's high-level idea
   - Ask clarifying questions to understand scope
   - Identify the core problem to solve

2. **Conduct Deep Research**
   - Spawn librarian agents to research:
     - Best practices for the problem domain
     - Similar implementations in open source
     - Technology options and trade-offs
     - Common pitfalls to avoid
   - Spawn explore agents to understand existing codebase (if any)

3. **Synthesize Findings**
   - Consolidate research into a coherent document
   - Present options with pros/cons
   - Make recommendations based on findings

4. **Get User Approval**
   - Present research findings to user
   - Discuss options and trade-offs
   - Confirm direction before proceeding

5. **Hand Off to Prometheus**
   - When user approves direction, recommend switching to Prometheus
   - Pass research findings as input to planning phase

### What Athena DOES NOT DO

- ❌ Create PRDs or architecture documents (Prometheus's job)
- ❌ Write any code (Sisyphus's job)
- ❌ Make final decisions (user decides)
- ❌ Skip research and guess (must research first)

---

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INPUT                              │
│  "I have an idea for a social calculator with live feed"    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  ATHENA: UNDERSTAND                          │
│                                                              │
│  "Interesting idea! Before I research, let me understand:   │
│   1. What's the primary use case?                           │
│   2. Who's the target audience?                             │
│   3. Any technical constraints I should know about?"        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ User answers
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  ATHENA: RESEARCH                            │
│                                                              │
│  "Let me research the best approaches..."                   │
│                                                              │
│  [Spawns librarian agents in parallel]                      │
│  → librarian: "Real-time feed patterns in Next.js"          │
│  → librarian: "Calculator UX best practices"                │
│  → librarian: "WebSocket vs Polling vs SSE comparison"      │
│  → librarian: "Social feed implementations on GitHub"       │
│                                                              │
│  [If existing project, spawns explore agents]               │
│  → explore: "Current project structure and patterns"        │
│  → explore: "Existing authentication/state management"      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Research complete
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  ATHENA: SYNTHESIZE                          │
│                                                              │
│  "Based on my research, here's what I found:                │
│                                                              │
│   ## Real-Time Options                                      │
│   1. WebSocket (Socket.io) - Best for true real-time        │
│   2. Server-Sent Events - Simpler, one-way                  │
│   3. Polling - Simplest, slight delay                       │
│                                                              │
│   ## Recommendation                                         │
│   For MVP, I recommend Option 3 (Polling) because:          │
│   - Simplest to implement                                   │
│   - Works with serverless (Vercel)                          │
│   - Can upgrade to WebSocket later                          │
│                                                              │
│   ## Architecture Pattern                                   │
│   I found a good pattern from [library X] that...           │
│                                                              │
│   Does this direction make sense?"                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ User: "Yes, let's go with polling"
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  ATHENA: HANDOFF                             │
│                                                              │
│  "Great! I've saved my research findings to:                │
│   .sisyphus/research/social-calculator-research.md          │
│                                                              │
│   Now it's time to create the detailed plan.                │
│   Switch to **Prometheus (Planner)** mode to:               │
│   - Create the Product Requirements Document                │
│   - Design the system architecture                          │
│   - Break down into implementation tasks                    │
│                                                              │
│   Prometheus will use my research as input."                │
└─────────────────────────────────────────────────────────────┘
```

---

## Output Artifacts

Athena produces ONE artifact:

### `.sisyphus/research/{topic}-research.md`

```markdown
# Research: Social Calculator with Live Feed

## Date
2026-01-11

## Goal
Build a social calculator where users see calculations from others in real-time.

## User Requirements (from interview)
- Target audience: Casual users
- Primary use case: Fun, social math
- Constraints: Must work on Vercel (serverless)

## Research Findings

### Real-Time Feed Options

#### Option 1: WebSocket (Socket.io)
**Pros**:
- True real-time, instant updates
- Bi-directional communication
- Widely used, well-documented

**Cons**:
- Requires WebSocket server (not serverless-friendly)
- More complex setup
- Connection management overhead

**Best For**: Apps requiring instant updates, chat applications

#### Option 2: Server-Sent Events (SSE)
**Pros**:
- Native browser support
- Simpler than WebSocket
- Works with HTTP

**Cons**:
- One-way only (server → client)
- Limited browser connections
- Still needs persistent connection

**Best For**: News feeds, notifications

#### Option 3: Polling
**Pros**:
- Simplest implementation
- Works with serverless
- No connection management

**Cons**:
- Not true real-time (delay)
- More server requests
- Less efficient

**Best For**: MVP, serverless environments

### Similar Implementations Found
- [Project A](link): Used polling with 2s interval
- [Project B](link): WebSocket implementation with fallback

### Recommended Approach
**Option 3: Polling** for MVP because:
1. Works with Vercel serverless
2. Simplest to implement
3. Can upgrade to WebSocket in v2

### Architecture Pattern
Based on research, recommend:
- Next.js App Router for frontend
- API routes for polling endpoint
- In-memory store for MVP (upgrade to Redis later)

## User Decision
User approved: Polling approach with 2-second interval

## Next Steps
→ Hand off to Prometheus for PRD and architecture generation
```

---

## Implementation Plan

### Phase 1: Create Agent Foundation

#### 1.1 Create Athena Agent File
**File**: `src/agents/athena.ts`

```typescript
// Athena - Research Agent
// Purpose: Deep research via multi-agent orchestration

export const ATHENA_SYSTEM_PROMPT = `<system-reminder>
# Athena - Research & Understanding Agent

## CRITICAL IDENTITY

**YOU ARE A RESEARCHER. YOU DO NOT PLAN. YOU DO NOT BUILD.**

Your job is to UNDERSTAND the problem through RESEARCH before any planning begins.

## Your Workflow

### Phase 1: Understand the Goal
- Ask 2-3 clarifying questions about the user's idea
- Understand scope, constraints, target audience
- DO NOT ask implementation questions (that's Prometheus's job)

### Phase 2: Conduct Research
- Spawn librarian agents to research:
  - Best practices
  - Technology options
  - Similar implementations
  - Common pitfalls
- Spawn explore agents if existing codebase
- Run research in PARALLEL for speed

### Phase 3: Synthesize Findings
- Consolidate research into clear options
- Present pros/cons for each approach
- Make a recommendation with reasoning
- Save to .sisyphus/research/{topic}-research.md

### Phase 4: Get Approval & Handoff
- Present findings to user
- Discuss and refine direction
- When approved, recommend switching to Prometheus

## What You DO NOT Do
- ❌ Create PRDs or task lists
- ❌ Design architecture
- ❌ Write code
- ❌ Skip research and guess
- ❌ Make decisions for the user

## Tools You Use
- sisyphus_task with agent="librarian" for research
- sisyphus_task with agent="explore" for codebase understanding
- Write tool for .sisyphus/research/*.md

</system-reminder>`
```

#### 1.2 Create Athena Configuration
**File**: `src/plugin-handlers/config-handler.ts` (modify)

Add Athena to agent configuration alongside Prometheus and Sisyphus.

#### 1.3 Add Athena to Agent Exports
**File**: `src/agents/index.ts` (modify)

Export Athena agent configuration.

---

### Phase 2: Research Orchestration

#### 2.1 Create Research Spawning Logic
**File**: `src/features/research-orchestration/index.ts`

```typescript
// Orchestrates parallel research via librarian agents
export async function conductResearch(topic: string, questions: string[]) {
  // Spawn multiple librarian agents in parallel
  // Collect and synthesize results
  // Return consolidated findings
}
```

#### 2.2 Create Research Storage
**File**: `src/features/research-storage/index.ts`

```typescript
// Manages .sisyphus/research/ directory
export function saveResearchDocument(topic: string, findings: ResearchFindings) {
  // Write to .sisyphus/research/{topic}-research.md
}

export function loadResearchDocument(topic: string): ResearchFindings | null {
  // Read existing research if available
}
```

---

### Phase 3: Handoff Protocol

#### 3.1 Define Handoff Signal
Athena signals completion with:
```
<athena-complete>
Research complete. User approved direction: {direction}
Research document: .sisyphus/research/{topic}-research.md
Recommended next: Prometheus (Planner)
</athena-complete>
```

#### 3.2 Create Handoff Hook (Future)
**File**: `src/hooks/athena-handoff/index.ts`

Detects Athena completion and suggests/triggers Prometheus.

---

## Changes Required

### New Files to Create

| File | Purpose |
|------|---------|
| `src/agents/athena.ts` | Athena agent definition and prompt |
| `src/features/research-orchestration/index.ts` | Parallel research spawning |
| `src/features/research-storage/index.ts` | .sisyphus/research/ management |
| `src/hooks/athena-init/index.ts` | Auto-init research directory |
| `src/hooks/athena-handoff/index.ts` | Detect completion, suggest handoff |

### Files to Modify

| File | Change |
|------|--------|
| `src/plugin-handlers/config-handler.ts` | Add Athena to agent config |
| `src/agents/index.ts` | Export Athena |
| `src/agents/utils.ts` | Add Athena to builtinAgents |
| `src/hooks/index.ts` | Export new Athena hooks |
| `src/index.ts` | Integrate Athena hooks |

### Directory Structure Addition

```
.sisyphus/
├── research/           # NEW - Athena's output
│   └── {topic}-research.md
├── drafts/             # Prometheus working notes
├── plans/              # Prometheus final plans
├── notepads/           # Multi-agent coordination
└── boulder/            # Work session state
```

---

## Success Criteria

Athena is complete when:

1. ✅ User can start in Athena mode for vague ideas
2. ✅ Athena asks understanding questions (not implementation)
3. ✅ Athena spawns librarian agents for parallel research
4. ✅ Athena synthesizes findings into coherent document
5. ✅ Athena saves research to .sisyphus/research/
6. ✅ Athena recommends handoff to Prometheus when complete
7. ✅ Research document is readable by Prometheus

---

## Example Interaction

```
User: "I want to build a social calculator app"

Athena: "Interesting! Let me understand your vision better:
1. What's the core experience you want users to have?
2. Is this for fun/casual use or professional?
3. Any platforms you're targeting (web, mobile, both)?"

User: "Fun social app, web-only, users see each other's calculations"

Athena: "Got it! Let me research the best approaches for a real-time social feed...

[Spawning research agents...]
→ Researching real-time feed patterns
→ Researching calculator UX
→ Finding similar implementations

[Research complete]

Based on my research, here are your options:

## Real-Time Approach
1. **WebSocket** - True real-time, but needs server
2. **SSE** - Simpler, but one-way
3. **Polling** - Simplest, works serverless

## My Recommendation
For a fun MVP, I recommend **Polling** because:
- Works with Vercel (serverless)
- Simplest to implement
- 2-second delay is fine for casual use

I found a great pattern from [Project X] that we could adapt.

Does this direction work for you?"

User: "Yes, let's go with polling"

Athena: "Perfect! I've saved my research to:
.sisyphus/research/social-calculator-research.md

Time to create the detailed plan. Switch to **Prometheus (Planner)** mode.
Prometheus will use my research to create:
- Product Requirements Document
- System Architecture
- Implementation tasks"
```

---

## Priority

**HIGH** - Athena is the foundation of the new workflow. Without research, Prometheus and Sisyphus are just guessing.

## Estimated Effort

- Agent definition: 2-3 hours
- Research orchestration: 3-4 hours
- Storage/handoff: 2-3 hours
- Testing: 2-3 hours

**Total: ~10-13 hours**

---

## Dependencies

- Requires librarian agent (EXISTS)
- Requires explore agent (EXISTS)
- Requires sisyphus_task tool (EXISTS)
- Requires .sisyphus/ infrastructure (EXISTS)

## Risks

1. **Research quality**: Depends on librarian agent quality
2. **Research time**: Multiple agents = longer wait
3. **Synthesis complexity**: Combining findings is non-trivial

## Mitigations

1. Improve librarian prompts for better research
2. Show progress indicators during research
3. Use structured output format for easier synthesis
