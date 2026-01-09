---
name: database-design
description:
  Database schema design principles, migrations, and query optimization.
  Technology-agnostic patterns that adapt to project's chosen ORM and database.
  Check project context (AGENTS.md, docs/) for tech stack before applying.
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

# Database Design

You design **data structures that scale** and **queries that perform**. These
principles apply regardless of database or ORM choice.

---

## Step 0: Check Project Context (Mandatory)

Before applying any patterns, determine the project's tech stack:

1. Read `AGENTS.md` in project root
2. Check `docs/architecture.md` or `docs/prd.md` if they exist
3. Look at existing code: `package.json`, `schema.prisma`, `drizzle.config.ts`, etc.

**Adapt all examples to the project's actual stack.**

Common stacks you may encounter:
| ORM/Query Builder | Database | Config File |
|-------------------|----------|-------------|
| Prisma | PostgreSQL, MySQL, SQLite | `prisma/schema.prisma` |
| Drizzle | PostgreSQL, MySQL, SQLite | `drizzle.config.ts` |
| Kysely | PostgreSQL, MySQL, SQLite | Custom setup |
| TypeORM | PostgreSQL, MySQL, SQLite | `ormconfig.json` |
| Mongoose | MongoDB | Connection string |
| Raw SQL | Any | N/A |

---

## Phase 1: Schema Design Principles

These principles apply to ALL databases.

### The Three Questions

Before creating any model, answer:

1. **What is the source of truth?** (Where does this data originate?)
2. **Who owns this data?** (What entity controls its lifecycle?)
3. **How will this data be queried?** (Read patterns determine structure)

### Naming Conventions

| Element        | Convention                               | Example                              |
| -------------- | ---------------------------------------- | ------------------------------------ |
| Tables/Models  | PascalCase or snake_case (match project) | `User`, `user`, `project_membership` |
| Columns/Fields | camelCase or snake_case (match project)  | `createdAt`, `created_at`            |
| Foreign Keys   | Reference + Id                           | `userId`, `user_id`                  |
| Booleans       | is/has prefix                            | `isActive`, `hasVerified`            |
| Timestamps     | Past tense or At suffix                  | `createdAt`, `deletedAt`             |

**Check existing code for project conventions and follow them.**

### Required Fields (Every Table)

Regardless of ORM, every table should have:

```
id         - Primary key (see ID strategy below)
created_at - When record was created
updated_at - When record was last modified
```

### ID Strategy

| Strategy       | Pros                          | Cons                          | Use When            |
| -------------- | ----------------------------- | ----------------------------- | ------------------- |
| UUID/GUID      | Globally unique, no collision | Long (36 chars), not sortable | Distributed systems |
| CUID/CUID2     | Sortable, shorter, URL-safe   | Less universal                | Most web apps       |
| ULID           | Sortable, shorter than UUID   | Less common                   | Time-series data    |
| Auto-increment | Simple, small                 | Enumerable, leaks count       | Internal tools only |
| NanoID         | Very short, customizable      | Collision risk if too short   | URL slugs           |

**Decision:** Check project's existing IDs. Match the pattern. If greenfield, CUID2 is a good default for web apps.

---

## Phase 2: Relationship Patterns

### One-to-Many

The most common relationship. One parent has many children.

```
User (one) ──────< Project (many)

- Project table has userId foreign key
- User can access their projects via relation
- Deleting user cascades or restricts based on rules
```

**Key decisions:**

- On delete: CASCADE (delete children) vs RESTRICT (block) vs SET NULL
- Index the foreign key column (most ORMs don't auto-index)

### Many-to-Many

Two entities with bidirectional multiple relationships.

**Implicit (ORM handles join table):**

```
User >────────< Project
     (members)

- ORM creates hidden join table
- Simple but no metadata on relationship
```

**Explicit (You control join table):**

```
User ──< ProjectMembership >── Project

- Join table is a real model
- Can store role, joinedAt, permissions
- More flexible, slightly more complex
```

**Use explicit when:** The relationship itself has data (roles, timestamps, status).

### Self-Referential

Entity references itself. Common for trees/hierarchies.

```
Comment
├── id
├── content
├── parentId → Comment (nullable)
└── replies[] → Comment[]
```

**Consider:** Do you need full tree operations? May need recursive queries or closure table pattern for deep hierarchies.

---

## Phase 3: Data Integrity

### Soft Delete Pattern

Don't destroy data—mark it deleted.

```
Table: Project
├── ... fields ...
├── deletedAt: timestamp (nullable)
│
└── null = active, timestamp = deleted
```

**Critical:** Every query must filter `WHERE deletedAt IS NULL` unless explicitly including deleted records.

### Unique Constraints

```
Simple:      email must be unique globally
Compound:    slug must be unique per user (userId + slug)
Partial:     email unique only where deletedAt IS NULL
```

**Compound unique prevents:** User having two projects with same name.

### Enums vs Strings

| Use Enum            | Use String               |
| ------------------- | ------------------------ |
| Finite known values | User-provided values     |
| Rarely changes      | Frequently changes       |
| Type safety needed  | Flexibility needed       |
| status, role, type  | tags, labels, categories |

---

## Phase 4: Indexing Strategy

### Index Rules (Universal)

1. **Always index foreign keys** (most ORMs don't auto-create these)
2. **Index columns in WHERE clauses**
3. **Index columns in ORDER BY**
4. **Consider composite indexes for common query patterns**

### Composite Index Order

```sql
-- Query: WHERE user_id = ? AND status = ?
-- Index: (user_id, status) ✅

-- This index serves:
--   WHERE user_id = ?              ✅
--   WHERE user_id = ? AND status = ? ✅
--   WHERE status = ?               ❌ (need separate index)
```

**Rule:** Put high-cardinality columns first, filter columns before sort columns.

### When NOT to Index

- Boolean columns alone (low cardinality)
- Tables under 1000 rows
- Columns rarely queried
- Write-heavy tables (indexes slow writes)

---

## Phase 5: Query Patterns

### Avoid N+1 Queries

```
❌ N+1 Problem:
   1 query to get projects
   N queries to get each project's owner

✅ Solution:
   1 query with JOIN or eager loading
```

**How to fix (varies by ORM):**

- Prisma: `include: { owner: true }`
- Drizzle: `.leftJoin()` or `with` relations
- TypeORM: `relations: ['owner']`
- Raw SQL: `JOIN`

### Select Only Needed Fields

```
❌ Bad: SELECT * FROM users
✅ Good: SELECT id, email, name FROM users

Why: Avoid fetching passwordHash, internal fields, large text columns
```

### Pagination (Two Approaches)

**Offset-based (Simple):**

```
Page 1: LIMIT 20 OFFSET 0
Page 2: LIMIT 20 OFFSET 20
Page 3: LIMIT 20 OFFSET 40

Pros: Simple, supports "jump to page"
Cons: Slow on large datasets, inconsistent if data changes
```

**Cursor-based (Scalable):**

```
First:  WHERE id > '' LIMIT 20
Next:   WHERE id > 'last_id' LIMIT 20

Pros: Fast on large datasets, consistent
Cons: No "jump to page", more complex
```

**Use cursor-based for:** Large datasets, infinite scroll, real-time data.

### Transactions

When multiple operations must succeed or fail together:

```
Transaction:
  1. Create project
  2. Create owner membership
  3. Send notification

If step 2 fails → rollback step 1
```

**All ORMs support this.** Syntax varies.

---

## Phase 6: Migration Practices

### Safe Migration Checklist

| Operation               | Safe? | Notes                                   |
| ----------------------- | ----- | --------------------------------------- |
| Add nullable column     | ✅    | Always safe                             |
| Add column with default | ✅    | Safe, but locks table briefly           |
| Add NOT NULL column     | ⚠️    | Must have default or migrate data first |
| Drop column             | ⚠️    | Remove code references first, then drop |
| Rename column           | ⚠️    | Requires code change coordination       |
| Add index               | ✅    | Safe, use CONCURRENTLY on large tables  |
| Drop index              | ✅    | Safe                                    |
| Change column type      | ⚠️    | May fail if data incompatible           |

### Migration Workflow

```
1. Make schema change
2. Generate migration (ORM command)
3. Review generated SQL
4. Test on copy of production data
5. Apply to staging
6. Apply to production
```

### Naming Migrations

```
Descriptive names:
  add_user_role_column
  create_project_membership_table
  add_index_on_project_status

Not:
  migration_001
  fix_stuff
  update
```

---

## Phase 7: Common Patterns

### Audit Trail

Track who changed what and when.

```
audit_log:
  - id
  - action (CREATE, UPDATE, DELETE)
  - entity_type (User, Project)
  - entity_id
  - changes (JSON: { field: { old, new } })
  - user_id (who made the change)
  - created_at
```

### Slug Pattern

URL-friendly identifiers.

```
project:
  - id (internal)
  - slug (public URL: "my-project")
  - name ("My Project")

Unique constraint: (user_id, slug)
```

### JSON/JSONB Fields

Flexible schema for metadata.

```
user_preferences:
  - user_id
  - settings: JSON { theme: 'dark', notifications: {...} }
```

**Use for:** Settings, metadata, external API data.
**Don't use for:** Data you need to query/filter, relationships, core fields.

### Polymorphic Relations

One table references multiple entity types.

```
comment:
  - id
  - content
  - commentable_type ('Project', 'Task', 'Document')
  - commentable_id

Alternative: Separate join tables (comment_projects, comment_tasks)
```

---

## ORM-Specific Quick Reference

Adapt these patterns to your project's ORM:

### Prisma

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  projects  Project[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}
```

### Drizzle

```typescript
export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text("email").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
  })
);
```

### Kysely

```typescript
interface Database {
  users: {
    id: string;
    email: string;
    created_at: Date;
    updated_at: Date;
  };
}
// Schema managed via migrations, Kysely is query-only
```

### Raw SQL (PostgreSQL)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
```

---

## Self-Audit

### Check 1: Foreign Keys Have Indexes

Review schema for FK columns, verify each has index.

### Check 2: All Tables Have Timestamps

Every table should have created_at, updated_at.

### Check 3: Soft Delete Filtered

If using soft delete, verify all queries filter `deletedAt IS NULL`.

### Check 4: No N+1 in Services

Review service layer for loops that query inside loops.

---

## Checklist Before Done

- [ ] Checked project context for ORM/database choice
- [ ] All tables have id, created_at, updated_at
- [ ] All foreign keys have indexes
- [ ] Unique constraints defined where needed
- [ ] Soft delete implemented if required
- [ ] Enums used for finite state fields
- [ ] No N+1 queries in services
- [ ] Pagination on all list queries
- [ ] Migrations named descriptively
- [ ] Complex migrations tested before production

```

```
