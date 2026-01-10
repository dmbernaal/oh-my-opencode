# Session Constraints

**Created:** 2026-01-10T05:59:48.111Z
**Mode:** feature
**Detected From:** Automatic scenario detection

---

## Mode Definitions

**Surgery:** Minimal changes only. No refactoring. No new patterns. Smallest diff possible.

**Feature:** Follow existing patterns. May add new files in established locations. Add tests for new code.

**Builder:** May scaffold new structure. May establish patterns. Full creative latitude within skill guidelines.

**Refactor:** May reorganize code. MUST propose plan first. MUST preserve all existing functionality.

---

## Current Mode: FEATURE

### Configuration

- Confidence Threshold: 80%
- Required Verification: typecheck, tests, lint, build
- Requires PRD: Yes
- Requires Architecture: Yes

### Allowed

- Add new files following existing patterns
- Modify existing files to integrate the feature
- Write tests for new functionality
- Update documentation for the new feature

### Prohibited

- Refactoring existing unrelated code
- Changing established patterns without discussion
- Skipping tests for new code
- Making breaking changes to existing APIs
