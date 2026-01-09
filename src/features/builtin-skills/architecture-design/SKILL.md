---
name: architecture-design
description:
  Designs system architecture from PRD requirements. Creates component
  breakdown, file structure, data flow, and task list. Used by Plan agent for
  design and Oracle agent for review.
---

## Prerequisite: Project Context (Mandatory)

Before applying any guidance from this skill:

1. **Check for project context:**

   - Read `docs/agent/project-context.md`
   - If it doesn't exist: STOP. Load `project-onboarding` skill first.

2. **Follow project conventions:**
   - The conventions in project-context.md OVERRIDE defaults in this skill
   - If project uses different patterns, match THEIR patterns
   - Only use this skill's defaults when project has no equivalent

Do not proceed with this skill until project context exists and has been reviewed.

# Architecture Design

You transform requirements into implementable structure. Your output is the
blueprint that Sisyphus executes.

---

## When This Skill Applies

**Creating Architecture (Plan Agent):**

- PRD is complete and approved
- Need to design technical approach before coding
- Breaking down a large feature into components

**Reviewing Architecture (Oracle Agent):**

- Evaluating proposed technical approach
- Identifying risks, gaps, or overengineering
- Suggesting improvements before implementation

---

## Input Requirements

Before designing architecture, you must have:

- [ ] PRD with functional requirements
- [ ] Success criteria defined
- [ ] Constraints identified (tech stack, timeline, etc.)

If these don't exist, stop and create them first using `problem-framing` and `prd-creation` skills.

---

## Phase 1: System Overview

Start with a 2-3 sentence summary answering:

- What is being built?
- What are the major parts?
- How do they connect?

### Example:

```
Building a project management dashboard. Three main parts:
1. Next.js frontend with React components for UI
2. API routes + Server Actions for data operations
3. PostgreSQL database via Prisma for persistence

Frontend calls API/Actions → Services process logic → Database stores state
```

---

## Phase 2: Component Breakdown

### Next.js App Structure

```
app/
├── (auth)/                    # Route group: auth pages
│   ├── login/page.tsx
│   └── register/page.tsx
│
├── (dashboard)/               # Route group: authenticated pages
│   ├── layout.tsx             # Shared dashboard layout
│   ├── page.tsx               # Dashboard home
│   └── projects/
│       ├── page.tsx           # Project list
│       ├── [id]/
│       │   └── page.tsx       # Project detail
│       └── new/
│           └── page.tsx       # Create project
│
├── api/                       # API routes (external/webhooks)
│   └── webhooks/
│       └── stripe/route.ts
│
└── actions/                   # Server Actions (internal mutations)
    ├── auth.ts
    └── projects.ts
```

### Supporting Structure

```
src/
├── components/
│   ├── ui/                    # Generic UI (Button, Input, Modal)
│   ├── forms/                 # Form components
│   └── [feature]/             # Feature-specific components
│
├── services/                  # Business logic (NO framework imports)
│   ├── auth.ts
│   └── projects.ts
│
├── lib/
│   ├── db.ts                  # Database client
│   ├── auth.ts                # Auth utilities
│   └── utils.ts               # General utilities
│
├── types/
│   └── index.ts               # Shared TypeScript types
│
└── schemas/
    └── [resource].ts          # Zod schemas per resource
```

---

## Phase 3: Layer Responsibilities

### The Clean Architecture for Next.js

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION                            │
│  React Components, Pages, Layouts                           │
│  • Renders UI                                                │
│  • Handles user interactions                                 │
│  • Calls Actions or fetches from API                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API / ACTIONS                             │
│  Route Handlers, Server Actions                             │
│  • Validates input (Zod)                                    │
│  • Calls Services                                           │
│  • Formats responses                                        │
│  • THIN: No business logic here                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SERVICES                                │
│  Pure TypeScript functions                                  │
│  • Business logic lives here                                │
│  • Framework agnostic (no Next.js imports)                  │
│  • Calls database layer                                     │
│  • Testable in isolation                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                                │
│  Prisma Client, Repositories                                │
│  • Data access only                                         │
│  • No business logic                                        │
│  • Returns typed data                                       │
└─────────────────────────────────────────────────────────────┘
```

### Import Rules (Enforce Direction)

| Layer       | Can Import From               | Cannot Import From      |
| ----------- | ----------------------------- | ----------------------- |
| Components  | Services, Types, Schemas, Lib | -                       |
| API/Actions | Services, Types, Schemas, Lib | Components              |
| Services    | Types, Lib, DB                | Components, API/Actions |
| DB/Lib      | Types only                    | Everything else         |

---

## Phase 4: Data Flow Diagram

For each major feature, document:

```
[User Action]
    → [Component]
    → [Action/API]
    → [Service]
    → [Database]
    → [Response]
    → [UI Update]
```

### Example: Create Project

```
User clicks "Create Project" button
    → CreateProjectForm component
    → createProject Server Action
    → projectService.create()
    → prisma.project.create()
    → Returns new project
    → revalidatePath('/projects')
    → UI shows new project in list
```

---

## Phase 5: Task Breakdown

This is the most critical output. Tasks feed directly into Sisyphus's TODO system.

### Task Requirements

Each task MUST be:

- **Completable in one session** (< 2 hours)
- **Testable** (has clear pass/fail criteria)
- **Independent** (minimal dependencies on incomplete tasks)
- **Routed** (assigned to correct agent)

### Task Format

```markdown
### T-001: [Brief Title]

**Description:** What needs to be built/done

**Agent:** Sisyphus | @frontend-ui-ux-engineer | @oracle

**Files:**

- Create: `path/to/new/file.ts`
- Modify: `path/to/existing/file.ts`

**Dependencies:** T-XXX (or "None")

**Acceptance Criteria:**

- [ ] Specific testable criterion
- [ ] Another criterion

**Tests:**

- Unit: `description of unit test`
- Integration: `description if needed`

**Complexity:** S (< 30min) | M (30min-2hr) | L (2hr+)
```

### Agent Routing Rules

| Task Type                      | Agent                    | Why               |
| ------------------------------ | ------------------------ | ----------------- |
| Database schema, migrations    | Sisyphus                 | Backend work      |
| Service layer functions        | Sisyphus                 | Business logic    |
| API routes, Server Actions     | Sisyphus                 | Backend contracts |
| React components, pages        | @frontend-ui-ux-engineer | UI work           |
| Styling, animations            | @frontend-ui-ux-engineer | Visual work       |
| Complex architecture decisions | @oracle                  | Needs review      |
| Type definitions, schemas      | Sisyphus                 | Shared contracts  |

### Task Ordering Strategy

```
1. Foundation (No dependencies)
   ├── T-001: Database schema
   ├── T-002: Type definitions
   └── T-003: Zod schemas

2. Core Services (Depends on Foundation)
   ├── T-004: Service layer
   └── T-005: Service tests

3. API Layer (Depends on Services)
   ├── T-006: API routes / Actions
   └── T-007: API tests

4. UI Components (Can parallel with API)
   ├── T-008: Base UI components
   └── T-009: Feature components

5. Integration (Depends on API + UI)
   ├── T-010: Wire up components to API
   └── T-011: E2E tests
```

---

## Phase 6: Technology Decisions

Document key decisions with rationale:

| Decision         | Choice                      | Alternatives                   | Rationale                             |
| ---------------- | --------------------------- | ------------------------------ | ------------------------------------- |
| State Management | Server Components + Actions | Redux, Zustand                 | Less client JS, simpler mental model  |
| Forms            | React Hook Form + Zod       | Formik                         | Better TS integration, smaller bundle |
| Styling          | Tailwind CSS                | CSS Modules, styled-components | Utility-first, good DX                |
| Database         | PostgreSQL + Prisma         | MongoDB, Drizzle               | Relational data, type safety          |
| Auth             | NextAuth.js                 | Clerk, Auth0                   | Self-hosted, flexible                 |

---

## Phase 7: Risk Assessment

| Risk               | Likelihood | Impact | Mitigation              |
| ------------------ | ---------- | ------ | ----------------------- |
| [Technical risk]   | L/M/H      | L/M/H  | [How to prevent/handle] |
| [Integration risk] | L/M/H      | L/M/H  | [How to prevent/handle] |
| [Performance risk] | L/M/H      | L/M/H  | [How to prevent/handle] |

---

## Output Template

Create two documents:

### Document 1: `docs/architecture/{feature}-architecture.md`

```markdown
# Architecture: {Feature Name}

**Date:** {date}
**PRD:** {link to PRD}
**Status:** Draft | Review | Approved

## Overview

{2-3 sentence summary}

## System Diagram

{ASCII diagram of components and data flow}

## Component Breakdown

{File structure with explanations}

## Data Flow

{For each major operation}

## Technology Decisions

{Table of decisions with rationale}

## Risks

{Risk assessment table}

## Open Questions

- [ ] {Decisions that need input}
```

### Document 2: `docs/architecture/{feature}-tasks.md`

```markdown
# Tasks: {Feature Name}

**Architecture:** {link}
**Total Tasks:** {count}
**Estimated Effort:** {S/M/L breakdown}

## Dependency Graph

{ASCII showing task dependencies}

## Foundation Layer

### T-001: {Title}

{Full task details}

## Service Layer

### T-002: {Title}

{Full task details}

## API Layer

...

## UI Layer

...

## Integration

...

## Task Summary

| ID  | Title | Agent | Complexity | Dependencies |
| --- | ----- | ----- | ---------- | ------------ |
```

---

## Architecture Review Checklist (For Oracle)

When reviewing architecture:

- [ ] **Separation of Concerns:** Is business logic in services, not routes/components?
- [ ] **Testability:** Can services be unit tested without mocking frameworks?
- [ ] **Import Direction:** Do imports flow downward (UI → API → Service → DB)?
- [ ] **Task Granularity:** Are tasks small enough for TDD cycles?
- [ ] **Agent Routing:** Are tasks assigned to correct specialists?
- [ ] **Missing Pieces:** Are there gaps between PRD requirements and tasks?
- [ ] **Overengineering:** Is anything more complex than needed for requirements?
- [ ] **Risk Coverage:** Are high-risk areas identified with mitigations?

---

## Anti-Patterns to Avoid

| 🚫 Don't                         | ✅ Do Instead                       |
| -------------------------------- | ----------------------------------- |
| Put business logic in API routes | Create service functions            |
| Import React in service files    | Keep services framework-agnostic    |
| Create 50+ line tasks            | Break into smaller, testable pieces |
| Skip the data flow diagram       | Document how data moves             |
| Leave agent routing ambiguous    | Explicitly assign each task         |
| Design for future requirements   | Design for current PRD only         |
| Create circular dependencies     | Enforce one-way import direction    |

```

```
