---
name: tdd-workflow
description:
  Test-Driven Development discipline for Sisyphus. Enforces RED-GREEN-REFACTOR
  cycle, test-first implementation, and quality gates. Load this skill before
  starting any implementation work.
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

# TDD Workflow

You write tests **before** implementation. This is not optional—it's how you
ensure code works, catch regressions, and maintain velocity over time.

**The iron rule: No implementation without a failing test first.**

---

## The TDD Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    RED → GREEN → REFACTOR                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. RED: Write a failing test                                   │
│     └── Test describes WHAT should happen                       │
│     └── Run test → Confirm it FAILS                             │
│     └── Failure message should be clear                         │
│                                                                 │
│  2. GREEN: Write minimum code to pass                           │
│     └── Only enough code to make test pass                      │
│     └── Don't over-engineer                                     │
│     └── Run test → Confirm it PASSES                            │
│                                                                 │
│  3. REFACTOR: Improve without changing behavior                 │
│     └── Clean up code                                           │
│     └── Remove duplication                                      │
│     └── Run tests → Confirm still PASSING                       │
│                                                                 │
│  Repeat for next requirement                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 0: Check Project Test Setup

Before writing tests, verify the project has testing configured:

```bash
# Check for test config files
ls -la | grep -E "(jest|vitest|playwright|cypress)"

# Check package.json for test scripts
cat package.json | grep -A5 '"scripts"'

# Check for existing tests
find . -name "*.test.*" -o -name "*.spec.*" | head -20
```

**If no test setup exists:**

1. Recommend a testing stack based on project
2. Set up configuration before proceeding
3. Create example test to verify setup works

### Common Test Stacks

| Project Type | Unit/Integration | E2E        | Config File        |
| ------------ | ---------------- | ---------- | ------------------ |
| Next.js      | Vitest           | Playwright | `vitest.config.ts` |
| React (Vite) | Vitest           | Playwright | `vitest.config.ts` |
| Node.js      | Vitest or Jest   | -          | `vitest.config.ts` |
| General      | Jest             | Cypress    | `jest.config.js`   |

---

## Phase 1: RED - Write Failing Test

### Before Writing the Test

1. **Understand the requirement** from PRD or task
2. **Identify the unit** being tested (function, component, endpoint)
3. **Define expected behavior** in plain language

### Test Structure (AAA Pattern)

```typescript
describe("Feature or Module", () => {
  describe("functionName or scenario", () => {
    it("should [expected behavior] when [condition]", () => {
      // Arrange: Set up test data and conditions
      const input = { name: "Test", email: "test@example.com" };

      // Act: Execute the code being tested
      const result = functionUnderTest(input);

      // Assert: Verify the outcome
      expect(result).toEqual({ id: expect.any(String), ...input });
    });
  });
});
```

### Test Naming Convention

```
it('should [action] when [condition]')
it('should [action] given [state]')
it('should throw [error] when [invalid condition]')
```

**Good names:**

- `should return user when valid ID provided`
- `should throw NotFoundError when user does not exist`
- `should create project with generated slug`

**Bad names:**

- `test 1`
- `works correctly`
- `handles edge case`

### Write Test First, Then Run

```bash
# Run the specific test file
npm test -- path/to/file.test.ts

# Or with watch mode during development
npm test -- --watch
```

**Confirm the test FAILS before proceeding.** If it passes, either:

- The feature already exists
- The test is wrong

---

## Phase 2: GREEN - Make It Pass

### Minimum Viable Implementation

Write the **simplest code** that makes the test pass:

```typescript
// ❌ Over-engineered (premature optimization)
function getUser(id: string): User {
  const cached = cache.get(`user:${id}`);
  if (cached) return cached;

  const user = db.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("User", id);

  cache.set(`user:${id}`, user, { ttl: 3600 });
  return user;
}

// ✅ Minimum to pass test (start here)
function getUser(id: string): User {
  const user = db.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("User", id);
  return user;
}
```

### Run Test After Implementation

```bash
npm test -- path/to/file.test.ts
```

**Confirm the test PASSES.** If it fails:

- Fix the implementation (not the test, unless test was wrong)
- Re-run until green

---

## Phase 3: REFACTOR - Improve the Code

### Only After Tests Pass

With green tests as your safety net, you can:

- Extract helper functions
- Rename for clarity
- Remove duplication
- Improve performance

### Refactoring Rules

1. **Run tests after every change**
2. **Small steps** - one refactor at a time
3. **Don't add features** - behavior stays the same
4. **If tests break** - revert and try smaller step

### Common Refactors

| Smell                | Refactor                     |
| -------------------- | ---------------------------- |
| Duplicated code      | Extract function             |
| Long function        | Extract smaller functions    |
| Magic numbers        | Extract constants            |
| Deep nesting         | Early returns, guard clauses |
| Complex conditionals | Extract to named function    |

---

## Test Types and When to Use Them

### Unit Tests (Most Common)

**Test:** Single function, class, or module in isolation
**Speed:** Milliseconds
**Mocking:** External dependencies mocked

```typescript
// Testing a service function
describe("projectService.create", () => {
  it("should create project with valid input", async () => {
    // Mock database
    const mockDb = { project: { create: vi.fn() } };
    mockDb.project.create.mockResolvedValue({ id: "123", name: "Test" });

    const result = await createProject({ name: "Test" }, "user-1", mockDb);

    expect(result.name).toBe("Test");
    expect(mockDb.project.create).toHaveBeenCalledWith({
      data: { name: "Test", userId: "user-1" },
    });
  });
});
```

### Integration Tests

**Test:** Multiple units working together, real database
**Speed:** Seconds
**Mocking:** Minimal (maybe external APIs only)

```typescript
// Testing API route with real database
describe("POST /api/projects", () => {
  beforeEach(async () => {
    await db.project.deleteMany(); // Clean state
  });

  it("should create project and return 201", async () => {
    const response = await request(app)
      .post("/api/projects")
      .send({ name: "Test Project" })
      .set("Authorization", `Bearer ${testToken}`);

    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe("Test Project");

    // Verify in database
    const project = await db.project.findFirst({
      where: { name: "Test Project" },
    });
    expect(project).not.toBeNull();
  });
});
```

### End-to-End Tests

**Test:** Full user flows through real UI
**Speed:** Seconds to minutes
**Mocking:** None (real everything)

```typescript
// Playwright test
test("user can create a project", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[name="email"]', "test@example.com");
  await page.fill('[name="password"]', "password");
  await page.click('button[type="submit"]');

  await page.waitForURL("/dashboard");

  await page.click("text=New Project");
  await page.fill('[name="projectName"]', "My New Project");
  await page.click('button:has-text("Create")');

  await expect(page.locator("text=My New Project")).toBeVisible();
});
```

### Test Pyramid

```
         ╱╲
        ╱  ╲       E2E Tests (Few)
       ╱────╲      - Critical user journeys
      ╱      ╲     - Slow, expensive
     ╱────────╲
    ╱          ╲   Integration Tests (Some)
   ╱────────────╲  - API routes, database
  ╱              ╲ - Real dependencies
 ╱────────────────╲
╱                  ╲ Unit Tests (Many)
────────────────────  - Fast, isolated
                      - Most coverage here
```

---

## What to Test

### Always Test

- **Happy path:** Normal, expected usage
- **Edge cases:** Empty input, null, boundaries
- **Error cases:** Invalid input, not found, unauthorized
- **Business rules:** Domain-specific logic

### Test Priority

| Priority | What           | Example                           |
| -------- | -------------- | --------------------------------- |
| P0       | Business logic | calculatePrice(), validateOrder() |
| P0       | Security       | Auth checks, input validation     |
| P1       | API contracts  | Request/response shapes           |
| P1       | Error handling | Correct errors thrown             |
| P2       | Edge cases     | Empty arrays, null values         |
| P3       | UI components  | Render correctly                  |

### Don't Test

- Third-party library internals
- Framework code
- Simple getters/setters
- Private implementation details

---

## TDD with TODOs

Integrate TDD into your TODO workflow:

```markdown
## Task: Implement project creation

### TODOs

- [ ] T-001: Write failing test for createProject service
- [ ] T-002: Implement createProject to pass test
- [ ] T-003: Write failing test for POST /api/projects route
- [ ] T-004: Implement route handler to pass test
- [ ] T-005: Write failing test for error cases
- [ ] T-006: Implement error handling to pass tests
- [ ] T-007: Refactor and clean up
- [ ] T-008: Integration test for full flow
```

### Execution Pattern

```
For each TODO:
1. Read requirement
2. Write test (RED)
3. Run test - verify fails
4. Implement (GREEN)
5. Run test - verify passes
6. Refactor if needed
7. Run test - verify still passes
8. Move to next TODO
```

---

## Test File Organization

### Colocated Tests (Recommended)

```
src/
├── services/
│   ├── project.ts
│   └── project.test.ts      # Right next to source
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx
```

### Separate Test Directory

```
src/
├── services/
│   └── project.ts
tests/
├── unit/
│   └── services/
│       └── project.test.ts
├── integration/
│   └── api/
│       └── projects.test.ts
└── e2e/
    └── project-creation.spec.ts
```

### Naming Convention

```
[filename].test.ts     # Unit tests
[filename].spec.ts     # Same as .test (convention varies)
[feature].e2e.ts       # End-to-end tests
[feature].integration.ts # Integration tests
```

---

## Common Testing Patterns

### Testing Async Functions

```typescript
it("should fetch user", async () => {
  const user = await getUser("123");
  expect(user.id).toBe("123");
});

it("should throw on not found", async () => {
  await expect(getUser("invalid")).rejects.toThrow(NotFoundError);
});
```

### Testing with Mocks

```typescript
import { vi } from "vitest";

// Mock a module
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// In test
import { db } from "@/lib/db";

it("should call database", async () => {
  vi.mocked(db.user.findUnique).mockResolvedValue({ id: "1", name: "Test" });

  const result = await getUser("1");

  expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: "1" } });
  expect(result.name).toBe("Test");
});
```

### Testing Error Cases

```typescript
it("should throw ValidationError for empty name", () => {
  expect(() => createProject({ name: "" })).toThrow(ValidationError);
  expect(() => createProject({ name: "" })).toThrow("Name is required");
});

it("should return 400 for invalid input", async () => {
  const response = await request(app).post("/api/projects").send({ name: "" });

  expect(response.status).toBe(400);
  expect(response.body.error).toBe("Validation failed");
});
```

### Setup and Teardown

```typescript
describe("ProjectService", () => {
  let testUser: User;

  beforeAll(async () => {
    // Once before all tests in this describe
    await db.$connect();
  });

  afterAll(async () => {
    // Once after all tests
    await db.$disconnect();
  });

  beforeEach(async () => {
    // Before each test
    testUser = await createTestUser();
  });

  afterEach(async () => {
    // After each test - clean up
    await db.project.deleteMany();
    await db.user.deleteMany();
  });

  it("should create project for user", async () => {
    const project = await createProject({ name: "Test" }, testUser.id);
    expect(project.userId).toBe(testUser.id);
  });
});
```

---

## Quality Gates

### Before Marking Task Complete

```bash
# All tests pass
npm test

# No lint errors
npm run lint

# Type check passes
npm run typecheck

# Coverage acceptable (if configured)
npm test -- --coverage
```

### Coverage Guidelines

| Type           | Target |
| -------------- | ------ |
| Business logic | 80%+   |
| API routes     | 70%+   |
| Utilities      | 90%+   |
| UI components  | 60%+   |

**Note:** Coverage is a guide, not a goal. 100% coverage with bad tests is worthless.

---

## When Tests Are Hard to Write

If a test is difficult to write, it usually means:

| Symptom                     | Problem                               | Solution                     |
| --------------------------- | ------------------------------------- | ---------------------------- |
| Too many mocks needed       | Function does too much                | Split into smaller functions |
| Can't isolate the unit      | Tight coupling                        | Dependency injection         |
| Test is complicated         | Code is complicated                   | Simplify the code            |
| Need database for unit test | Business logic mixed with data access | Extract pure functions       |

**Hard-to-test code is usually poorly designed code.**

---

## Anti-Patterns

| ❌ Don't                           | ✅ Do Instead                 |
| ---------------------------------- | ----------------------------- |
| Write implementation first         | Write failing test first      |
| Write test that passes immediately | Ensure test fails initially   |
| Test implementation details        | Test behavior and outcomes    |
| Skip the refactor step             | Always refactor after green   |
| Write one big test                 | Many small focused tests      |
| Ignore failing tests               | Fix immediately or delete     |
| Mock everything                    | Mock only external boundaries |
| Aim for 100% coverage              | Aim for meaningful coverage   |

---

## Quick Reference

### TDD Mantra

```
RED:    Test fails (proves test works)
GREEN:  Test passes (proves code works)
REFACTOR: Code improves (proves design improves)
```

### Commands

```bash
# Run all tests
npm test

# Run specific file
npm test -- path/to/file.test.ts

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run matching pattern
npm test -- -t "should create project"
```

### Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("ModuleName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("functionName", () => {
    it("should [behavior] when [condition]", () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

---

## Checklist Before Moving On

- [ ] Test written BEFORE implementation
- [ ] Test failed initially (RED confirmed)
- [ ] Implementation makes test pass (GREEN confirmed)
- [ ] Code refactored if needed
- [ ] All tests still passing after refactor
- [ ] Test names describe behavior clearly
- [ ] Edge cases and errors tested
- [ ] No skipped or commented-out tests
