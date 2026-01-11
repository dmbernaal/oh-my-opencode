# Prometheus: The Planning Agent

**Named after**: Greek titan who gave fire (knowledge/foresight) to humanity  
**Role**: Create PRDs, system architecture, and implementation plans from research  
**Status**: EXISTS - NEEDS REFACTORING

---

## Executive Summary

Prometheus is the planning agent responsible for the second phase of the workflow: taking research findings (from Athena) and converting them into actionable PRDs, architecture documents, and task breakdowns.

**Core Principle**: Plan thoroughly before building. Every line of code should trace back to a requirement.

---

## Current State (What Prometheus Does Today)

### What Works

1. ✅ Asks clarifying questions about user's idea
2. ✅ Creates drafts in `.sisyphus/drafts/`
3. ✅ Generates plans in `.sisyphus/plans/`
4. ✅ Blocked from writing code (prometheus-md-only hook)
5. ✅ Auto-initializes .sisyphus/ structure

### What's Wrong

1. ❌ **Does research AND planning** - Should only plan, Athena should research
2. ❌ **Asks same questions as Sisyphus** - Redundant
3. ❌ **Requires /start-work for handoff** - Bad UX
4. ❌ **Creates task lists, not PRDs** - Should generate proper product documents
5. ❌ **No architecture phase** - Jumps from questions to tasks
6. ❌ **Doesn't consume research** - Doesn't read from .sisyphus/research/

---

## Target State (What Prometheus Should Do)

### Input
- Research document from Athena (`.sisyphus/research/{topic}-research.md`)
- OR direct user input for experienced users who skip research

### Output
- Product Requirements Document (`.sisyphus/plans/{topic}-prd.md`)
- System Architecture (`.sisyphus/plans/{topic}-architecture.md`)
- Implementation Tasks (`.sisyphus/plans/{topic}-tasks.md`)

### Workflow

```
┌─────────────────────────────────────────────────────────────┐
│              PROMETHEUS RECEIVES HANDOFF                     │
│                                                              │
│  Input: .sisyphus/research/social-calculator-research.md    │
│  OR: User's direct requirements                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 1: CONSUME RESEARCH                       │
│                                                              │
│  "I see Athena's research recommends:                       │
│   - Polling for real-time (serverless compatible)           │
│   - In-memory storage for MVP                               │
│   - Basic calculator operations                             │
│                                                              │
│   I'll use this to create the detailed plan."               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 2: GENERATE PRD                           │
│                                                              │
│  Creates: .sisyphus/plans/social-calc-prd.md                │
│                                                              │
│  Contents:                                                  │
│  - Problem statement                                        │
│  - User stories                                             │
│  - Acceptance criteria                                      │
│  - Success metrics                                          │
│  - Out of scope                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 3: DESIGN ARCHITECTURE                    │
│                                                              │
│  Creates: .sisyphus/plans/social-calc-architecture.md       │
│                                                              │
│  Contents:                                                  │
│  - Component diagram                                        │
│  - Data flow                                                │
│  - API contracts                                            │
│  - File structure                                           │
│  - Technology choices (from research)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 4: BREAK DOWN TASKS                       │
│                                                              │
│  Creates: .sisyphus/plans/social-calc-tasks.md              │
│                                                              │
│  Contents:                                                  │
│  - Ordered task list                                        │
│  - Dependencies between tasks                               │
│  - Estimated complexity                                     │
│  - Which agent handles each (frontend, backend, etc.)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 5: GET APPROVAL & HANDOFF                 │
│                                                              │
│  "Here's the complete plan:                                 │
│                                                              │
│   📋 PRD: 5 user stories, 12 acceptance criteria            │
│   🏗️ Architecture: 4 components, 3 API endpoints            │
│   ✅ Tasks: 15 tasks across 3 phases                        │
│                                                              │
│   Review the documents in .sisyphus/plans/                  │
│   Ready to build?"                                          │
│                                                              │
│  [User: "Yes"]                                              │
│                                                              │
│  "Great! Switch to **Sisyphus (Builder)** mode.             │
│   Sisyphus will read the plan and start building."          │
└─────────────────────────────────────────────────────────────┘
```

---

## Role & Responsibilities (Refactored)

### What Prometheus DOES

1. **Consume Research**
   - Read Athena's research document (if exists)
   - Understand recommended approaches
   - Note technology decisions

2. **Generate PRD**
   - Problem statement
   - User stories with acceptance criteria
   - Success metrics
   - Scope boundaries

3. **Design Architecture**
   - Component breakdown
   - Data flow diagrams (text-based)
   - API contracts
   - File/folder structure
   - Technology choices

4. **Create Task Breakdown**
   - Ordered implementation tasks
   - Dependencies
   - Delegation hints (frontend, backend, etc.)

5. **Get User Approval**
   - Present plan summary
   - Allow for questions/changes
   - Confirm before handoff

6. **Recommend Handoff**
   - When approved, recommend switching to Sisyphus
   - NO `/start-work` command required

### What Prometheus DOES NOT DO

- ❌ Conduct deep research (Athena's job)
- ❌ Write code (Sisyphus's job)
- ❌ Ask implementation questions (should use research)
- ❌ Guess at best approaches (should consume research)
- ❌ Require manual commands for handoff

---

## Output Artifacts

Prometheus produces THREE artifacts:

### 1. `.sisyphus/plans/{topic}-prd.md`

```markdown
# PRD: Social Calculator with Live Feed

## Problem Statement
Users want a fun, social way to do math where they can see what 
calculations others are performing in real-time.

## Target Users
- Casual users looking for fun math experience
- Students who want collaborative calculation
- Anyone curious about what others are calculating

## User Stories

### US-1: Basic Calculation
**As a** user  
**I want to** perform basic math operations (+, -, *, /)  
**So that** I can calculate values

**Acceptance Criteria:**
- [ ] Calculator displays current input
- [ ] All four basic operations work correctly
- [ ] Clear button resets calculator
- [ ] Equals button shows result

### US-2: Live Feed
**As a** user  
**I want to** see calculations from other users in real-time  
**So that** I feel connected to the community

**Acceptance Criteria:**
- [ ] Feed shows calculations from all users
- [ ] Feed updates within 2 seconds of new calculation
- [ ] Each entry shows: user ID, expression, result, time
- [ ] Feed scrolls to show latest

[... more user stories ...]

## Success Metrics
- User can complete a calculation in < 5 seconds
- Feed latency < 2 seconds
- Zero calculation errors

## Out of Scope (v1)
- User authentication
- Calculation history per user
- Scientific calculator functions
- Mobile app
```

### 2. `.sisyphus/plans/{topic}-architecture.md`

```markdown
# Architecture: Social Calculator

## Overview
Single-page Next.js application with polling-based real-time feed.

## Component Diagram

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  ┌─────────────┐  ┌─────────────────────────┐   │
│  │ Calculator  │  │       Feed              │   │
│  │ Component   │  │     Component           │   │
│  └──────┬──────┘  └───────────┬─────────────┘   │
│         │                     │                  │
│         │    POST /api/calc   │  GET /api/feed   │
│         └──────────┬──────────┴──────────────────┤
└────────────────────┼────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────┐
│                    │     Backend                 │
│  ┌─────────────────▼─────────────────────────┐  │
│  │           API Routes                       │  │
│  │  /api/calc   │   /api/feed                │  │
│  └───────┬──────────────┬────────────────────┘  │
│          │              │                        │
│  ┌───────▼──────────────▼────────────────────┐  │
│  │         In-Memory Store                    │  │
│  │   calculations: { id, user, expr, result } │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Data Flow

1. User enters calculation → Calculator component
2. User presses equals → POST /api/calc
3. API stores calculation → In-memory store
4. Feed polls every 2s → GET /api/feed
5. API returns latest 50 → Feed component displays

## API Contracts

### POST /api/calc
Request:
```json
{
  "expression": "5 + 3",
  "result": 8,
  "userId": "user_abc123"
}
```

Response:
```json
{
  "success": true,
  "id": "calc_xyz789"
}
```

### GET /api/feed
Response:
```json
{
  "calculations": [
    {
      "id": "calc_xyz789",
      "userId": "user_abc123",
      "expression": "5 + 3",
      "result": 8,
      "timestamp": "2026-01-11T12:00:00Z"
    }
  ]
}
```

## File Structure

```
app/
├── page.tsx              # Main page with layout
├── components/
│   ├── Calculator.tsx    # Calculator UI and logic
│   ├── Feed.tsx          # Real-time feed display
│   └── CalculationCard.tsx
├── api/
│   ├── calc/
│   │   └── route.ts      # POST endpoint
│   └── feed/
│       └── route.ts      # GET endpoint
├── lib/
│   ├── store.ts          # In-memory storage
│   └── types.ts          # TypeScript types
└── hooks/
    └── useFeed.ts        # Polling hook
```

## Technology Decisions
- **Real-time**: Polling (from Athena's research)
- **Storage**: In-memory (MVP, upgrade to Redis later)
- **Styling**: Tailwind CSS (project default)
```

### 3. `.sisyphus/plans/{topic}-tasks.md`

```markdown
# Tasks: Social Calculator

## Phase 1: Foundation (4 tasks)

### Task 1.1: Create TypeScript Types
**Complexity**: Low  
**Agent**: Sisyphus (direct)  
**File**: app/lib/types.ts

Create interfaces for:
- Calculation
- User
- API responses

### Task 1.2: Create In-Memory Store
**Complexity**: Low  
**Agent**: Sisyphus (direct)  
**File**: app/lib/store.ts

Implement:
- Array to hold calculations
- Add function
- Get latest N function

### Task 1.3: Create POST /api/calc
**Complexity**: Medium  
**Agent**: Sisyphus (direct)  
**File**: app/api/calc/route.ts

Implement:
- Validate request body
- Generate user ID if not present
- Store calculation
- Return success

### Task 1.4: Create GET /api/feed
**Complexity**: Low  
**Agent**: Sisyphus (direct)  
**File**: app/api/feed/route.ts

Implement:
- Return latest 50 calculations
- Sort by timestamp descending

## Phase 2: Frontend (5 tasks)

### Task 2.1: Create Calculator Component
**Complexity**: Medium  
**Agent**: frontend-engineer  
**File**: app/components/Calculator.tsx

[... more tasks ...]

## Phase 3: Integration (3 tasks)

### Task 3.1: Wire Calculator to API
### Task 3.2: Wire Feed with Polling
### Task 3.3: Add Loading States

## Phase 4: Polish (3 tasks)

### Task 4.1: Add Error Handling
### Task 4.2: Style Refinements
### Task 4.3: Final Testing

---

## Verification Checklist
- [ ] All user stories have passing acceptance criteria
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] Build succeeds
```

---

## Changes Required

### Files to Modify

| File | Change |
|------|--------|
| `src/agents/prometheus-prompt.ts` | Major refactor - new workflow |
| `src/hooks/prometheus-md-only/index.ts` | Allow writing to .sisyphus/plans/ |

### Prometheus Prompt Changes

**Remove**:
- Interview questions about implementation details
- "Make it into a work plan" trigger (should auto-generate)
- `/start-work` requirement

**Add**:
- Read from .sisyphus/research/ first
- Three-document generation (PRD, Architecture, Tasks)
- Structured templates for each document
- Natural handoff to Sisyphus (no commands)

### New Prompt Structure

```typescript
export const PROMETHEUS_SYSTEM_PROMPT = `<system-reminder>
# Prometheus - Planning Agent

## CRITICAL IDENTITY

**YOU CREATE PLANS. YOU DO NOT RESEARCH. YOU DO NOT BUILD.**

## Your Workflow

### Step 1: Check for Research
IF .sisyphus/research/{topic}-research.md exists:
  → Read it, use findings for planning
ELSE:
  → Ask minimal clarifying questions (not deep research)

### Step 2: Generate PRD
Create .sisyphus/plans/{topic}-prd.md with:
- Problem statement
- User stories with acceptance criteria
- Success metrics
- Out of scope

### Step 3: Design Architecture
Create .sisyphus/plans/{topic}-architecture.md with:
- Component diagram
- Data flow
- API contracts
- File structure

### Step 4: Break Down Tasks
Create .sisyphus/plans/{topic}-tasks.md with:
- Ordered tasks
- Dependencies
- Complexity estimates
- Agent assignments

### Step 5: Get Approval & Handoff
Present summary, get approval, recommend Sisyphus.
NO /start-work COMMAND. Just: "Switch to Sisyphus mode."

## What You DO NOT Do
- ❌ Conduct deep research (Athena's job)
- ❌ Write code (Sisyphus's job)
- ❌ Require manual commands
- ❌ Skip documentation

</system-reminder>`
```

---

## Handoff Protocol

### From Athena (Input)
Prometheus looks for: `.sisyphus/research/{topic}-research.md`
- If exists: Use research findings
- If not: Ask minimal clarifying questions

### To Sisyphus (Output)
Prometheus signals completion:
```
<prometheus-complete>
Planning complete. Documents created:
- .sisyphus/plans/{topic}-prd.md
- .sisyphus/plans/{topic}-architecture.md
- .sisyphus/plans/{topic}-tasks.md

User approved: Yes
Recommended next: Sisyphus (Builder)
</prometheus-complete>
```

Then says naturally:
"Switch to **Sisyphus (Builder)** mode to start building. Sisyphus will read the plan and execute."

---

## Success Criteria

Prometheus is refactored when:

1. ✅ Reads Athena's research if available
2. ✅ Generates three documents (PRD, Architecture, Tasks)
3. ✅ Uses structured templates
4. ✅ Gets user approval before handoff
5. ✅ Natural handoff to Sisyphus (no commands)
6. ✅ Doesn't ask implementation questions (uses research)

---

## Priority

**HIGH** - Prometheus exists but needs significant refactoring to fit the new workflow.

## Estimated Effort

- Prompt refactoring: 3-4 hours
- Template creation: 2-3 hours
- Handoff logic: 2-3 hours
- Testing: 2-3 hours

**Total: ~10-13 hours**
