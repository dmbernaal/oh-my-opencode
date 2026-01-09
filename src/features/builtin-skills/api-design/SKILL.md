---
name: api-design
description: Architects type-safe API contracts for Next.js App Router.
  Enforces thin controllers, Zod validation, and standardized responses.
  Use when creating routes, Server Actions, or API contracts.
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

# API Systems Architect

You build **Type-Safe Pipelines**, not "endpoints." Every route is a contract.

---

## Core Philosophy: Thin Controllers

Route handlers are **Border Guards**, not workers.

```
Request → Validate → Call Service → Format Response
   │          │            │              │
   │          │            │              └── Your job: shape the output
   │          │            └── Service's job: business logic, DB
   │          └── Your job: reject bad input
   └── Your job: parse the request
```

**NEVER** put business logic or database queries in route handlers.

---

## Decision: Route Handler vs Server Action

| Use Route Handler (`route.ts`)            | Use Server Action          |
| ----------------------------------------- | -------------------------- |
| External clients (mobile, webhooks)       | Your own UI only           |
| Need REST semantics (GET/POST/PUT/DELETE) | Form submissions           |
| Public API                                | Mutations from components  |
| Needs to be called via fetch              | Called directly from React |

---

## Route Organization (Next.js App Router)

```
app/
├── api/
│   ├── auth/
│   │   ├── login/route.ts        # POST only
│   │   ├── logout/route.ts       # POST only
│   │   └── me/route.ts           # GET only
│   │
│   ├── users/
│   │   ├── route.ts              # GET (list), POST (create)
│   │   └── [id]/
│   │       └── route.ts          # GET, PATCH, DELETE (single)
│   │
│   └── webhooks/
│       └── stripe/route.ts       # POST (external)
│
├── actions/                       # Server Actions
│   ├── auth.ts
│   ├── users.ts
│   └── projects.ts
```

---

## The Contract Pattern

### Step 1: Define Schemas (The Contract)

```typescript
// app/api/projects/schemas.ts (or top of route.ts if small)
import { z } from "zod";

// Input schemas - strict validation
export const CreateProjectInput = z.object({
  name: z.string().min(1, "Name required").max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

export const UpdateProjectInput = CreateProjectInput.partial();

export const ProjectIdParam = z.object({
  id: z.string().uuid("Invalid project ID"),
});

// Output types - what the API returns
export type Project = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### Step 2: Route Handler Structure

```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CreateProjectInput } from "./schemas";
import { projectService } from "@/services/projects";

// LIST
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const { data, total } = await projectService.list({ page, limit });

  return NextResponse.json({
    data,
    meta: { total, page, limit },
  });
}

// CREATE
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateProjectInput.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const project = await projectService.create(parsed.data);

  return NextResponse.json({ data: project }, { status: 201 });
}
```

### Step 3: Single Resource Pattern

```typescript
// app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ProjectIdParam, UpdateProjectInput } from "../schemas";
import { projectService } from "@/services/projects";

type Params = { params: Promise<{ id: string }> };

// GET single
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const project = await projectService.findById(id);

  if (!project) {
    return NextResponse.json(
      {
        error: "Project not found",
        code: "NOT_FOUND",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: project });
}

// UPDATE
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const parsed = UpdateProjectInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const project = await projectService.update(id, parsed.data);

  return NextResponse.json({ data: project });
}

// DELETE
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;

  await projectService.delete(id);

  return new NextResponse(null, { status: 204 });
}
```

---

## Server Action Pattern

```typescript
// app/actions/projects.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { projectService } from "@/services/projects";

const CreateProjectInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

export async function createProject(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const raw = {
    name: formData.get("name"),
    description: formData.get("description"),
  };

  const parsed = CreateProjectInput.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      details: parsed.error.flatten(),
    };
  }

  const project = await projectService.create(parsed.data);

  revalidatePath("/projects");

  return { success: true, data: { id: project.id } };
}
```

---

## Response Envelope Standard

**Success responses:**

```typescript
// Single item
{ data: Project }

// List with pagination
{ data: Project[], meta: { total: number, page: number, limit: number } }

// Empty success (for DELETE)
// Return 204 No Content with no body
```

**Error responses:**

```typescript
{
  error: string,      // Human-readable message
  code: string,       // Machine-readable code (VALIDATION_ERROR, NOT_FOUND, etc.)
  details?: unknown   // Zod errors or additional context
}
```

**Status codes:**
| Code | When |
|------|------|
| 200 | GET success, UPDATE success |
| 201 | CREATE success |
| 204 | DELETE success (no body) |
| 400 | Validation failed |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Resource not found |
| 500 | Server error (don't expose details) |

---

## Anti-Slop Rules

| 🚫 BANNED                             | ✅ REQUIRED                                |
| ------------------------------------- | ------------------------------------------ |
| `await req.json()` without validation | Always `Schema.safeParse(body)`            |
| `prisma.` or `db.` in route files     | Import from `@/services/*`                 |
| `return NextResponse.json(user)`      | `return NextResponse.json({ data: user })` |
| Inline SQL or queries                 | Service layer handles data access          |
| `any` types                           | Explicit Zod schemas and inferred types    |
| Catching errors silently              | Proper error responses with codes          |

---

## Self-Audit (Run Before Complete)

### Check 1: Direct DB Access (Critical)

```bash
grep -rE "(prisma\.|db\.|drizzle\.)" app/api/
```

**Expected:** No matches. All DB access should be in `services/`.

### Check 2: Raw JSON Without Validation

```bash
grep -rE "await (req|request)\.json\(\)" app/api/ | grep -v safeParse
```

**Expected:** No matches. Every `.json()` should have `.safeParse()`.

### Check 3: Non-Standard Responses

```bash
grep -rE "NextResponse\.json\([^{]" app/api/
```

**Expected:** No matches. Never return raw values like `NextResponse.json(user)`.

### Check 4: Missing Error Codes

```bash
grep -rE '"error":' app/api/ | grep -v '"code":'
```

**Expected:** No matches. Every error should have a code.

---

## Checklist Before Done

- [ ] Zod schema defined for all inputs
- [ ] Route handler only parses, validates, calls service, returns
- [ ] No business logic in route file
- [ ] No direct DB imports in route file
- [ ] All responses follow `{ data }` or `{ error, code }` shape
- [ ] Correct HTTP status codes used
- [ ] Types exported for frontend consumption
- [ ] Self-audit grep commands pass

```

---

## What Changed

| Before | After |
|--------|-------|
| Python script for auditing | Grep commands inline |
| Single weak template | Multiple contextual patterns |
| Generic email example | Real-world project CRUD |
| Missing Server Actions | Full Server Action pattern |
| Missing pagination | List with meta pattern |
| Templates folder | Patterns in SKILL.md |

## File Structure Now
```
~/.config/opencode/skill/api-design/
└── SKILL.md # Everything consolidated
