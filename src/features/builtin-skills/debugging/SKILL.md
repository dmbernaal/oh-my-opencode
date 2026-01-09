---
name: debugging
description: Systematic approach to diagnosing and fixing bugs. Use when
  encountering errors, unexpected behavior, or performance issues.
---

# Debugging

You diagnose problems systematically rather than guessing. Follow the
scientific method: observe, hypothesize, test, conclude.

---

## The Debugging Protocol

### Phase 1: Reproduce

Before fixing anything, reliably reproduce the bug:

1. **Get exact error message** (full stack trace if available)
2. **Identify reproduction steps**
   - What action triggered the error?
   - What state was the system in?
   - Is it consistent or intermittent?
3. **Isolate the scope**
   - Does it happen in dev? Prod? Both?
   - Does it happen for all users or specific cases?
   - When did it start? What changed?

If you cannot reproduce, you cannot verify the fix.

---

### Phase 2: Locate

Narrow down where the bug lives:

**For Errors with Stack Traces:**

1. Read the stack trace bottom-to-top
2. Find the first frame in YOUR code (not node_modules)
3. That's your starting point

**For Silent Failures:**

1. Add strategic console.log/debug statements
2. Binary search: log at midpoint, determine which half fails
3. Repeat until you find the exact line

**For UI Bugs:**

1. Inspect with React DevTools / browser DevTools
2. Check state: is it what you expect?
3. Check props: are they being passed correctly?
4. Check network: are API calls returning expected data?

---

### Phase 3: Understand

Before writing any fix, understand the root cause:

**Ask:**

- Why does this code behave this way?
- What was the original intent?
- What assumption is being violated?

**Common Root Causes:**

| Symptom                             | Likely Cause                        |
| ----------------------------------- | ----------------------------------- |
| `undefined is not a function`       | Missing null check, wrong import    |
| `Cannot read property of undefined` | Async timing, missing data          |
| Component not rendering             | Key prop issues, conditional logic  |
| Stale data                          | Missing dependency in useEffect     |
| Works locally, fails in prod        | Environment variables, build config |

---

### Phase 4: Fix

Now write the fix:

**Surgery Mode Fixes:**

- Change minimum code necessary
- Don't refactor while fixing
- Add defensive checks if pattern exists elsewhere

**Feature Mode Fixes:**

- Address root cause properly
- Add tests that would have caught this
- Consider if similar bugs exist elsewhere

---

### Phase 5: Verify

1. Reproduce original bug → confirm it's fixed
2. Run existing tests → confirm no regressions
3. Test edge cases related to your change
4. If applicable, test in staging before prod

---

## Anti-Patterns to Avoid

| ❌ Don't                       | ✅ Do Instead                      |
| ------------------------------ | ---------------------------------- |
| Change multiple things at once | One change, test, repeat           |
| Guess and check randomly       | Form hypothesis, test specifically |
| Remove code that "looks wrong" | Understand why it was there        |
| Ignore error messages          | Read them carefully                |
| Fix symptoms not causes        | Find the root cause                |
| Skip reproduction steps        | Always reproduce first             |

---

## When to Ask for Help

Invoke @oracle if:

- Bug involves complex async/concurrency issues
- Root cause is unclear after 20 minutes of investigation
- Fix seems to require architecture changes
- Bug is in unfamiliar territory (auth, payments, etc.)
