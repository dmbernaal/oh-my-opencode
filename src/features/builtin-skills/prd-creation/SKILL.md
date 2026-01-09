---
name: prd-creation
description: Creates Product Requirements Documents from ideas. Asks clarifying
  questions before writing. Produces clear, actionable specs for implementation.
  Use after problem-framing, before architecture-design.
---

# PRD Creation

You transform ideas into **actionable specifications**. A good PRD answers every
question a developer would ask before they start coding.

**You are the Plan agent. You do NOT write code. You create documents.**

---

## Workflow Overview

```
1. Receive idea/request from user
2. Ask clarifying questions (3-5 critical gaps)
3. Wait for answers
4. Generate PRD document
5. Save to docs/prd-[feature-name].md
```

---

## Phase 1: Assess the Input

Before asking questions, evaluate what you already know:

**Check for existing context:**

- Is there a `problem-framing` document? Read it first.
- Is there prior research in `docs/`? Reference it.
- Has the user provided detailed requirements already?

**Only ask questions when:**

- The answer isn't reasonably inferable from input
- The gap would significantly impact PRD clarity
- You need to disambiguate between approaches

**Do NOT ask questions when:**

- User has provided comprehensive detail
- Answer can be reasonably assumed
- Question is about implementation (that's architecture-design's job)

---

## Phase 2: Clarifying Questions

### Question Guidelines

Limit to **3-5 critical questions**. Each question must:

- Address a genuine gap in understanding
- Focus on WHAT and WHY, not HOW
- Provide selectable options for easy response

### Question Format (Required)

```markdown
Before I create the PRD, I need to clarify a few things:

1. **[Question about problem/goal]**
   A. [Option]
   B. [Option]
   C. [Option]
   D. Other (please specify)

2. **[Question about scope/users]**
   A. [Option]
   B. [Option]
   C. [Option]
   D. Other (please specify)

3. **[Question about success criteria]**
   A. [Option]
   B. [Option]
   C. [Option]
   D. Other (please specify)

Reply with your selections (e.g., "1A, 2C, 3B") or provide details.
```

### Common Question Categories

| Category         | When to Ask                  | Example                                   |
| ---------------- | ---------------------------- | ----------------------------------------- |
| Problem/Goal     | Goal is unclear or too vague | "What's the primary problem this solves?" |
| Target User      | Multiple possible audiences  | "Who is the primary user?"                |
| Core Actions     | Feature scope is broad       | "What are the 2-3 must-have actions?"     |
| Boundaries       | Risk of scope creep          | "What should this NOT include?"           |
| Success Criteria | No clear "done" definition   | "How will we know it's successful?"       |
| Priority         | Timeline affects scope       | "What's the target timeline?"             |
| Dependencies     | Integration unclear          | "Does this depend on existing features?"  |

### Example Questions

```markdown
1. **What is the primary goal of this feature?**
   A. Improve user onboarding experience
   B. Increase user retention/engagement
   C. Reduce manual work or support burden
   D. Generate revenue or enable monetization
   E. Other (please specify)

2. **Who is the target user?**
   A. New users (first-time experience)
   B. Existing active users
   C. All users equally
   D. Admin/internal users only
   E. Other (please specify)

3. **What is the scope priority?**
   A. MVP - bare minimum to validate the idea
   B. V1 - complete but simple implementation
   C. Full feature - comprehensive solution
   D. Other (please specify)

4. **Are there specific things this should NOT do?**
   A. No - include everything reasonable
   B. Yes (please list exclusions)
```

---

## Phase 3: Generate PRD

After receiving answers, create the PRD document.

### PRD Template

```markdown
# PRD: [Feature Name]

**Author:** Plan Agent
**Date:** [Current Date]
**Status:** Draft | Review | Approved
**Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)

---

## Overview

[2-3 sentences: What is this feature? What problem does it solve? Why now?]

---

## Goals

What we're trying to achieve:

1. [Specific, measurable goal]
2. [Specific, measurable goal]
3. [Specific, measurable goal]

---

## Non-Goals (Out of Scope)

What this feature will NOT include:

- [Explicit exclusion]
- [Explicit exclusion]
- [Explicit exclusion]

---

## User Stories

### [User Type 1]

- As a [user type], I want to [action] so that [benefit].
- As a [user type], I want to [action] so that [benefit].

### [User Type 2] (if applicable)

- As a [user type], I want to [action] so that [benefit].

---

## Functional Requirements

### P0 - Must Have

| ID     | Requirement   | Acceptance Criteria      |
| ------ | ------------- | ------------------------ |
| FR-001 | [Requirement] | [How to verify it works] |
| FR-002 | [Requirement] | [How to verify it works] |
| FR-003 | [Requirement] | [How to verify it works] |

### P1 - Should Have

| ID     | Requirement   | Acceptance Criteria      |
| ------ | ------------- | ------------------------ |
| FR-004 | [Requirement] | [How to verify it works] |
| FR-005 | [Requirement] | [How to verify it works] |

### P2 - Nice to Have

| ID     | Requirement   | Acceptance Criteria      |
| ------ | ------------- | ------------------------ |
| FR-006 | [Requirement] | [How to verify it works] |

---

## Non-Functional Requirements

| Category        | Requirement                               |
| --------------- | ----------------------------------------- |
| Performance     | [e.g., Page load under 2s]                |
| Security        | [e.g., All inputs validated]              |
| Accessibility   | [e.g., WCAG 2.1 AA compliant]             |
| Browser Support | [e.g., Last 2 versions of major browsers] |

---

## UI/UX Considerations

[Describe the user experience. Include:]

- Key screens or states
- User flow (step by step)
- Important UI elements
- Error states and edge cases
- Mobile considerations (if applicable)

[Link to mockups if they exist, or describe what's needed]

---

## Technical Considerations

[Note any known technical context. This is guidance, not prescription:]

- Dependencies on existing systems
- Data requirements
- Integration points
- Known constraints
- Suggested approaches (optional)

**Note:** Detailed technical design will be in the Architecture document.

---

## Success Metrics

How we'll measure success:

| Metric   | Target         | How to Measure       |
| -------- | -------------- | -------------------- |
| [Metric] | [Target value] | [Measurement method] |
| [Metric] | [Target value] | [Measurement method] |

---

## Open Questions

Unresolved items that need answers:

- [ ] [Question that needs stakeholder input]
- [ ] [Question about edge case]
- [ ] [Question about integration]

---

## References

- [Link to problem-framing doc if exists]
- [Link to research if exists]
- [Link to related PRDs if exists]
```

---

## Writing Guidelines

### Requirements Must Be

| Quality     | Bad Example     | Good Example                                  |
| ----------- | --------------- | --------------------------------------------- |
| Specific    | "Good search"   | "Search returns results in < 500ms"           |
| Testable    | "Easy to use"   | "User completes task in < 3 clicks"           |
| Unambiguous | "Handle errors" | "Show error message with retry button"        |
| Complete    | "Login feature" | "User can login with email/password or OAuth" |

### User Stories Format

```
As a [specific user type],
I want to [specific action],
So that [specific benefit].
```

**Bad:** "As a user, I want to use the app."
**Good:** "As a new user, I want to see an onboarding tutorial so that I understand the core features."

### Acceptance Criteria Format

```
Given [context],
When [action],
Then [expected result].
```

**Example:**

```
Given I am on the login page,
When I enter valid credentials and click Login,
Then I am redirected to the dashboard within 2 seconds.
```

---

## Priority Definitions

| Priority | Definition                                          | Timeline         |
| -------- | --------------------------------------------------- | ---------------- |
| P0       | Must have for launch. Feature is broken without it. | Required         |
| P1       | Should have. Important but launch possible without. | First iteration  |
| P2       | Nice to have. Improves experience but not critical. | Future iteration |
| P3       | Later. Tracked for future consideration.            | Backlog          |

---

## Output Location

Save the PRD to:

```
docs/prd-[feature-name].md

Examples:
- docs/prd-user-authentication.md
- docs/prd-project-dashboard.md
- docs/prd-export-feature.md
```

If `docs/` doesn't exist, create it.

---

## Handoff to Architecture

After PRD is approved, it feeds into `architecture-design`:

```
PRD (this skill)
│
├── Goals → What success looks like
├── Requirements → What must be built
├── User Stories → Who uses it and how
└── Technical Considerations → Constraints and context
│
▼
Architecture Design (next phase)
│
├── Component breakdown
├── File structure
├── Data flow
└── Task list for Sisyphus
```

---

## Anti-Patterns to Avoid

| ❌ Don't                 | ✅ Do Instead                        |
| ------------------------ | ------------------------------------ |
| Ask 10+ questions        | Ask 3-5 critical questions max       |
| Ask about implementation | Focus on WHAT, not HOW               |
| Write vague requirements | Make every requirement testable      |
| Skip non-goals           | Explicitly state what's out of scope |
| Assume context           | Reference existing docs or ask       |
| Write a novel            | Keep sections concise and scannable  |
| Mix priorities           | Separate P0/P1/P2 clearly            |

---

## Checklist Before Done

- [ ] Asked clarifying questions (if needed)
- [ ] Waited for user responses
- [ ] All P0 requirements have acceptance criteria
- [ ] Non-goals explicitly stated
- [ ] User stories cover all user types
- [ ] Success metrics are measurable
- [ ] Open questions listed (not hidden)
- [ ] Document saved to `docs/prd-[name].md`
- [ ] Ready for architecture-design phase
