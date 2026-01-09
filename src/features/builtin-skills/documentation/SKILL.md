---
name: documentation
description: Technical writing for README, API docs, code comments, and guides.
  Produces clear, scannable documentation that respects reader time. Anti-slop
  principles for documentation that developers actually read.
---

# Technical Documentation

You write documentation that **developers actually read**. Every sentence must
earn its place. Respect the reader's time—they want answers, not prose.

---

## Step 0: Check Project Context

Before writing any documentation:

1. Read existing docs to match tone and style
2. Check `AGENTS.md` for project-specific conventions
3. Look at `package.json` or config files for project details
4. Understand the audience (internal team? open source? enterprise?)

---

## Core Principles

### 1. Scannable First

Developers scan before they read. Structure for scanning:

```
✅ Good: Headers, bullets, code blocks
❌ Bad: Walls of text, long paragraphs
```

### 2. Answer-First Writing

Lead with the answer, then explain if needed:

```
❌ Bad:  "In order to understand how authentication works,
         we first need to consider the various approaches..."

✅ Good: "Authentication uses JWT tokens. Tokens expire after 24h.
         See /docs/auth.md for details."
```

### 3. Show, Don't Explain

Code examples beat explanations:

```
❌ Bad:  "To create a user, you need to call the createUser
         function with an object containing email and name fields."

✅ Good:
```

```typescript
const user = await createUser({
  email: "test@example.com",
  name: "Jane",
});
```

### 4. No Fluff

Every word must add value:

| ❌ Remove                       | ✅ Replace With            |
| ------------------------------- | -------------------------- |
| "Simply"                        | (delete)                   |
| "Just"                          | (delete)                   |
| "Actually"                      | (delete)                   |
| "In order to"                   | "To"                       |
| "It is important to note that"  | (state the thing directly) |
| "This is a tool that helps you" | (describe what it does)    |

---

## Document Types

### README.md

**Purpose:** Get someone from zero to running in 60 seconds.

**Structure:**

```markdown
# Project Name

One sentence: what it does and who it's for.

## Quick Start

npm install
npm run dev

## Features

- Feature 1: brief description
- Feature 2: brief description

## Documentation

- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api.md)
- [Contributing](./CONTRIBUTING.md)

## License

MIT
```

**Anti-patterns to avoid:**

- Wall of badges at the top
- "Table of Contents" for short READMEs
- Explaining what the language/framework is
- "This project is a..." (just say what it does)
- Giant feature lists with no examples
- Screenshots before Quick Start

**README length guide:**

| Project Type     | Ideal Length                |
| ---------------- | --------------------------- |
| Library/Package  | 1-2 screens                 |
| CLI Tool         | 2-3 screens                 |
| Full Application | 2-3 screens + link to docs/ |
| Internal Tool    | 1 screen                    |

---

### API Documentation

**Purpose:** Show developers exactly how to use each endpoint/function.

**Structure for REST APIs:**

```markdown
## Create Project

Creates a new project for the authenticated user.

POST /api/projects

### Request

{
"name": "My Project",
"description": "Optional description"
}

| Field       | Type   | Required | Description        |
| ----------- | ------ | -------- | ------------------ |
| name        | string | Yes      | 1-100 characters   |
| description | string | No       | Max 500 characters |

### Response

{
"data": {
"id": "clx1234...",
"name": "My Project",
"createdAt": "2024-01-15T10:00:00Z"
}
}

### Errors

| Status | Code             | Description                 |
| ------ | ---------------- | --------------------------- |
| 400    | VALIDATION_ERROR | Invalid input               |
| 401    | UNAUTHORIZED     | Missing or invalid token    |
| 409    | DUPLICATE_NAME   | Project name already exists |
```

**Structure for Functions/Methods:**

```markdown
## createProject

Creates a new project.

function createProject(input: CreateProjectInput): Promise<Project>

### Parameters

| Name              | Type   | Description                    |
| ----------------- | ------ | ------------------------------ |
| input.name        | string | Project name (required)        |
| input.description | string | Project description (optional) |

### Returns

Promise<Project> - The created project.

### Example

const project = await createProject({
name: 'My Project',
description: 'A sample project'
})

### Throws

- ValidationError - If name is empty or too long
- DuplicateError - If name already exists for user
```

---

### Code Comments

**When to comment:**

- WHY something is done (not WHAT)
- Complex algorithms or business logic
- Non-obvious workarounds
- TODO/FIXME with context

**When NOT to comment:**

- Obvious code
- What the code literally does
- Commented-out code (delete it)

**Examples:**

```typescript
// ❌ Bad: describes what code does
// Loop through users and check if active
for (const user of users) {
  if (user.isActive) {
    // ...
  }
}

// ✅ Good: explains WHY
// Filter inactive users early to avoid sending emails
// to accounts pending deletion (see issue #234)
const activeUsers = users.filter((u) => u.isActive);
```

**Comment formats:**

```typescript
// Single line for brief notes

/**
 * Multi-line for complex explanations.
 * Use when you need to explain business context
 * or non-obvious behavior.
 */

// TODO(username): Brief description of what needs doing
// FIXME: Description of bug and why it's not fixed yet
// HACK: Explanation of workaround and when it can be removed
```

---

### Technical Guides

**Purpose:** Walk through a specific task or concept.

**Structure:**

```markdown
# Guide: Setting Up Authentication

## Overview

What you'll accomplish and prerequisites.

## Steps

### 1. Install Dependencies

npm install next-auth

### 2. Configure Provider

Create auth.config.ts:

// code example here

### 3. Add API Route

// next step

## Verification

How to confirm it's working:

curl http://localhost:3000/api/auth/session

Expected output: ...

## Troubleshooting

### "Invalid callback URL"

Cause: ...
Fix: ...

## Next Steps

- [Configure additional providers](./auth-providers.md)
- [Add protected routes](./protected-routes.md)
```

---

### CHANGELOG.md

**Purpose:** Tell users what changed between versions.

**Format (Keep a Changelog):**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- New feature description

## [1.2.0] - 2024-01-15

### Added

- User can now export projects as PDF (#123)

### Changed

- Improved dashboard loading time by 40%

### Fixed

- Project names now allow special characters (#456)

### Removed

- Deprecated v1 API endpoints

## [1.1.0] - 2024-01-01

...
```

**Categories (in this order):**

1. Added (new features)
2. Changed (changes to existing features)
3. Deprecated (features to be removed)
4. Removed (removed features)
5. Fixed (bug fixes)
6. Security (security fixes)

---

### Inline Documentation (JSDoc/TSDoc)

**When to use:**

- Exported functions/classes
- Complex parameter types
- Non-obvious return values

**Example:**

```typescript
/**
 * Creates a new project for the specified user.
 *
 * @param input - Project creation parameters
 * @param userId - ID of the user creating the project
 * @returns The newly created project
 * @throws {ValidationError} If project name is invalid
 * @throws {DuplicateError} If user already has project with same name
 *
 * @example
 * const project = await createProject(
 *   { name: 'My Project' },
 *   'user_123'
 * )
 */
export async function createProject(
  input: CreateProjectInput,
  userId: string
): Promise<Project> {
  // ...
}
```

**Don't over-document:**

```typescript
// ❌ Over-documented - obvious from types
/**
 * Gets user by ID.
 * @param id - The user ID
 * @returns The user
 */
function getUser(id: string): User;

// ✅ Types are self-documenting - skip redundant docs
function getUser(id: string): User;
```

---

## Anti-Slop Checklist

Before submitting any documentation:

| Check            | Question                                         |
| ---------------- | ------------------------------------------------ |
| Fluff            | Can I remove "simply," "just," "actually," etc.? |
| Redundancy       | Am I repeating information?                      |
| Wall of text     | Would this benefit from bullets or headers?      |
| Missing example  | Would code make this clearer?                    |
| Obvious comments | Does this comment add value?                     |
| Over-explanation | Am I explaining things the reader knows?         |
| Passive voice    | Can I make this more direct?                     |
| Long intro       | Can I lead with the answer?                      |

---

## Audience Calibration

Adjust depth based on audience:

| Audience      | Assume They Know                  | Explain                             |
| ------------- | --------------------------------- | ----------------------------------- |
| Internal team | Tech stack, architecture, context | New features, non-obvious decisions |
| Open source   | Programming basics, common tools  | Your specific APIs, configuration   |
| Enterprise    | Their stack, compliance needs     | Integration, security, support      |
| Beginners     | Very little                       | Everything, with examples           |

---

## File Naming Conventions

```
docs/
├── README.md              # Project overview (or in root)
├── CHANGELOG.md           # Version history (or in root)
├── CONTRIBUTING.md        # How to contribute (or in root)
├── getting-started.md     # Quick start guide
├── api/
│   ├── overview.md
│   ├── authentication.md
│   └── endpoints/
│       ├── users.md
│       └── projects.md
├── guides/
│   ├── deployment.md
│   └── configuration.md
└── architecture/
    ├── overview.md
    └── decisions/
        └── 001-database-choice.md
```

---

## Quick Reference Templates

### Minimal README

```markdown
# project-name

One-line description.

## Install

npm install project-name

## Usage

import { thing } from 'project-name'
thing.doSomething()

## License

MIT
```

### Function Doc

```typescript
/**
 * Brief description.
 *
 * @example
 * // usage example
 */
```

### API Endpoint

```markdown
## Endpoint Name

METHOD /path

Brief description.

### Request

{ }

### Response

{ }
```

---

## Self-Audit Commands

### Check for fluff words

```bash
grep -riE "\b(simply|just|actually|basically|easily|very|really)\b" docs/ README.md
```

**Goal:** Minimize matches.

### Check for passive voice

```bash
grep -riE "\b(is|are|was|were|been|being) [a-z]+ed\b" docs/ README.md
```

**Goal:** Review and convert to active where possible.

### Check for missing code examples

```bash
find docs -name "*.md" -exec sh -c 'grep -L "^\`\`\`" "$1"' _ {} \;
```

**Goal:** Most docs should have examples.

---

## Checklist Before Done

- [ ] Leads with the answer/action
- [ ] Has working code examples
- [ ] No fluff words
- [ ] Scannable structure (headers, bullets)
- [ ] Matches existing project style
- [ ] Links work and point to real files
- [ ] Appropriate length for document type
- [ ] Audience-appropriate depth
