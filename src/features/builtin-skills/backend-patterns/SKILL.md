---
name: backend-patterns
description: Service layer architecture for Next.js applications. Patterns for
  business logic, error handling, and data operations. Use when implementing
  services, not API routes (use api-design for routes).
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

# Backend Patterns

You write **framework-agnostic business logic** that lives in the service layer.
Services are the heart of the application - they contain the "what" while
routes/actions contain the "how to receive" and components contain the "how to display."

---

## The Golden Rule

**Services know nothing about:**

- HTTP (no Request/Response objects)
- React (no hooks, no components)
- Next.js (no next/server imports)

**Services only know about:**

- Business logic
- Data operations
- Types and schemas
- Other services

This makes services **testable, portable, and reusable**.

---

## Service Layer Location

```
src/
├── services/
│   ├── index.ts              # Re-exports for clean imports
│   ├── user.ts               # User operations
│   ├── project.ts            # Project operations
│   ├── auth.ts               # Auth logic (not NextAuth config)
│   └── email.ts              # Email operations
│
├── lib/
│   ├── db.ts                 # Prisma client instance
│   ├── errors.ts             # Custom error classes
│   └── utils.ts              # Pure utility functions
│
└── types/
    └── index.ts              # Shared types
```

---

## Pattern 1: Service Function Structure

Every service function follows this shape:

```typescript
// src/services/project.ts

import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Project, CreateProjectInput } from "@/types";

export async function createProject(
  input: CreateProjectInput,
  userId: string
): Promise<Project> {
  // 1. VALIDATE business rules (not schema - that's the API layer's job)
  const existingProject = await db.project.findFirst({
    where: { name: input.name, userId },
  });

  if (existingProject) {
    throw new ValidationError("Project with this name already exists");
  }

  // 2. EXECUTE the operation
  const project = await db.project.create({
    data: {
      ...input,
      userId,
    },
  });

  // 3. RETURN the result (let the caller decide what to do with it)
  return project;
}
```

### What Goes Where

| Concern                     | Where              | Example                        |
| --------------------------- | ------------------ | ------------------------------ |
| Schema validation (shape)   | API route / Action | Zod `.safeParse()`             |
| Business validation (rules) | Service            | "Name must be unique per user" |
| Data operations             | Service            | Create, read, update, delete   |
| Response formatting         | API route / Action | `{ data: result }`             |
| Error translation           | API route / Action | Convert to HTTP status         |

---

## Pattern 2: Error Handling

### Define Custom Errors

```typescript
// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      "NOT_FOUND",
      404
    );
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}
```

### Throw in Services, Catch in Routes

```typescript
// In service - throw meaningful errors
export async function getProject(id: string, userId: string): Promise<Project> {
  const project = await db.project.findUnique({ where: { id } });

  if (!project) {
    throw new NotFoundError("Project", id);
  }

  if (project.userId !== userId) {
    throw new ForbiddenError("You do not have access to this project");
  }

  return project;
}

// In API route - catch and convert to response
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const project = await getProject(params.id, userId);
    return NextResponse.json({ data: project });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    // Unknown error - don't leak details
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
```

---

## Pattern 3: Database Access

### Single Prisma Instance

```typescript
// src/lib/db.ts

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

### Query Patterns

```typescript
// GOOD: Select only what you need
const user = await db.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
    // Don't select passwordHash!
  },
});

// GOOD: Use transactions for multi-step operations
const [project, membership] = await db.$transaction([
  db.project.create({ data: projectData }),
  db.projectMember.create({ data: memberData }),
]);

// GOOD: Paginate lists
async function listProjects(userId: string, page = 1, limit = 20) {
  const [data, total] = await Promise.all([
    db.project.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    db.project.count({ where: { userId } }),
  ]);

  return { data, total, page, limit };
}
```

---

## Pattern 4: Service Composition

Services can call other services, but keep it shallow:

```typescript
// src/services/project.ts

import * as userService from "./user";
import * as emailService from "./email";

export async function createProject(
  input: CreateProjectInput,
  userId: string
): Promise<Project> {
  // Validate user exists and is active
  const user = await userService.getById(userId);

  if (!user.isActive) {
    throw new ForbiddenError("Account is inactive");
  }

  const project = await db.project.create({
    data: { ...input, userId },
  });

  // Side effect: send notification (don't await if not critical)
  emailService
    .sendProjectCreated(user.email, project.name)
    .catch(console.error);

  return project;
}
```

### Avoid Deep Nesting

```
✅ Route → Service → DB
✅ Route → Service → Service → DB (2 levels max)
❌ Route → Service → Service → Service → Service → DB
```

If you need deep composition, you probably need to rethink the boundaries.

---

## Pattern 5: Input/Output Types

### Define Clear Boundaries

```typescript
// src/types/project.ts

// What the database returns (Prisma generates this)
import type { Project as PrismaProject } from "@prisma/client";

// What the API accepts (matches Zod schema)
export type CreateProjectInput = {
  name: string;
  description?: string;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

// What the API returns (safe to expose)
export type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Transform function if DB shape differs from API shape
export function toProject(dbProject: PrismaProject): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description,
    createdAt: dbProject.createdAt,
    updatedAt: dbProject.updatedAt,
    // Note: userId is NOT included - internal detail
  };
}
```

---

## Pattern 6: Configuration & Environment

```typescript
// src/lib/config.ts

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // Optional with defaults
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// Validate at startup - fail fast
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten());
  process.exit(1);
}

export const config = parsed.data;
```

---

## Pattern 7: Soft Delete (When Needed)

```typescript
// In Prisma schema
model Project {
  id        String    @id @default(cuid())
  name      String
  deletedAt DateTime? // null = active, timestamp = deleted
  // ...
}

// In service
export async function deleteProject(id: string, userId: string): Promise<void> {
  const project = await getProject(id, userId) // Validates ownership

  await db.project.update({
    where: { id },
    data: { deletedAt: new Date() }
  })
}

// In queries - always filter
export async function listProjects(userId: string) {
  return db.project.findMany({
    where: {
      userId,
      deletedAt: null  // Only active projects
    }
  })
}
```

---

## Anti-Patterns to Avoid

| 🚫 Don't                          | ✅ Do Instead                            |
| --------------------------------- | ---------------------------------------- |
| Import `NextResponse` in services | Return data, let route format response   |
| Import `Request` in services      | Accept typed parameters                  |
| `console.log` for errors          | Throw typed errors, catch at boundary    |
| Raw `try/catch` everywhere        | Throw in services, single catch in route |
| Return `null` for not found       | Throw `NotFoundError`                    |
| Mixed DB + business logic         | Separate query from business rules       |
| God services (1000+ lines)        | Split by domain (user, project, etc.)    |
| Circular service imports          | Rethink boundaries if this happens       |

---

## Service File Template

```typescript
// src/services/[resource].ts

import { db } from "@/lib/db";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";
import type {
  Resource,
  CreateResourceInput,
  UpdateResourceInput,
} from "@/types";

// ============ QUERIES ============

export async function getById(id: string, userId: string): Promise<Resource> {
  const resource = await db.resource.findUnique({ where: { id } });

  if (!resource || resource.deletedAt) {
    throw new NotFoundError("Resource", id);
  }

  if (resource.userId !== userId) {
    throw new ForbiddenError();
  }

  return resource;
}

export async function list(userId: string, page = 1, limit = 20) {
  const where = { userId, deletedAt: null };

  const [data, total] = await Promise.all([
    db.resource.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    db.resource.count({ where }),
  ]);

  return { data, total, page, limit };
}

// ============ MUTATIONS ============

export async function create(
  input: CreateResourceInput,
  userId: string
): Promise<Resource> {
  // Business validation
  // ...

  return db.resource.create({
    data: { ...input, userId },
  });
}

export async function update(
  id: string,
  input: UpdateResourceInput,
  userId: string
): Promise<Resource> {
  await getById(id, userId); // Validates existence and ownership

  return db.resource.update({
    where: { id },
    data: input,
  });
}

export async function remove(id: string, userId: string): Promise<void> {
  await getById(id, userId);

  await db.resource.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
```

---

## Self-Audit

### Check 1: No Framework Imports in Services

```bash
grep -rE "from ['\"]next|from ['\"]react" src/services/
```

**Expected:** No matches.

### Check 2: No Direct Response Handling

```bash
grep -rE "NextResponse|Response\(" src/services/
```

**Expected:** No matches.

### Check 3: Errors Are Typed

```bash
grep -rE "throw new Error\(" src/services/
```

**Expected:** No matches. Use custom error classes.

### Check 4: No Console in Production Code

```bash
grep -rE "console\.(log|error|warn)" src/services/ | grep -v ".catch(console"
```

**Expected:** Minimal matches, only for non-critical fire-and-forget operations.

---

## Checklist Before Done

- [ ] Services have no Next.js/React imports
- [ ] All errors use custom error classes
- [ ] Database access through `@/lib/db` only
- [ ] Functions accept typed parameters, not Request objects
- [ ] Functions return typed data, not Response objects
- [ ] Business validation in services, schema validation in routes
- [ ] No god services (split by domain)
- [ ] Self-audit grep commands pass

```

```
