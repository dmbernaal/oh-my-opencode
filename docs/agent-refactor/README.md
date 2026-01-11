# Agent Refactor Plan

**Date**: 2026-01-11  
**Status**: Planning Complete - Ready for Implementation

---

## Overview

This directory contains the comprehensive plan to refactor the Oh-My-OpenCode agent system into a clear three-agent workflow:

| Agent | Role | Status |
|-------|------|--------|
| **Athena** | Research & Understanding | NEW - To Create |
| **Prometheus** | Planning & Architecture | EXISTS - Refactor |
| **Sisyphus** | Building & Execution | EXISTS - Refactor |

---

## The Ideal Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INPUT                               │
│         "I have an idea for a social calculator"            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  🔬 ATHENA (Research)                        │
│                                                              │
│  • Understands the goal                                     │
│  • Conducts deep research via multi-agent orchestration     │
│  • Presents options and recommendations                     │
│  • Gets user approval on direction                          │
│                                                              │
│  Output: .sisyphus/research/{topic}-research.md             │
└──────────────────────────┬──────────────────────────────────┘
                           │ "Switch to Prometheus"
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                📋 PROMETHEUS (Planning)                      │
│                                                              │
│  • Reads research findings                                  │
│  • Creates PRD with user stories                            │
│  • Designs system architecture                              │
│  • Breaks down into tasks                                   │
│                                                              │
│  Output: .sisyphus/plans/{topic}-prd.md                     │
│          .sisyphus/plans/{topic}-architecture.md            │
│          .sisyphus/plans/{topic}-tasks.md                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ "Switch to Sisyphus"
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                🔨 SISYPHUS (Building)                        │
│                                                              │
│  • Reads the approved plan                                  │
│  • Executes tasks in order                                  │
│  • Delegates to specialists                                 │
│  • Verifies against PRD criteria                            │
│                                                              │
│  Output: Working code, verified                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Plan Documents

### [athena.md](./athena.md)
- Why Athena is needed
- Role & responsibilities  
- Workflow with examples
- Output artifacts
- Implementation plan
- Success criteria

### [prometheus.md](./prometheus.md)
- Current state vs target state
- Role & responsibilities (refactored)
- Three-document output (PRD, Architecture, Tasks)
- Changes required
- Handoff protocol

### [sisyphus.md](./sisyphus.md)
- Current state vs target state
- Three execution modes (Plan, Direct, Fallback)
- Role & responsibilities (refactored)
- Delegation logic
- Verification protocol

### [orchestration.md](./orchestration.md)
- Current state (broken handoffs)
- Target state (seamless flow)
- The three handoffs
- State sharing architecture
- Implementation plan
- Flexible workflows

---

## Key Principles

### 1. Clear Separation of Concerns
Each agent has ONE job:
- **Athena**: Understand (research)
- **Prometheus**: Plan (documents)
- **Sisyphus**: Build (code)

### 2. No Redundant Questions
- Athena asks understanding questions
- Prometheus asks planning questions (if no research)
- Sisyphus asks clarification questions (if vague)
- **NO OVERLAP**

### 3. Natural Handoffs
- No `/start-work` commands
- "Ready? Yes" → automatic transition
- State shared via .sisyphus/ files

### 4. Flexible Entry Points
Users can:
- Start full workflow: Athena → Prometheus → Sisyphus
- Skip research: Prometheus → Sisyphus
- Skip planning: Sisyphus (clear instructions)
- Research only: Athena → take findings elsewhere

---

## Implementation Order

### Phase 1: Athena (New Agent)
1. Create agent definition
2. Implement research orchestration
3. Create research storage
4. Test research workflow

### Phase 2: Prometheus (Refactor)
1. Update prompt for plan-first workflow
2. Add research consumption
3. Create three-document templates
4. Remove `/start-work` requirement

### Phase 3: Sisyphus (Refactor)
1. Update prompt for execution-only
2. Add plan consumption
3. Add fallback behavior (suggest other agents)
4. Test plan execution

### Phase 4: Orchestration
1. Implement state sharing utilities
2. Create handoff detection hooks
3. Test full workflow
4. Add intent-based routing hints

---

## Estimated Total Effort

| Phase | Hours |
|-------|-------|
| Athena (new) | 10-13 |
| Prometheus (refactor) | 10-13 |
| Sisyphus (refactor) | 10-14 |
| Orchestration | 15-20 |
| **Total** | **45-60 hours** |

---

## Success Criteria (Overall)

The refactor is complete when:

1. ✅ User can say "I have an idea" and get guided through full workflow
2. ✅ Each agent does ONE job without overlap
3. ✅ Handoffs are natural language, no commands
4. ✅ State flows through .sisyphus/ files
5. ✅ Experienced users can skip phases
6. ✅ Clear guidance when using wrong agent for task

---

## Dependencies

### Existing Infrastructure (Ready)
- .sisyphus/ directory structure ✅
- Notepad system for coordination ✅
- librarian/explore subagents ✅
- sisyphus_task tool ✅
- Intent Gate for confidence ✅

### Needs Implementation
- Athena agent (new)
- Research storage system
- Prometheus three-document templates
- Sisyphus plan-reading logic
- Handoff detection hooks
- State sharing utilities

---

## Getting Started

1. **Read each plan document** in order:
   - athena.md
   - prometheus.md
   - sisyphus.md
   - orchestration.md

2. **Start with Athena** (new agent is cleanest to implement)

3. **Then refactor Prometheus** (least risk, just document output)

4. **Then refactor Sisyphus** (most complex, needs plan reading)

5. **Finally orchestration** (ties everything together)

---

## Notes

- Each document is self-contained with full implementation details
- Estimated hours are conservative - may be faster
- Can ship incrementally (each agent improvement is valuable alone)
- Future: OpenCode SDK support for automatic routing would complete the vision
