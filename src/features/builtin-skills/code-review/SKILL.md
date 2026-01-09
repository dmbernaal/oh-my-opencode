---
name: code-review
description: Systematic code review against requirements, security, and quality
  standards. Used by Oracle agent for checkpoint reviews and final verification.
  Produces actionable, prioritized feedback.
---

# Code Review Protocol

You are a **Senior Staff Engineer** conducting code review. Your job is not to
nitpick style—it's to catch bugs, security holes, and requirement gaps before
they reach production.

---

## When This Skill Applies

- **Checkpoint Reviews:** Every 3-5 tasks during implementation
- **Pre-Merge Review:** Before marking a feature complete
- **Security Review:** For auth, payments, or sensitive data handling
- **Architecture Conformance:** Verifying implementation matches design

---

## Review Hierarchy (Check in Order)

```
1. CRITICAL    →  Security vulnerabilities, data loss risks
2. BUGS        →  Logic errors, race conditions, edge cases
3. REQUIREMENTS →  Does it match the PRD?
4. ARCHITECTURE →  Does it follow the design?
5. QUALITY     →  Maintainability, readability, patterns
6. PERFORMANCE →  Only if requirements specify targets
```

**Stop at Critical.** If you find a critical issue, don't continue reviewing
minor style issues. Fix the critical problem first.

---

## Phase 1: Security Review

### Authentication & Authorization

```
□ Auth checks on every protected route/action?
□ User can only access their own resources?
□ No auth bypass through parameter manipulation?
□ Session/token handling secure?
□ No sensitive data in URLs or logs?
```

**Pattern to Hunt:**

```typescript
// 🚫 CRITICAL: Missing auth check
export async function GET(request: NextRequest, { params }: Params) {
  const project = await db.project.findUnique({ where: { id: params.id } });
  return NextResponse.json({ data: project });
}

// ✅ SECURE: Validates ownership
export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await projectService.getById(params.id, session.user.id);
  return NextResponse.json({ data: project });
}
```

### Input Validation

```
□ All user input validated with Zod?
□ No raw req.json() without validation?
□ File uploads validated (type, size)?
□ Query params sanitized?
```

### Data Exposure

```
□ No password hashes in responses?
□ No internal IDs leaked unnecessarily?
□ No stack traces in production errors?
□ Sensitive fields excluded from selects?
```

**Pattern to Hunt:**

```typescript
// 🚫 CRITICAL: Leaking sensitive data
const user = await db.user.findUnique({ where: { id } });
return NextResponse.json({ data: user }); // Includes passwordHash!

// ✅ SECURE: Explicit field selection
const user = await db.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true },
});
```

### SQL/NoSQL Injection

```
□ No string concatenation in queries?
□ Using parameterized queries/ORM?
□ No raw SQL with user input?
```

---

## Phase 2: Bug Detection

### Null/Undefined Handling

```
□ Optional chaining where needed?
□ Null checks before property access?
□ Default values for optional params?
□ Empty array/object handling?
```

**Pattern to Hunt:**

```typescript
// 🚫 BUG: Will crash if user is null
const userName = user.name.toUpperCase();

// ✅ SAFE: Handles null case
const userName = user?.name?.toUpperCase() ?? "Unknown";
```

### Async/Await Issues

```
□ All promises awaited or explicitly fire-and-forget?
□ No unhandled promise rejections?
□ Proper error handling in async functions?
□ No race conditions in parallel operations?
```

**Pattern to Hunt:**

```typescript
// 🚫 BUG: Promise not awaited - won't catch errors
export async function POST(request: NextRequest) {
  const data = await request.json();
  projectService.create(data); // Missing await!
  return NextResponse.json({ success: true });
}

// 🚫 BUG: Race condition
const [user, permissions] = await Promise.all([
  updateUser(id, data),
  updatePermissions(id, data.role), // Uses old role if update fails
]);
```

### Edge Cases

```
□ Empty arrays handled?
□ Zero/negative numbers handled?
□ Very long strings handled?
□ Concurrent request handling?
□ Pagination edge cases (page 0, negative limit)?
```

---

## Phase 3: Requirements Check

Cross-reference implementation against PRD:

```
□ All P0 (Must Have) requirements implemented?
□ All P1 (Should Have) requirements implemented?
□ Acceptance criteria met for each requirement?
□ Non-functional requirements addressed?
  □ Performance targets met?
  □ Accessibility requirements?
  □ Browser/device support?
```

### Checklist Format

| Requirement                     | Status | Notes                     |
| ------------------------------- | ------ | ------------------------- |
| FR-001: User can create project | ✅     | Implemented in T-004      |
| FR-002: Project has due date    | ⚠️     | Missing timezone handling |
| FR-003: User receives email     | ❌     | Not implemented           |

---

## Phase 4: Architecture Conformance

### Layer Violations

```
□ No business logic in route handlers?
□ No database imports in routes (only services)?
□ No framework imports in services?
□ No circular dependencies?
```

**Grep Commands:**

```bash
# DB access in routes (should be empty)
grep -rE "prisma\.|db\." app/api/

# Next.js imports in services (should be empty)
grep -rE "from ['\"]next" src/services/

# Business logic in routes (manual check needed)
# Look for: if statements with business rules, loops, calculations
```

### File Structure

```
□ Files in correct directories?
□ Naming conventions followed?
□ No orphaned files?
□ Types colocated or in /types?
```

---

## Phase 5: Code Quality

### Readability

```
□ Functions under 50 lines?
□ Clear, descriptive names?
□ No magic numbers (use constants)?
□ Complex logic has comments explaining WHY?
```

### DRY (Don't Repeat Yourself)

```
□ No copy-pasted code blocks?
□ Common patterns extracted to utilities?
□ Shared types defined once?
```

### Error Handling

```
□ Using custom error classes (not generic Error)?
□ Errors have actionable messages?
□ No swallowed errors (empty catch blocks)?
□ User-facing errors don't leak internals?
```

**Pattern to Hunt:**

```typescript
// 🚫 BAD: Swallowed error
try {
  await riskyOperation();
} catch (e) {
  // silently fails
}

// 🚫 BAD: Generic error
throw new Error("Something went wrong");

// ✅ GOOD: Typed, actionable error
throw new ValidationError("Project name must be unique within workspace");
```

---

## Phase 6: Performance (If Required)

Only review performance if:

- PRD specifies performance targets
- Code handles large datasets
- Code is in hot path (called frequently)

```
□ No N+1 queries?
□ Database queries have appropriate indexes?
□ Large lists paginated?
□ No blocking operations in request path?
□ Expensive computations cached?
```

**Pattern to Hunt:**

```typescript
// 🚫 N+1 Query
const projects = await db.project.findMany();
for (const project of projects) {
  project.owner = await db.user.findUnique({ where: { id: project.userId } });
}

// ✅ Single query with include
const projects = await db.project.findMany({
  include: { owner: { select: { id: true, name: true } } },
});
```

---

## Review Output Format

```markdown
# Code Review: [Feature/PR Name]

**Reviewer:** Oracle
**Date:** [date]
**Scope:** [files reviewed]

## Summary

[1-2 sentence overall assessment]

**Verdict:** 🔴 Changes Required | 🟡 Minor Issues | 🟢 Approved

---

## Critical Issues (Must Fix)

### [SECURITY] Issue Title

**Location:** `path/to/file.ts:42`
**Problem:** [What's wrong]
**Impact:** [What could happen]
**Fix:** [How to fix]

---

## Bugs (Should Fix)

### [BUG] Issue Title

**Location:** `path/to/file.ts:87`
**Problem:** [What's wrong]
**Fix:** [How to fix]

---

## Requirements Gaps

| Requirement | Status | Issue                      |
| ----------- | ------ | -------------------------- |
| FR-001      | ✅     | -                          |
| FR-002      | ⚠️     | Missing edge case handling |
| FR-003      | ❌     | Not implemented            |

---

## Architecture Issues

### [ARCH] Issue Title

**Problem:** [Violation description]
**Fix:** [How to restructure]

---

## Quality Improvements (Consider)

- [ ] [Suggestion 1]
- [ ] [Suggestion 2]

---

## Positive Notes

- [Something done well]
- [Good pattern used]
```

---

## Quick Review Checklist

For rapid checkpoint reviews, use this condensed checklist:

```markdown
## Quick Review: [Scope]

### Security

- [ ] Auth on protected routes
- [ ] Input validated
- [ ] No data leaks

### Bugs

- [ ] Null handling
- [ ] Promises awaited
- [ ] Errors handled

### Architecture

- [ ] Logic in services, not routes
- [ ] No DB in routes
- [ ] No framework in services

### Quality

- [ ] Readable
- [ ] No duplication
- [ ] Tests exist

**Verdict:** [PASS / NEEDS WORK]
**Blockers:** [List or "None"]
```

---

## When to Block vs Advise

| Issue Type             | Block Merge? | Example                    |
| ---------------------- | ------------ | -------------------------- |
| Security vulnerability | 🔴 YES       | Missing auth check         |
| Data loss risk         | 🔴 YES       | Delete without soft-delete |
| Logic bug              | 🔴 YES       | Race condition             |
| Missing requirement    | 🟡 DEPENDS   | P0 = block, P2 = advise    |
| Architecture violation | 🟡 DEPENDS   | Severity matters           |
| Code style             | 🟢 NO        | Just note it               |
| Minor optimization     | 🟢 NO        | Suggest for future         |

---

## Review Grep Commands

Run these to quickly scan for common issues:

```bash
# Security: Raw JSON without validation
grep -rn "await.*\.json()" app/api/ | grep -v safeParse

# Security: Direct DB in routes
grep -rn "prisma\." app/api/

# Bugs: Unhandled promises (look for missing await)
grep -rn "Service\.\w\+(" app/api/ | grep -v await

# Quality: Console statements
grep -rn "console\." src/ app/ --include="*.ts" --include="*.tsx"

# Quality: Any type usage
grep -rn ": any" src/ app/ --include="*.ts" --include="*.tsx"

# Quality: TODO/FIXME left in code
grep -rn "TODO\|FIXME\|XXX\|HACK" src/ app/
```

---

## Integration with Sisyphus Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    REVIEW TRIGGERS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Every 3-5 Tasks                                                │
│  └── Sisyphus: "@oracle checkpoint review on T-001 through T-005"│
│      └── Oracle loads code-review skill                         │
│      └── Quick Review checklist                                 │
│      └── Returns: PASS or NEEDS WORK with blockers              │
│                                                                 │
│  Before Feature Complete                                        │
│  └── Sisyphus: "@oracle full review against PRD"                │
│      └── Oracle loads code-review skill                         │
│      └── Full review with requirements check                    │
│      └── Returns: Approved, Minor Issues, or Changes Required   │
│                                                                 │
│  Security-Sensitive Code                                        │
│  └── Sisyphus: "@oracle security review on auth implementation" │
│      └── Oracle focuses on Phase 1 (Security)                   │
│      └── Returns: Security assessment                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Do NOT Review

- **Style preferences** (tabs vs spaces, quote style) → Let linter handle
- **Naming bikeshedding** → Unless genuinely confusing
- **"I would have done it differently"** → Unless it's actually problematic
- **Future features** → Review what's there, not what's missing from roadmap

Focus on: **Security, Bugs, Requirements, Architecture**

```

```
