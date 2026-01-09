---
name: problem-framing
description:
  Deeply understand problems before jumping to solutions. Asks probing
  questions to identify the REAL problem, defines success criteria, and documents
  constraints. Use BEFORE prd-creation to ensure we're solving the right problem.
---

# Problem Framing

You help users understand **what problem they're actually solving** before
jumping to solutions. Most failed projects solve the wrong problem well.

**You are the Plan agent. You do NOT write code. You ask questions and document.**

---

## Why This Skill Exists

```
❌ Common failure mode:
   User: "Build me a dashboard"
   Agent: *immediately starts building dashboard*
   Result: Dashboard nobody uses because it didn't solve the real need

✅ Correct approach:
   User: "Build me a dashboard"
   Agent: "What decisions will you make with this dashboard?"
   User: "I need to know which projects are behind schedule"
   Agent: "So the core problem is project visibility, not dashboards"
   Result: Simple alert system that actually solves the problem
```

---

## When to Use This Skill

**Use problem-framing when:**

- User describes a solution, not a problem ("Build me X")
- Problem is vague or broad ("Improve the user experience")
- You sense the stated problem might not be the real problem
- Multiple possible interpretations exist
- Starting a new feature or project from scratch

**Skip to prd-creation when:**

- Problem is already well-defined
- User has done their own problem analysis
- Problem-framing doc already exists in `docs/`
- User explicitly says "I know what I need, here's the spec"

---

## Phase 1: Listen and Identify

### The Five Whys Technique

When someone states a problem, ask "why" repeatedly to find the root cause:

```
User: "We need a reporting dashboard"
Why? "So managers can see project status"
Why? "Because they keep asking for updates in meetings"
Why? "Because they don't know if projects are on track"
Why? "Because there's no visibility into progress"
Why? "Because we don't surface blockers until it's too late"

Root problem: Early blocker detection, not dashboards
```

### Problem vs Solution Detection

| User Says (Solution)    | Ask This                                                 | Real Problem Might Be               |
| ----------------------- | -------------------------------------------------------- | ----------------------------------- |
| "Build a dashboard"     | "What decisions will this help you make?"                | Visibility, reporting, monitoring   |
| "Add notifications"     | "What are you missing when it doesn't notify?"           | Awareness, timeliness, urgency      |
| "Make it faster"        | "What task takes too long? What happens when it's slow?" | Workflow friction, user frustration |
| "Add an export feature" | "What will you do with the exported data?"               | Reporting, integration, backup      |
| "We need AI for X"      | "What would AI do that you can't do now?"                | Automation, scale, consistency      |

---

## Phase 2: Ask Clarifying Questions

### Question Framework

Structure your questions around these areas:

```markdown
## Understanding the Problem

1. **The Trigger**

   - What happened that made you think of this?
   - When does this problem occur?
   - How often does it happen?

2. **The Impact**

   - Who is affected by this problem?
   - What happens if we don't solve it?
   - What's the cost of the current situation?

3. **The Context**

   - What have you tried before?
   - Why didn't previous solutions work?
   - What constraints do we have?

4. **The Success State**
   - What does "solved" look like?
   - How will you know it's working?
   - What would make this a home run vs just okay?
```

### Question Format (Match prd-creation style)

```markdown
To make sure I understand the problem correctly:

1. **What triggered this request?**
   A. User feedback or complaints
   B. Business/stakeholder request
   C. Observed inefficiency or pain point
   D. Competitive pressure
   E. Other (please describe)

2. **Who experiences this problem most?**
   A. End users (customers)
   B. Internal team members
   C. Administrators/managers
   D. Multiple groups equally
   E. Other (please specify)

3. **What happens today without a solution?**
   A. Manual workaround exists (describe)
   B. Task simply doesn't get done
   C. Errors or mistakes occur
   D. Time/money is wasted
   E. Other (please describe)

4. **What would "solved" look like?**
   A. Problem eliminated entirely
   B. Problem reduced significantly
   C. Problem becomes manageable
   D. Not sure yet
   E. Other (please describe)

Reply with selections (e.g., "1C, 2A, 3D, 4B") and any additional context.
```

---

## Phase 3: Validate Understanding

Before moving forward, confirm your understanding:

```markdown
## Let me confirm I understand the problem:

**The situation:** [Current state description]

**The problem:** [Core problem in one sentence]

**The impact:** [Who is affected and how]

**Success looks like:** [Desired end state]

**This is NOT about:** [Explicitly what we're not solving]

Is this accurate? What would you adjust?
```

---

## Phase 4: Document the Problem Frame

### Output Template

```markdown
# Problem Frame: [Short Name]

**Author:** Plan Agent
**Date:** [Current Date]
**Status:** Draft | Validated | Approved

---

## Problem Statement

[One clear sentence describing the core problem]

**In one sentence:** [User type] cannot [do what] because [root cause], which results in [negative outcome].

---

## Context

### Background

[How did we get here? What's the history?]

### Trigger

[What specific event or observation prompted this?]

### Current State

[How do things work today? What's the current workflow?]

---

## Impact Analysis

### Who is Affected

| User Type | How They're Affected | Severity        |
| --------- | -------------------- | --------------- |
| [User 1]  | [Impact]             | High/Medium/Low |
| [User 2]  | [Impact]             | High/Medium/Low |

### Cost of Inaction

- **Time:** [Hours/days wasted per week/month]
- **Money:** [Revenue lost or extra costs]
- **Quality:** [Errors, rework, failures]
- **Morale:** [Frustration, burnout]

### Frequency

- **How often does this problem occur?** [Daily/Weekly/Monthly/Situational]
- **How many people are affected?** [Number or percentage]

---

## Constraints

### Must Have

- [Non-negotiable constraint]
- [Non-negotiable constraint]

### Should Consider

- [Important consideration]
- [Important consideration]

### Known Limitations

- [Technical limitation]
- [Resource limitation]
- [Timeline limitation]

---

## Success Criteria

### Minimum Success (Must achieve)

- [ ] [Measurable criterion]
- [ ] [Measurable criterion]

### Target Success (Should achieve)

- [ ] [Measurable criterion]
- [ ] [Measurable criterion]

### Stretch Success (Could achieve)

- [ ] [Measurable criterion]

---

## What This Is NOT

Explicitly out of scope for this problem:

- [Not trying to solve X]
- [Not addressing Y]
- [Z is a separate problem]

---

## Assumptions

Things we're assuming to be true:

- [Assumption 1]
- [Assumption 2]
- [Assumption 3]

**Risks if assumptions are wrong:**

- If [assumption] is false, then [consequence]

---

## Open Questions

Questions that need answers before proceeding:

- [ ] [Question needing stakeholder input]
- [ ] [Question needing research]
- [ ] [Question needing data]

---

## Recommended Next Steps

1. [ ] Validate this problem frame with stakeholders
2. [ ] Research: [specific research needed]
3. [ ] Proceed to PRD creation with `prd-creation` skill

---

## References

- [Link to related docs]
- [Link to data/research]
- [Link to previous attempts]
```

---

## Output Location

Save the problem frame to:

```
docs/problem-[short-name].md

Examples:
- docs/problem-project-visibility.md
- docs/problem-slow-onboarding.md
- docs/problem-manual-reporting.md
```

If `docs/` doesn't exist, create it.

---

## Handoff to PRD Creation

After problem is framed, it feeds into `prd-creation`:

```
Problem Framing (this skill)
│
├── Problem Statement → PRD Overview
├── Success Criteria → PRD Goals & Metrics
├── Constraints → PRD Technical Considerations
├── What This Is NOT → PRD Non-Goals
└── User Impact → PRD User Stories
│
▼
PRD Creation (next phase)
```

Tell the user:

```markdown
✅ Problem frame complete: `docs/problem-[name].md`

The core problem is: [one sentence summary]

Ready to proceed to PRD creation? I'll use this problem frame to create
detailed requirements. Just say "create PRD" to continue.
```

---

## Red Flags to Watch For

### Signs You're Solving the Wrong Problem

| Red Flag                                       | What to Do                                             |
| ---------------------------------------------- | ------------------------------------------------------ |
| User can't explain the impact                  | Dig deeper into "what happens if we don't solve this?" |
| Solution is very specific but problem is vague | Ask what triggered this specific solution idea         |
| Problem affects "everyone"                     | Narrow down to specific user type and scenario         |
| Success criteria is "it works"                 | Push for measurable outcomes                           |
| No cost to inaction                            | Question if this is really a problem                   |
| User gets frustrated by questions              | Acknowledge and explain why framing matters            |

### Signs the Problem is Well-Framed

- [ ] Can state problem in one sentence
- [ ] Clear who is affected and how
- [ ] Measurable success criteria exist
- [ ] Constraints are known
- [ ] Not trying to solve everything
- [ ] User validates understanding

---

## Conversation Examples

### Example 1: Solution Disguised as Problem

```
User: "We need to add tags to projects"

Plan Agent: "What would tags help you accomplish?"

User: "Finding projects faster"

Plan Agent: "How do you find projects today, and what makes it slow?"

User: "I scroll through a long list looking for the right one"

Plan Agent: "How many projects are in that list?"

User: "About 200, but I usually work with the same 10-15"

Plan Agent: "So the core problem might be 'frequently-used projects are
buried in a large list' rather than 'projects need tags'. Tags are one
solution, but so is a 'Recent' or 'Favorites' section. Should we frame
the problem as 'quick access to frequently-used projects'?"

User: "Yes, that's exactly it"
```

### Example 2: Already Well-Defined

```
User: "Our checkout flow has a 67% abandonment rate at the payment step.
User research shows confusion about accepted payment methods. We need to
show payment options earlier and clearer."

Plan Agent: "This is well-framed already. You have:
- Clear metric (67% abandonment)
- Identified cause (payment confusion)
- Specific location (payment step)
- User research backing

I can proceed directly to PRD creation. Want me to frame this briefly
first, or go straight to requirements?"
```

---

## Anti-Patterns to Avoid

| ❌ Don't                           | ✅ Do Instead                              |
| ---------------------------------- | ------------------------------------------ |
| Accept first problem statement     | Dig deeper with "why" questions            |
| Jump to solutions                  | Stay in problem space                      |
| Ask 20 questions                   | Ask 4-6 focused questions                  |
| Assume you know the problem        | Validate understanding explicitly          |
| Skip framing for "simple" requests | At minimum, confirm the problem            |
| Document without validation        | Always confirm with user before proceeding |

---

## Checklist Before Done

- [ ] Identified root problem (not surface symptom)
- [ ] Asked clarifying questions
- [ ] Received and incorporated user answers
- [ ] Validated understanding with user
- [ ] Documented problem frame
- [ ] Success criteria are measurable
- [ ] Constraints are explicit
- [ ] Non-goals are stated
- [ ] Saved to `docs/problem-[name].md`
- [ ] User approved or adjusted the frame
- [ ] Ready to hand off to prd-creation
