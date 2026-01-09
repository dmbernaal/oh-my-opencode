---
name: test-specification
description:
  Creates test plans and specifications from PRD requirements. Defines
  WHAT to test, not HOW. Produces test matrices and acceptance criteria that
  Sisyphus uses during TDD implementation. Use after architecture-design.
---

# Test Specification

You define **what needs to be tested** before implementation begins. You create
the test plan—Sisyphus executes it using `tdd-workflow`.

**You are the Plan agent. You do NOT write test code. You specify test requirements.**

---

## Where This Fits

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLANNING → EXECUTION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PRD (requirements)                                             │
│         │                                                       │
│         ▼                                                       │
│  Architecture Design (components, tasks)                        │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────┐                   │
│  │  TEST SPECIFICATION (this skill)        │                   │
│  │                                          │                   │
│  │  • What scenarios to test               │                   │
│  │  • Acceptance criteria per requirement  │                   │
│  │  • Test coverage matrix                 │                   │
│  │  • Test types needed                    │                   │
│  └─────────────────────────────────────────┘                   │
│         │                                                       │
│         ▼                                                       │
│  Sisyphus + tdd-workflow (writes actual tests)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Input Requirements

Before creating test specification, you need:

- [ ] PRD with functional requirements (`docs/prd-[feature].md`)
- [ ] Architecture design with components (`docs/arch-[feature].md`)

If these don't exist, create them first using `prd-creation` and `architecture-design` skills.

---

## Phase 1: Extract Testable Requirements

### From PRD to Test Cases

Each functional requirement becomes one or more test cases:

```
PRD Requirement:
  FR-001: User can create a project with name and description

Test Cases:
  TC-001: Create project with valid name and description
  TC-002: Create project with name only (description optional)
  TC-003: Reject project creation with empty name
  TC-004: Reject project creation with name > 100 characters
  TC-005: Reject project creation for unauthenticated user
```

### Requirement Analysis Questions

For each requirement, ask:

1. **Happy path:** What's the normal successful case?
2. **Validation:** What inputs should be rejected?
3. **Authorization:** Who can/cannot do this?
4. **Edge cases:** What about boundaries, empty values, duplicates?
5. **Error handling:** What errors can occur?

---

## Phase 2: Define Test Categories

### Test Type Selection

| Test Type   | What It Validates                   | When to Specify                             |
| ----------- | ----------------------------------- | ------------------------------------------- |
| Unit        | Individual functions work correctly | Business logic, utilities, services         |
| Integration | Components work together            | API routes + database, service combinations |
| E2E         | Full user flows work                | Critical user journeys                      |
| Contract    | API shapes are correct              | Public APIs, external integrations          |

### Coverage Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEST COVERAGE STRATEGY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  UNIT TESTS (Many)                                              │
│  ├── All service functions                                      │
│  ├── Validation logic                                           │
│  ├── Business rules                                             │
│  └── Utility functions                                          │
│                                                                 │
│  INTEGRATION TESTS (Some)                                       │
│  ├── API routes (request → response)                            │
│  ├── Database operations                                        │
│  └── Authentication flows                                       │
│                                                                 │
│  E2E TESTS (Few)                                                │
│  ├── User registration → first project                          │
│  ├── Critical purchase/payment flows                            │
│  └── Core feature journeys                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 3: Create Test Matrix

### Requirement-to-Test Mapping

| Req ID | Requirement    | Test Cases                             | Test Type         | Priority |
| ------ | -------------- | -------------------------------------- | ----------------- | -------- |
| FR-001 | Create project | TC-001, TC-002, TC-003, TC-004, TC-005 | Unit, Integration | P0       |
| FR-002 | List projects  | TC-006, TC-007, TC-008                 | Unit, Integration | P0       |
| FR-003 | Delete project | TC-009, TC-010, TC-011                 | Unit, Integration | P1       |

### Component Coverage Matrix

| Component             | Unit Tests                      | Integration Tests            | E2E Tests       |
| --------------------- | ------------------------------- | ---------------------------- | --------------- |
| projectService        | ✅ create, list, update, delete | -                            | -               |
| POST /api/projects    | -                               | ✅ success, validation, auth | -               |
| GET /api/projects     | -                               | ✅ list, pagination, filters | -               |
| Project creation flow | -                               | -                            | ✅ full journey |

---

## Phase 4: Write Test Specifications

### Test Case Format

```markdown
### TC-001: Create project with valid input

**Requirement:** FR-001
**Type:** Unit → Integration
**Priority:** P0

**Preconditions:**

- User is authenticated
- User has permission to create projects

**Input:**

- name: "My Project" (valid, 1-100 chars)
- description: "A test project" (optional)

**Expected Outcome:**

- Project is created in database
- Project has generated ID (cuid format)
- Project has generated slug (from name)
- Project is associated with user
- Returns project object with all fields

**Acceptance Criteria:**

- Given authenticated user
- When creating project with valid name
- Then project is created and returned with ID
```

### Test Case for Validation

```markdown
### TC-003: Reject project with empty name

**Requirement:** FR-001
**Type:** Unit → Integration
**Priority:** P0

**Preconditions:**

- User is authenticated

**Input:**

- name: "" (empty string)
- description: "Some description"

**Expected Outcome:**

- Project is NOT created
- ValidationError is thrown/returned
- Error message indicates name is required

**Acceptance Criteria:**

- Given authenticated user
- When creating project with empty name
- Then validation error is returned
- And no project is created in database
```

### Test Case for Authorization

```markdown
### TC-005: Reject project creation for unauthenticated user

**Requirement:** FR-001
**Type:** Integration
**Priority:** P0

**Preconditions:**

- No authentication token provided

**Input:**

- name: "My Project"

**Expected Outcome:**

- Request is rejected with 401 status
- Project is NOT created
- Error indicates authentication required

**Acceptance Criteria:**

- Given no authentication
- When attempting to create project
- Then 401 Unauthorized is returned
```

---

## Phase 5: E2E Test Scenarios

### User Journey Format

```markdown
## E2E-001: New user creates first project

**Priority:** P0
**Estimated Duration:** 30-60 seconds

### Journey Steps:

1. **Navigate to signup**

   - User visits /signup
   - Signup form is displayed

2. **Complete registration**

   - User enters email, password, name
   - User submits form
   - User is redirected to /dashboard

3. **Create first project**
   - User clicks "New Project" button
   - Project creation form appears
   - User enters project name
   - User clicks "Create"
4. **Verify project created**
   - Dashboard shows new project
   - Project name matches input
   - User can click into project

### Success Criteria:

- [ ] All steps complete without error
- [ ] Total time < 60 seconds
- [ ] Project visible in dashboard after creation
```

---

## Test Specification Document Template

```markdown
# Test Specification: [Feature Name]

**Author:** Plan Agent
**Date:** [Current Date]
**PRD:** [Link to PRD]
**Architecture:** [Link to Architecture]
**Status:** Draft | Review | Approved

---

## Overview

[Brief description of what's being tested and testing approach]

---

## Test Coverage Summary

| Category          | Count | Priority Breakdown |
| ----------------- | ----- | ------------------ |
| Unit Tests        | [X]   | P0: [Y], P1: [Z]   |
| Integration Tests | [X]   | P0: [Y], P1: [Z]   |
| E2E Tests         | [X]   | P0: [Y], P1: [Z]   |
| **Total**         | [X]   |                    |

---

## Requirements Traceability

| Req ID | Requirement   | Test Cases     | Status    |
| ------ | ------------- | -------------- | --------- |
| FR-001 | [Requirement] | TC-001, TC-002 | Specified |
| FR-002 | [Requirement] | TC-003, TC-004 | Specified |

---

## Unit Test Specifications

### [Component/Service Name]

#### TC-001: [Test Name]

**Requirement:** [FR-XXX]
**Priority:** [P0/P1/P2]

**Preconditions:**

- [Condition 1]

**Input:**

- [Input data]

**Expected Outcome:**

- [What should happen]

**Acceptance Criteria:**

- Given [context]
- When [action]
- Then [result]

---

#### TC-002: [Test Name]

[Same format...]

---

## Integration Test Specifications

### [API Endpoint / Component Combination]

#### TC-XXX: [Test Name]

[Same format with focus on component interaction]

---

## E2E Test Specifications

### E2E-001: [User Journey Name]

**Priority:** [P0/P1]
**Estimated Duration:** [Time]

**Journey Steps:**

1. [Step with expected behavior]
2. [Step with expected behavior]
3. [Step with expected behavior]

**Success Criteria:**

- [ ] [Measurable criterion]
- [ ] [Measurable criterion]

---

## Edge Cases and Boundary Tests

| Scenario      | Input     | Expected Result     | Test Case |
| ------------- | --------- | ------------------- | --------- |
| Empty input   | ""        | Validation error    | TC-XXX    |
| Max length    | 100 chars | Accepted            | TC-XXX    |
| Over max      | 101 chars | Validation error    | TC-XXX    |
| Special chars | "@#$%"    | [Accepted/Rejected] | TC-XXX    |

---

## Error Scenarios

| Error Type   | Trigger       | Expected Response   | Test Case |
| ------------ | ------------- | ------------------- | --------- |
| Validation   | Invalid input | 400 + error details | TC-XXX    |
| Not Found    | Invalid ID    | 404 + message       | TC-XXX    |
| Unauthorized | No token      | 401                 | TC-XXX    |
| Forbidden    | Wrong user    | 403                 | TC-XXX    |

---

## Test Data Requirements

### Fixtures Needed

- [ ] Test user with known credentials
- [ ] Test project with known ID
- [ ] [Other fixtures]

### Database State

- Tests should be isolated (clean state per test)
- Use transactions or cleanup in beforeEach/afterEach

---

## Non-Functional Test Considerations

| Aspect        | Requirement      | How to Test                   |
| ------------- | ---------------- | ----------------------------- |
| Performance   | Response < 200ms | Measure in integration tests  |
| Security      | No SQL injection | Include malicious input tests |
| Accessibility | WCAG 2.1 AA      | E2E with axe-core             |

---

## Test Execution Order

Recommended execution sequence:

1. Unit tests (fast, run first)
2. Integration tests (medium, run second)
3. E2E tests (slow, run last)

---

## Open Questions

- [ ] [Question about test approach]
- [ ] [Question needing stakeholder input]

---

## Handoff to Implementation

This specification is ready for Sisyphus to implement using `tdd-workflow`.

Priority order:

1. P0 test cases (must have)
2. P1 test cases (should have)
3. P2 test cases (nice to have)
```

---

## Output Location

Save test specification to:

```
docs/test-spec-[feature].md

Examples:
- docs/test-spec-authentication.md
- docs/test-spec-project-management.md
- docs/test-spec-billing.md
```

---

## Handoff to Sisyphus

After completing test specification:

```markdown
✅ Test specification complete: `docs/test-spec-[feature].md`

Summary:

- [x] unit test cases
- [x] integration test cases
- [x] E2E scenarios

Sisyphus should implement tests in priority order (P0 first) using
`tdd-workflow` skill. Each test case has acceptance criteria in
Given/When/Then format.
```

---

## Quality Checklist

### Completeness

- [ ] Every P0 requirement has test cases
- [ ] Every P1 requirement has test cases
- [ ] Happy paths covered
- [ ] Error cases covered
- [ ] Edge cases identified
- [ ] Authorization tests specified

### Clarity

- [ ] Each test case has clear acceptance criteria
- [ ] Given/When/Then format used
- [ ] Expected outcomes are specific
- [ ] Test data requirements documented

### Traceability

- [ ] Every test case links to a requirement
- [ ] Every requirement has at least one test case
- [ ] Test matrix shows coverage gaps

---

## Anti-Patterns

| ❌ Don't                    | ✅ Do Instead                          |
| --------------------------- | -------------------------------------- |
| Write actual test code      | Specify what to test, not how          |
| Vague acceptance criteria   | Specific Given/When/Then               |
| Skip error scenarios        | Cover validation, auth, not-found      |
| One test per requirement    | Multiple tests for different scenarios |
| Ignore edge cases           | Explicitly list boundaries             |
| Forget authorization        | Every endpoint needs auth tests        |
| Test implementation details | Test behavior and outcomes             |

---

## Checklist Before Done

- [ ] All P0 requirements have test cases
- [ ] All P1 requirements have test cases
- [ ] Test matrix shows complete coverage
- [ ] Acceptance criteria in Given/When/Then format
- [ ] Error scenarios documented
- [ ] Edge cases identified
- [ ] E2E journeys for critical flows
- [ ] Test data requirements listed
- [ ] Document saved to `docs/test-spec-[feature].md`
- [ ] Ready for Sisyphus to implement with tdd-workflow
