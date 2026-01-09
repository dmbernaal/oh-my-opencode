---
name: project-onboarding
description: Analyzes existing codebases to understand their structure, conventions, and tooling. Generates docs/agent/project-context.md and docs/agent/constraints.md. Run automatically when entering a project without existing context files.
---

# Project Onboarding

You analyze existing codebases to understand their structure before any work begins. Your output becomes the source of truth that all other skills must respect.

**Critical Rule:** The conventions you detect here OVERRIDE skill defaults. If a project uses repositories/ instead of services/, that is what all agents must use.

---

## When This Skill Runs

This skill should be loaded in these situations:

- At session start if docs/agent/project-context.md is missing
- When user requests "analyze this project" or similar
- When @architect is invoked on a new project

---

## Phase 1: Stack Detection

Scan for these configuration files to identify the technology stack:

### JavaScript and TypeScript Projects

| File | What It Reveals |
|------|-----------------|
| package.json | Dependencies, scripts, package manager hints |
| bun.lock | Using Bun as package manager |
| pnpm-lock.yaml | Using pnpm as package manager |
| yarn.lock | Using Yarn as package manager |
| package-lock.json | Using npm as package manager |
| tsconfig.json | TypeScript configuration |
| next.config.js or next.config.ts or next.config.mjs | Next.js project |
| vite.config.ts | Vite project |
| remix.config.js | Remix project |
| astro.config.mjs | Astro project |

### Database and ORM Detection

| File | What It Reveals |
|------|-----------------|
| prisma/schema.prisma | Prisma ORM (check datasource for database type) |
| drizzle.config.ts | Drizzle ORM |
| knexfile.js | Knex.js query builder |

### Styling Detection

| File | What It Reveals |
|------|-----------------|
| tailwind.config.js or tailwind.config.ts | Tailwind CSS |
| postcss.config.js | PostCSS processing |

### Testing Detection

| File | What It Reveals |
|------|-----------------|
| vitest.config.ts | Vitest test framework |
| jest.config.js | Jest test framework |
| playwright.config.ts | Playwright E2E testing |

---

## Phase 2: Command Discovery

From package.json scripts, identify these commands:

| Purpose | Common Script Names | Fallback Action |
|---------|--------------------|--------------------|
| Development | dev, start, serve, start:dev | Ask user |
| Build | build, compile, bundle | Ask user |
| Test | test, test:unit, test:e2e, vitest, jest | Check for test config files |
| Lint | lint, eslint, biome | Check for linter configs |
| Type Check | typecheck, tsc, type-check | Check for tsconfig.json |
| Format | format, prettier, fmt | Check for prettier config |

---

## Phase 3: Convention Detection

### Directory Structure Analysis

List the top-level directories and identify which patterns are in use:

| Pattern | Evidence | Convention |
|---------|----------|------------|
| Next.js App Router | app/ directory with page.tsx files | Routes in app/, API in app/api/ |
| Next.js Pages Router | pages/ directory | Routes in pages/, API in pages/api/ |
| Feature-based | features/ or modules/ directories | Colocate code by feature |
| Layer-based | Separate components/, services/, utils/ | Separate code by type |

### Code Pattern Sampling

Read 2-3 representative files to detect:

**Service Layer Pattern:** Look in services/, lib/, or repositories/ for business logic separation. Note export style and error handling patterns.

**Component Pattern:** Check component files for functional vs class components, hooks usage, and prop patterns.

**State Management:** Check for zustand, jotai, redux, recoil imports. Check for React Query, SWR, Apollo usage.

**Testing Pattern:** Look for *.test.* or *.spec.* files. Note if tests are colocated or in separate __tests__/ directories.

---

## Phase 4: Generate the Project Context Document

Create the file at `docs/agent/project-context.md` using this exact template structure:

```
# Project Context

**Generated:** [YYYY-MM-DD HH:MM]
**Last Updated:** [YYYY-MM-DD HH:MM]
**Stack Confidence:** [high/medium/low based on how clear the detection was]

---

## Detected Stack

| Layer | Technology | Version | Evidence |
|-------|------------|---------|----------|
| Framework | [detected framework] | [version from package.json] | [config file that confirmed it] |
| Language | [TypeScript/JavaScript] | [version if known] | [tsconfig.json or file extensions] |
| Runtime | [Bun/Node] | [version if known] | [lock file type] |
| Database | [detected or "None detected"] | [version if known] | [schema file or "N/A"] |
| ORM | [detected or "None detected"] | [version if known] | [config file] |
| Styling | [detected] | [version if known] | [config file] |
| Testing | [detected] | [version if known] | [config file] |
| Linting | [detected] | [version if known] | [config file] |

---

## Commands

| Action | Command | Verified |
|--------|---------|----------|
| Install | [detected command] | ☐ |
| Dev Server | [detected command] | ☐ |
| Build | [detected command] | ☐ |
| Test | [detected command] | ☐ |
| Lint | [detected command] | ☐ |
| Type Check | [detected command] | ☐ |

---

## Directory Structure

[Include a simplified tree showing the main directories]

### Key Locations

| Purpose | Path |
|---------|------|
| Routes/Pages | [detected path] |
| Components | [detected path] |
| Business Logic | [detected path or "Not established"] |
| Database Schema | [detected path or "N/A"] |
| Tests | [detected path or "Colocated with source"] |
| Types | [detected path or "Colocated with source"] |

---

## Conventions Detected

### Patterns In Use

Mark each pattern as detected or not detected:

- [ ] Service layer pattern (business logic separate from routes)
- [ ] Repository pattern (data access abstracted)
- [ ] Server Actions (if Next.js)
- [ ] API Routes
- [ ] Zod validation
- [ ] Custom error classes

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | [kebab-case/camelCase/PascalCase] | [actual example from project] |
| Components | [convention detected] | [actual example] |
| Functions | [convention detected] | [actual example] |

### Code Style

| Preference | Value |
|------------|-------|
| Semicolons | [yes/no based on existing files] |
| Quotes | [single/double] |
| Indentation | [tabs/2 spaces/4 spaces] |

---

## Quality Gates

These commands MUST pass before any task is considered complete:

1. [ ] Type Check: [detected command]
2. [ ] Lint: [detected command]
3. [ ] Test: [detected command]
4. [ ] Build: [detected command]

---

## Agent Instructions

CRITICAL: All agents working in this project MUST:

1. Follow the conventions listed above, NOT skill defaults
2. Place new files in the established locations
3. Match existing naming patterns exactly
4. Run quality gates after completing tasks
5. When unsure about a convention, check similar existing code first
```

---

## Phase 5: Generate the Constraints Document

Create the file at `docs/agent/constraints.md` using this template:

```
# Session Constraints

**Created:** [timestamp]
**Mode:** [surgery | feature | builder | refactor]
**Detected From:** [user request keywords or explicit selection]

---

## Mode Definitions

**Surgery:** Minimal changes only. No refactoring. No new patterns. Smallest diff possible.

**Feature:** Follow existing patterns. May add new files in established locations. Add tests for new code.

**Builder:** May scaffold new structure. May establish patterns. Full creative latitude within skill guidelines.

**Refactor:** May reorganize code. MUST propose plan first. MUST preserve all existing functionality.

---

## Current Mode: [SELECTED MODE]

### Allowed

[List specific things this session can do based on the mode]

### Prohibited

[List specific things this session must NOT do based on the mode]

### Non-Goals

[What we are explicitly NOT trying to achieve in this session]
```

### Mode Detection Rules

Use these rules to automatically detect the appropriate mode from the user's request:

| Keywords in Request | Selected Mode |
|--------------------|---------------|
| fix, bug, patch, hotfix, quick | surgery |
| add, create, implement, new feature | feature |
| new project, scaffold, initialize, from scratch | builder |
| refactor, restructure, reorganize, migrate | refactor |
| ambiguous or unclear | ASK the user: "Should I treat this as surgery (minimal fix) or feature (proper implementation)?" |

---

## Phase 6: User Verification

After generating both documents, present a summary to the user in this format:

```
📋 Project Analysis Complete

Stack: [Framework] + [Language] + [Database or "No database"]
Mode: [Detected mode] because [reason based on their request]

Key Conventions:
- [Most important convention 1]
- [Most important convention 2]
- [Most important convention 3]

Commands Ready:
- Dev: [command]
- Test: [command]
- Build: [command]

Does this look correct? Any adjustments needed before I proceed?
```

WAIT for user confirmation before proceeding with their original request.
