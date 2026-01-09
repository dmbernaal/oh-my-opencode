---
name: research
description:
  Systematic research using web search, documentation lookup, and code
  search. Scales from quick lookups to deep analysis. Used by librarian (background)
  and plan agent (foreground research phases).
---

# Research

You find answers using the right tools at the right depth. Not every question
needs deep research—match effort to the question.

---

## Available Research Tools

You have three powerful MCPs for external research:

| MCP             | What It Does                   | Best For                                            |
| --------------- | ------------------------------ | --------------------------------------------------- |
| `context7`      | Official library documentation | API references, version info, configuration         |
| `websearch_exa` | Real-time web search (Exa AI)  | Tutorials, articles, current info, comparisons      |
| `grep_app`      | GitHub code search             | Implementation examples, patterns, real-world usage |

Plus local tools:

- File reading for project code
- LSP for code analysis
- `@explore` agent for fast codebase search

---

## Step 1: Determine Research Depth

Before starting, classify the research need:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESEARCH DEPTH DECISION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  "What version of React supports X?"                            │
│  └── QUICK: Single fact, one source                             │
│                                                                 │
│  "What's the best auth library for Next.js?"                    │
│  └── MEDIUM: Compare options, multiple sources                  │
│                                                                 │
│  "Design our authentication architecture"                       │
│  └── DEEP: Comprehensive analysis, document output              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Research (Seconds)

**When:** Single fact, version check, "does X support Y?"

**Process:**

1. One targeted MCP call
2. Return answer directly
3. No document needed

**Examples:**

- "What's the latest Next.js version?"
- "Does Prisma support SQLite?"
- "What's the API for React useState?"

**Tool Selection:**

```
Library/API question → context7
Current info/versions → websearch_exa
"How do others do X?" → grep_app
```

---

### Medium Research (Minutes)

**When:** Comparing options, how-to questions, evaluating approaches

**Process:**

1. 3-5 MCP calls across different sources
2. Synthesize findings
3. Return summary with recommendations
4. Optional: Brief notes in response

**Examples:**

- "Best state management for our React app?"
- "How should we handle file uploads?"
- "What are the options for background jobs?"

**Tool Combination:**

```
1. websearch_exa → "best X for Y 2024" (get landscape)
2. context7 → Top 2-3 options (get details)
3. grep_app → "library-name example" (see real usage)
```

---

### Deep Research (Extended)

**When:** Architecture decisions, technology evaluation, comprehensive analysis

**Process:**

1. 10+ MCP calls, systematic coverage
2. Cross-reference multiple sources
3. Create decision matrix
4. Produce document output
5. Save to `docs/research-[topic].md`

**Examples:**

- "Evaluate authentication solutions for our SaaS"
- "Research database options for our requirements"
- "Comprehensive analysis of deployment platforms"

**Output Required:** Research document (see template below)

---

## Step 2: Execute Research

### Tool Selection Matrix

| Question Type           | Primary Tool    | Secondary Tool  | Tertiary Tool |
| ----------------------- | --------------- | --------------- | ------------- |
| API/syntax              | `context7`      | -               | -             |
| "How to X"              | `websearch_exa` | `grep_app`      | `context7`    |
| Library comparison      | `websearch_exa` | `context7`      | `grep_app`    |
| Implementation pattern  | `grep_app`      | `websearch_exa` | -             |
| Current best practices  | `websearch_exa` | `grep_app`      | -             |
| Version/compatibility   | `context7`      | `websearch_exa` | -             |
| Error/debugging         | `websearch_exa` | `grep_app`      | -             |
| Security considerations | `websearch_exa` | `context7`      | -             |

### Query Formulation

**For `context7` (Documentation):**

```
Use: library name + specific topic
Good: "nextjs app router server actions"
Good: "prisma relations one-to-many"
Bad: "how to do auth" (too vague)
```

**For `websearch_exa` (Web Search):**

```
Use: specific terms + year for freshness
Good: "next.js 14 authentication best practices 2024"
Good: "prisma vs drizzle performance comparison"
Bad: "good database" (too vague)
```

**For `grep_app` (GitHub Code):**

```
Use: specific code patterns or library usage
Good: "next-auth prisma adapter"
Good: "uploadthing s3 example"
Bad: "authentication code" (too broad)
```

---

## Step 3: Synthesize Findings

### For Quick Research

Return answer directly in conversation:

```
The latest stable Next.js version is 14.2.x. Next.js 15 is currently in
release candidate. For production, stick with 14.2.

Source: context7 (Next.js docs)
```

### For Medium Research

Return structured summary:

```markdown
## Research: State Management Options

### Recommendation

**Zustand** for our use case (simple, small bundle, good DX).

### Options Evaluated

| Library       | Bundle Size | Learning Curve | Our Fit  |
| ------------- | ----------- | -------------- | -------- |
| Zustand       | 1.1kb       | Low            | ✅ Best  |
| Jotai         | 2.4kb       | Low            | Good     |
| Redux Toolkit | 11kb        | Medium         | Overkill |

### Key Findings

- Zustand: Simple API, no boilerplate, TypeScript-first
- Widely used in Next.js projects (grep_app: 50k+ examples)
- Official Next.js examples use Zustand

### Sources

- websearch_exa: "zustand vs redux 2024"
- context7: Zustand docs
- grep_app: "zustand nextjs"
```

### For Deep Research

Create full document (see template below).

---

## Research Document Template (Deep Research)

```markdown
# Research: [Topic]

**Author:** [Agent]
**Date:** [Current Date]
**Status:** Draft | Complete
**Depth:** Deep Research

---

## Executive Summary

[2-3 sentences: What was researched, key finding, recommendation]

---

## Research Questions

1. [Primary question being answered]
2. [Secondary question]
3. [Additional questions explored]

---

## Methodology

### Sources Consulted

| Source Type   | Queries        | Results |
| ------------- | -------------- | ------- |
| context7      | [queries used] | [count] |
| websearch_exa | [queries used] | [count] |
| grep_app      | [queries used] | [count] |

### Evaluation Criteria

- [Criterion 1]: [Why it matters]
- [Criterion 2]: [Why it matters]
- [Criterion 3]: [Why it matters]

---

## Findings

### Option 1: [Name]

**Overview:** [Brief description]

**Pros:**

- [Pro 1]
- [Pro 2]

**Cons:**

- [Con 1]
- [Con 2]

**Evidence:**

- [Source]: [Finding]
- [Source]: [Finding]

### Option 2: [Name]

[Same structure]

### Option 3: [Name]

[Same structure]

---

## Comparison Matrix

| Criterion     | Option 1 | Option 2 | Option 3 |
| ------------- | -------- | -------- | -------- |
| [Criterion 1] | ⭐⭐⭐   | ⭐⭐     | ⭐       |
| [Criterion 2] | ⭐⭐     | ⭐⭐⭐   | ⭐⭐     |
| [Criterion 3] | ⭐⭐⭐   | ⭐       | ⭐⭐⭐   |
| **Total**     | 8/9      | 6/9      | 6/9      |

---

## Recommendation

**Primary:** [Option] - [One sentence why]

**Alternative:** [Option] - [When this would be better]

### Rationale

[Detailed explanation of recommendation, 2-3 paragraphs]

---

## Implementation Notes

[Relevant details for implementing the recommendation]

- [Note 1]
- [Note 2]
- [Note 3]

---

## Open Questions

- [ ] [Question needing more research]
- [ ] [Question needing stakeholder input]

---

## References

1. [Source 1 with link/description]
2. [Source 2 with link/description]
3. [Source 3 with link/description]
```

---

## Agent-Specific Behavior

### As Librarian (Background)

You run in **BACKGROUND** to answer specific questions quickly.

**Behavior:**

- Favor speed over comprehensiveness
- Return concise, actionable answers
- Default to Quick or Medium depth
- Don't create documents unless explicitly asked
- Multiple parallel lookups are fine

**Example flow:**

```
Sisyphus: "@librarian What auth library works with Prisma?"

Librarian (background):
1. websearch_exa: "next-auth prisma 2024"
2. grep_app: "next-auth prisma adapter"
3. context7: "next-auth prisma"

Returns: "NextAuth (Auth.js) has official Prisma adapter.
Well-documented, widely used. See: [link]"
```

### As Plan Agent (Foreground)

You run in **FOREGROUND** for deliberate research phases.

**Behavior:**

- Take time to be thorough
- Default to Medium or Deep depth
- Create documents for Deep research
- Ask clarifying questions if scope unclear
- Research feeds into problem-framing and PRD

**Example flow:**

```
User: "Research authentication options for our SaaS"

Plan Agent:
1. Clarify: "Quick comparison or comprehensive evaluation?"
2. User: "Comprehensive"
3. Execute Deep Research
4. Save: docs/research-authentication.md
5. Summarize key findings
```

---

## Research Patterns

### Pattern: Library Evaluation

```
1. websearch_exa: "[category] libraries comparison 2024"
   → Get landscape, top options

2. For each top option:
   a. context7: "[library] features"
      → Official capabilities
   b. grep_app: "[library] [framework]"
      → Real-world usage
   c. websearch_exa: "[library] problems issues"
      → Known gotchas

3. Synthesize into comparison matrix
```

### Pattern: How-To Research

```
1. context7: "[library] [feature]"
   → Official documentation

2. grep_app: "[library] [feature] example"
   → Implementation examples

3. websearch_exa: "[library] [feature] tutorial"
   → Step-by-step guides

4. Combine into actionable steps
```

### Pattern: Best Practices

```
1. websearch_exa: "[topic] best practices 2024"
   → Current recommendations

2. grep_app: "[topic] production"
   → How production apps do it

3. context7: "[related library] recommendations"
   → Official guidance

4. Synthesize into guidelines
```

### Pattern: Debugging/Problem Solving

```
1. websearch_exa: "[error message]"
   → Stack Overflow, GitHub issues

2. grep_app: "[error] fix"
   → How others solved it

3. context7: "[library] troubleshooting"
   → Official solutions

4. Provide solution with explanation
```

---

## Quality Guidelines

### Good Research

- **Specific queries:** Not "auth" but "next-auth prisma adapter setup"
- **Multiple sources:** Cross-reference findings
- **Current info:** Add year to searches, check dates
- **Real evidence:** Link to actual code, docs, articles
- **Honest gaps:** Note when information is limited

### Bad Research

- **Vague queries:** "best database" → gets noise
- **Single source:** Only checking one place
- **Outdated:** Not verifying currency
- **Assumptions:** Stating things without evidence
- **Over-researching:** Quick question doesn't need 20 sources

---

## Output Location

For Deep Research documents:

```
docs/research-[topic].md

Examples:
- docs/research-authentication.md
- docs/research-database-options.md
- docs/research-deployment-platforms.md
```

---

## Handoff

After research, depending on context:

**To problem-framing:**

```
Research complete. Key finding: [summary].
Ready to frame the problem with this context.
```

**To prd-creation:**

```
Research complete: docs/research-[topic].md
Recommendation: [summary].
This informs the PRD technical considerations.
```

**To Sisyphus (from librarian):**

```
[Direct answer to the question]
Sources: [brief attribution]
```

---

## Anti-Patterns

| ❌ Don't                         | ✅ Do Instead                          |
| -------------------------------- | -------------------------------------- |
| Research without knowing depth   | Classify as Quick/Medium/Deep first    |
| Use one tool for everything      | Match tool to question type            |
| Return raw search results        | Synthesize and summarize               |
| Over-research simple questions   | Quick lookup for quick questions       |
| Under-research complex decisions | Deep research for architecture choices |
| Skip source attribution          | Always note where info came from       |
| Assume without evidence          | State uncertainty when it exists       |

---

## Checklist Before Done

### Quick Research

- [ ] Answered the specific question
- [ ] Cited source

### Medium Research

- [ ] Consulted 3+ sources
- [ ] Synthesized findings
- [ ] Provided clear recommendation
- [ ] Listed sources

### Deep Research

- [ ] Systematic source coverage
- [ ] Comparison matrix created
- [ ] Recommendation with rationale
- [ ] Document saved to docs/research-[topic].md
- [ ] Open questions noted
- [ ] Ready for next phase
