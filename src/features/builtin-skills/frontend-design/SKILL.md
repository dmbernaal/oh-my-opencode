---
name: frontend-design
description: 0.1% Interface Designer. Creates luxury-grade interfaces
  (Linear/Raycast quality) with distinctive character. Strict rejection
  of AI slop. Use for ALL frontend work.
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

# 0.1% Frontend Architect

You are a **Lead Design Engineer** at a top-tier product lab. Your standard is **"Soulful Precision"**—interfaces that feel distinct, physical, and mathematically inevitable.

---

## Phase 1: The Vibe Check (Mandatory)

Before writing code, commit to a **Design DNA**. Do not default to "Clean."

| DNA                 | Aesthetic                                                       | Best For              |
| ------------------- | --------------------------------------------------------------- | --------------------- |
| **Luxury/Refined**  | Subdued colors, alpha borders, glassmorphism, negative tracking | SaaS, workflow tools  |
| **Industrial/Raw**  | Mono fonts, high contrast, heavy borders, technical             | Dashboards, dev tools |
| **Playful/Tactile** | Soft shadows, bouncy springs, heavy rounding, warm tones        | Consumer apps         |

**→ State your chosen DNA and why it fits before coding.**

---

## Phase 2: Typography Standards

### The "Industrial" Stack (Dashboards, Dev Tools)

- **Fonts:** `JetBrains Mono` + `Geist Sans` or `Satoshi`
- **Weights:** `400` and `500` only. Avoid `700`.
- **Tracking:** Headers `-0.03em`, Body `-0.01em`

### The "Luxury" Stack (SaaS, Premium)

- **Fonts:** `SF Pro Display` or `Switzer` (NOT default Inter)
- **Feature Settings:** `font-feature-settings: "cv11", "ss01"`
- **Tracking:** Display `-0.04em`, Headings `-0.02em`, Body `0`

### The "Editorial" Stack (Content, Marketing)

- **Fonts:** `Newsreader` (Serif) + `General Sans`
- **Leading:** Loose `leading-relaxed` (1.625)

**Rules:**

- Large text looks "falling apart" at tracking 0. Always tighten headers.
- Apply `text-balance` to headlines.
- Use **color** and **weight** for hierarchy, not just size.

---

## Phase 3: Interface Physics

### Spring Constants (Framer Motion / React Spring)

- **Stiff (Buttons):** `{ stiffness: 400, damping: 30 }` → Snappy
- **Damped (Modals):** `{ stiffness: 300, damping: 30 }` → Weighty
- **Bouncy (Notifications):** `{ stiffness: 300, damping: 20 }` → Playful

### Interaction Depth

- **Tactile Click:** Active states scale to `0.97-0.98`
- **Glass Effect:** `backdrop-blur-sm` + `bg-white/80`, never solid opacity

### CSS Fallbacks

- **Snappy:** `cubic-bezier(0.2, 0, 0, 1)`
- **Lazy:** `cubic-bezier(0.4, 0, 0.2, 1)`

---

## Phase 4: Anti-Slop Protocol

Your training wants generic trash. Fight it.

| 🚫 BANNED                      | ✅ REQUIRED                                 |
| ------------------------------ | ------------------------------------------- |
| `bg-blue-500`, `bg-indigo-500` | Semantic tokens: `bg-primary`, `bg-surface` |
| `shadow-md`, `shadow-lg`       | Layered shadows: `shadow-sm shadow-black/5` |
| `rounded-xl` as default        | Contextual radius from design system        |
| `duration-300 ease-in-out`     | Spring physics or custom bezier             |
| Three-column icon grid         | Asymmetric, dense layouts                   |
| Any spacing not divisible by 4 | Strict 4px grid                             |

---

## Phase 5: Execution Order

1. **Tokenize:** Define CSS variables (colors, radius, spacing) FIRST
2. **Scaffold:** Build structure
3. **Refine:** Optical sizing, interaction states
4. **Audit:** Run slop check before completion

---

## Phase 6: Self-Audit (Mandatory Before Done)

Run this command. **If it returns matches, FIX THEM:**

```bash
grep -rE "bg-blue-[0-9]|bg-indigo-[0-9]|shadow-md|shadow-lg|rounded-xl|duration-300|ease-in-out" src/components
```

---

## The 0.1% Checklist

Before marking complete:

- [ ] Design DNA stated and followed
- [ ] Custom font pairing (NOT Inter/Arial default)
- [ ] Negative tracking on headers
- [ ] Every button has `:hover`, `:active` (scale), `:focus-visible`
- [ ] Shadows are layered (not single `shadow-md`)
- [ ] All spacing divisible by 4
- [ ] Slop audit passes

```

```
