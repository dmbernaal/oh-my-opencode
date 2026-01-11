# Orchestration: Agent Coordination & Handoffs

**Purpose**: Define how Athena, Prometheus, and Sisyphus coordinate  
**Status**: NEEDS IMPLEMENTATION

---

## Executive Summary

Orchestration defines:

1. How the system routes users to the right agent
2. How agents hand off to each other
3. How state is shared between agents
4. How the user experience flows seamlessly

**Goal**: Natural conversation flow, no manual commands, intelligent routing.

---

## Current State (How It Works Today)

### Agent Selection

- **Manual**: User selects agent from dropdown in OpenCode UI
- **No automatic routing**: System doesn't detect intent
- **No suggestions**: Agents don't recommend switching

### Handoffs

- **Manual command**: `/start-work` required to go from Prometheus → Sisyphus
- **No state transfer**: Agents don't read each other's outputs
- **Lost context**: Switching agents loses conversation context

### State Sharing

- **Prometheus**: Writes to `.sisyphus/drafts/`, `.sisyphus/plans/`
- **Sisyphus**: Writes to `docs/agent/project-context.md`
- **No integration**: Neither reads the other's files
- **No research phase**: `.sisyphus/research/` doesn't exist

### Problems

1. ❌ User must know which agent to use
2. ❌ Manual `/start-work` is bad UX
3. ❌ No research consumption
4. ❌ No plan consumption
5. ❌ Context lost between agents

---

## Target State (How It Should Work)

### Agent Selection

- **Intent-based routing**: System detects what user needs
- **Smart defaults**: New projects → suggest Athena
- **Clear guidance**: Each agent explains when to use others

### Handoffs

- **Natural language**: "Ready to build?" → "Yes" → switches to Sisyphus
- **Explicit signals**: Agents emit completion signals
- **Smooth transition**: Context preserved across handoffs

### State Sharing

- **Athena outputs**: `.sisyphus/research/{topic}-research.md`
- **Prometheus reads**: Research → outputs PRD, Architecture, Tasks
- **Sisyphus reads**: PRD, Architecture, Tasks → executes

### Flow

```
User: "I have an idea for X"
↓
[Intent: Vague idea, needs research]
↓
System: "Would you like to start in Athena (Research) mode?"
↓
User: "Yes"
↓
Athena: Researches → "Research complete. Switch to Prometheus?"
↓
User: "Yes"
↓
Prometheus: Reads research → Creates plan → "Ready to build?"
↓
User: "Yes"
↓
Sisyphus: Reads plan → Builds → "Done!"
```

**NO COMMANDS. Just natural conversation.**

---

## The Three Handoffs

### 1. User → Agent (Initial Routing)

#### Detection Logic

```typescript
function detectInitialAgent(
  message: string,
  projectState: ProjectState
): Agent {
  // Check for existing artifacts
  if (projectState.hasPlan) {
    return "Sisyphus"; // Plan exists, ready to build
  }
  if (projectState.hasResearch) {
    return "Prometheus"; // Research done, ready to plan
  }

  // Analyze message intent
  const intent = analyzeIntent(message);

  if (intent.isVagueIdea) {
    return "Athena"; // Needs research
  }
  if (intent.needsPlanning) {
    return "Prometheus"; // Needs planning
  }
  if (intent.isClearInstruction) {
    return "Sisyphus"; // Can execute directly
  }

  // Default for new projects with ideas
  return "Athena";
}
```

#### Signals for Each Agent

| Signal               | Route To   | Example                        |
| -------------------- | ---------- | ------------------------------ |
| "I have an idea"     | Athena     | "I want to build a social app" |
| "Build me X" (vague) | Athena     | "Build me an e-commerce site"  |
| "Create a plan for"  | Prometheus | "Create a plan for auth"       |
| "Add X" (clear)      | Sisyphus   | "Add a dark mode toggle"       |
| "Fix X"              | Sisyphus   | "Fix the login bug"            |
| "Execute the plan"   | Sisyphus   | "Build what's in the plan"     |

#### User Guidance (Frontend)

```
┌─────────────────────────────────────────────────────────────┐
│            Welcome to Oh-My-OpenCode                         │
│                                                              │
│  I see this is a new project. How would you like to start?  │
│                                                              │
│  🔬 **Athena (Research)** - Recommended for new ideas       │
│     Deep research before planning                            │
│                                                              │
│  📋 **Prometheus (Planning)** - If you know what you want   │
│     Create PRD and architecture                              │
│                                                              │
│  🔨 **Sisyphus (Building)** - For clear, specific tasks     │
│     Execute immediately                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Athena → Prometheus (Research Complete)

#### Handoff Signal

Athena emits when research is complete and user approves:

```markdown
<athena-handoff>
status: complete
research_document: .sisyphus/research/{topic}-research.md
user_approved_direction: {direction description}
recommended_next: Prometheus
</athena-handoff>
```

#### Natural Language Handoff

```
Athena: "I've completed my research and saved findings to:
.sisyphus/research/social-calculator-research.md

Based on my research, I recommend:
- Polling for real-time (serverless-compatible)
- In-memory storage for MVP
- Basic calculator operations

You approved this direction. ✅

**Next Step**: Switch to **Prometheus (Planner)** mode.
Prometheus will read my research and create:
- Product Requirements Document
- System Architecture
- Implementation Tasks"
```

#### Prometheus Receives

When user switches to Prometheus:

```typescript
// Prometheus startup check
const researchPath = findLatestResearch(projectDir);
if (researchPath) {
  const research = readResearchDocument(researchPath);
  console.log(`Found research: ${research.topic}`);
  console.log(`Using findings for planning...`);
}
```

---

### 3. Prometheus → Sisyphus (Planning Complete)

#### Handoff Signal

Prometheus emits when planning is complete and user approves:

```markdown
<prometheus-handoff>
status: complete
documents:
  - .sisyphus/plans/{topic}-prd.md
  - .sisyphus/plans/{topic}-architecture.md
  - .sisyphus/plans/{topic}-tasks.md
user_approved: true
recommended_next: Sisyphus
</prometheus-handoff>
```

#### Natural Language Handoff

```
Prometheus: "I've created the complete plan:

📋 **PRD**: 5 user stories, 12 acceptance criteria
🏗️ **Architecture**: 4 components, 2 API endpoints
✅ **Tasks**: 15 tasks in 4 phases

Documents saved to .sisyphus/plans/

You approved this plan. ✅

**Next Step**: Switch to **Sisyphus (Builder)** mode.
Sisyphus will read the plan and execute each task."
```

**NO `/start-work` COMMAND.**

#### Sisyphus Receives

When user switches to Sisyphus:

```typescript
// Sisyphus startup check
const planPath = findLatestPlan(projectDir);
if (planPath) {
  const plan = {
    prd: readDocument(`${planPath}-prd.md`),
    architecture: readDocument(`${planPath}-architecture.md`),
    tasks: readDocument(`${planPath}-tasks.md`),
  };
  console.log(`Found plan: ${plan.tasks.length} tasks`);
  console.log(`Starting execution...`);
}
```

---

## State Sharing Architecture

### Directory Structure

```
.sisyphus/
├── research/                    # Athena's output
│   └── {topic}-research.md      # Research findings
│
├── plans/                       # Prometheus's output
│   ├── {topic}-prd.md           # Product Requirements
│   ├── {topic}-architecture.md  # System Design
│   └── {topic}-tasks.md         # Task Breakdown
│
├── drafts/                      # Working notes (any agent)
│   └── {topic}-draft.md
│
├── notepads/                    # Multi-agent coordination
│   └── {topic}/
│       ├── contracts/           # API contracts
│       ├── decisions/           # Architecture decisions
│       └── status/              # Progress updates
│
└── boulder/                     # Active work session
    └── state.json               # Current state
```

### State Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         Athena                               │
│                                                              │
│  Reads: Nothing (starts fresh)                              │
│  Writes: .sisyphus/research/{topic}-research.md             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       Prometheus                             │
│                                                              │
│  Reads: .sisyphus/research/{topic}-research.md              │
│  Writes:                                                    │
│    - .sisyphus/plans/{topic}-prd.md                         │
│    - .sisyphus/plans/{topic}-architecture.md                │
│    - .sisyphus/plans/{topic}-tasks.md                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        Sisyphus                              │
│                                                              │
│  Reads:                                                     │
│    - .sisyphus/plans/{topic}-prd.md                         │
│    - .sisyphus/plans/{topic}-architecture.md                │
│    - .sisyphus/plans/{topic}-tasks.md                       │
│  Writes:                                                    │
│    - Source code                                            │
│    - docs/agent/project-context.md                          │
│    - .sisyphus/notepads/{topic}/status/                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: State Sharing (Foundation)

#### 1.1 Create State Reading Utilities

**File**: `src/features/orchestration-state/reader.ts`

```typescript
export function findLatestResearch(dir: string): string | null;
export function findLatestPlan(dir: string): PlanDocuments | null;
export function readResearchDocument(path: string): ResearchDocument;
export function readPlanDocuments(path: string): PlanDocuments;
```

#### 1.2 Create State Writing Utilities

**File**: `src/features/orchestration-state/writer.ts`

```typescript
export function saveResearchDocument(dir: string, research: ResearchDocument);
export function savePlanDocuments(dir: string, plan: PlanDocuments);
```

#### 1.3 Create Handoff Signal Detection

**File**: `src/features/orchestration-state/handoff.ts`

```typescript
export function detectAthenaHandoff(response: string): HandoffSignal | null;
export function detectPrometheusHandoff(response: string): HandoffSignal | null;
```

---

### Phase 2: Agent Startup Logic

#### 2.1 Athena Startup

**File**: `src/agents/athena.ts` (in prompt)

```
On startup:
1. Check if .sisyphus/research/ has existing research
2. If exists: "I see previous research. Would you like to continue or start fresh?"
3. If not: Start fresh research process
```

#### 2.2 Prometheus Startup

**File**: `src/agents/prometheus-prompt.ts`

```
On startup:
1. Check for .sisyphus/research/{topic}-research.md
2. If exists: "I found Athena's research. Using it for planning..."
3. If not: Ask minimal questions (don't do deep research)
4. Check for existing plans to continue
```

#### 2.3 Sisyphus Startup

**File**: `src/agents/sisyphus.ts`

```
On startup:
1. Check for .sisyphus/plans/
2. If plan exists: "I found an approved plan. Starting execution..."
3. If not: Check if request is clear enough to execute
4. If vague: Suggest Athena or Prometheus
```

CRITICAL: we need to account for one thing here. What if previous plans exist and this is a new session? Will sispphus get confused? Will it start working on something that has already been done? We need to think of something smart here. In the future we will revamp this with a dependency graph. For now we need a simple solution that works.

---

### Phase 3: Handoff Hooks

#### 3.1 Athena Handoff Hook

**File**: `src/hooks/athena-handoff/index.ts`

```typescript
export function createAthenaHandoffHook(ctx) {
  return {
    "assistant.message": async (input, output) => {
      // Detect <athena-handoff> signal
      // When detected:
      // 1. Show toast: "Research complete"
      // 2. Suggest: "Switch to Prometheus mode"
      // 3. (Future) Auto-switch if configured
    },
  };
}
```

#### 3.2 Prometheus Handoff Hook

**File**: `src/hooks/prometheus-handoff/index.ts`

```typescript
export function createPrometheusHandoffHook(ctx) {
  return {
    "assistant.message": async (input, output) => {
      // Detect <prometheus-handoff> signal
      // When detected:
      // 1. Show toast: "Plan complete"
      // 2. Suggest: "Switch to Sisyphus mode"
      // 3. (Future) Auto-switch if configured
    },
  };
}
```

---

### Phase 4: Intent-Based Routing (Future)

This requires OpenCode SDK changes but we can prepare:

CRITICAL: We will fork opencode in the future and perform this to work. For now the user will just have to press (shift+tab) to switch modes. The agent just needs to inform it "Switch to this mode.. etc"

#### 4.1 Intent Analyzer Enhancement

**File**: `src/hooks/intent-gate/analyzer.ts` (modify)

Add agent recommendation to analysis:

```typescript
interface IntentAnalysis {
  confidence: number;
  classification: string;
  suggestedQuestions: string[];
  // NEW
  recommendedAgent: "Athena" | "Prometheus" | "Sisyphus";
  agentReason: string;
}
```

#### 4.2 Frontend Guidance (Plugin-Level)

Until SDK supports auto-routing, we can:

1. Inject agent suggestions into responses
2. Show guidance in debug mode
3. Toast recommendations on startup

---

## Flexible Workflows (User Choice)

### The system MUST support different entry points:

#### Entry Point 1: Full Workflow (Recommended for New Ideas)

```
Athena → Prometheus → Sisyphus
```

#### Entry Point 2: Skip Research (Know What You Want)

```
Prometheus → Sisyphus
```

#### Entry Point 3: Direct Execution (Clear Task)

```
Sisyphus (direct)
```

#### Entry Point 4: Research Only

```
Athena → User takes findings elsewhere
```

#### Entry Point 5: Planning Only

```
Prometheus → User takes plan elsewhere
```

### Implementation

Each agent checks for prior work but doesn't REQUIRE it:

```typescript
// Prometheus example
const research = findLatestResearch(dir);
if (research) {
  // Use research findings
} else {
  // Ask minimal questions, proceed without research
  // This is fine for experienced users
}
```

---

## Coordination Artifacts

### Topic Discovery

All agents need to know the current "topic" to find related files:

```typescript
// Derive topic from:
// 1. Explicit user mention: "the social calculator"
// 2. Latest file in .sisyphus/: social-calculator-research.md → "social-calculator"
// 3. Boulder state: state.plan_name
// 4. Ask user if ambiguous
```

### File Naming Convention

```
{topic-slug}-research.md      # Athena
{topic-slug}-prd.md           # Prometheus
{topic-slug}-architecture.md  # Prometheus
{topic-slug}-tasks.md         # Prometheus
```

Where `topic-slug` is kebab-case of the topic (e.g., "social-calculator").

---

## Success Criteria

Orchestration is complete when:

1. ✅ Athena → Prometheus handoff works (natural language)
2. ✅ Prometheus → Sisyphus handoff works (no `/start-work`)
3. ✅ State is shared via .sisyphus/ files
4. ✅ Each agent reads prior work on startup
5. ✅ Users can enter at any point
6. ✅ Experienced users can skip phases
7. ✅ Clear guidance shown when agent mismatch

---

## Priority

**CRITICAL** - Without orchestration, the three agents don't work together.

## Estimated Effort

- State utilities: 3-4 hours
- Agent startup logic: 3-4 hours per agent
- Handoff hooks: 3-4 hours
- Testing: 3-4 hours

**Total: ~15-20 hours** (after agents are implemented)

---

## Risks & Mitigations

### Risk 1: Topic Confusion

**Problem**: System can't figure out which topic user is working on
**Mitigation**:

- Explicit topic in boulder state
- Ask user if multiple topics exist
- Most recent file as fallback

### Risk 2: Stale State

**Problem**: User modified plan manually, Sisyphus has outdated view
**Mitigation**:

- Always re-read files on startup
- Checksum/hash to detect changes
- Warn if files changed since last read

### Risk 3: Missing Handoff

**Problem**: Agent forgets to emit handoff signal
**Mitigation**:

- Enforce in agent prompts
- Detect implicit completion (e.g., "plan is ready")
- Hook fallback detection

### Risk 4: User Impatience

**Problem**: User wants to skip research/planning
**Mitigation**:

- Allow it! Each agent handles missing prior work gracefully
- Suggest but don't require the full workflow
- "You can skip to Sisyphus, but you might need to answer more questions"

---

## Future: Automatic Routing

When OpenCode SDK supports plugin-driven agent selection:

```typescript
// In chat.message hook
const analysis = analyzeIntent(userMessage);
if (analysis.recommendedAgent !== currentAgent) {
  output.agent = analysis.recommendedAgent; // SDK respects this
  output.parts.push({
    type: "text",
    text: `Routing to ${analysis.recommendedAgent} because: ${analysis.agentReason}`,
  });
}
```

Until then, we rely on:

1. User selection
2. Agent suggestions
3. Natural language handoffs
