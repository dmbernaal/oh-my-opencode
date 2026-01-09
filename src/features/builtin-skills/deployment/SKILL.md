---
name: deployment
description: Handles deployment configuration, CI/CD setup, and shipping
  workflows. Use when user wants to deploy, set up pipelines, or configure
  production environments.
---

# Deployment

You configure deployment pipelines and help ship applications to production.

---

## Step 0: Detect Existing Deployment Config

Check for:

- `vercel.json` → Vercel deployment
- `netlify.toml` → Netlify deployment
- `Dockerfile` → Container deployment
- `.github/workflows/` → GitHub Actions CI/CD
- `fly.toml` → Fly.io deployment
- `render.yaml` → Render deployment
- `railway.json` → Railway deployment

If deployment config exists, follow existing patterns unless user requests changes.

---

## Platform Decision Matrix

| Project Type            | Recommended Platform | Why                         |
| ----------------------- | -------------------- | --------------------------- |
| Next.js (static/SSG)    | Vercel               | Native support, zero config |
| Next.js (SSR/API heavy) | Vercel or Railway    | Server functions included   |
| Pure React SPA          | Netlify or Vercel    | Simple static hosting       |
| Node.js API             | Railway or Fly.io    | Container flexibility       |
| Full-stack with DB      | Railway              | Built-in PostgreSQL         |
| Custom Docker needs     | Fly.io               | Full container control      |

---

## Vercel Deployment (Most Common)

### Prerequisites Check

1. [ ] Project builds successfully locally
2. [ ] All environment variables documented
3. [ ] Database is externally hosted (not SQLite)

### Setup Steps

1. Create `vercel.json` if custom config needed
2. Document required environment variables
3. Provide deployment command: `vercel --prod`

### vercel.json Template (if needed)

```json
{
  "buildCommand": "bun run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url"
  }
}
```

---

## CI/CD with GitHub Actions

### Basic CI Workflow

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Test
        run: bun test

      - name: Build
        run: bun run build
```

---

## Environment Variables

### Required Documentation

For every deployment, create or update `docs/deployment/env-vars.md`:

```markdown
# Environment Variables

## Required

| Variable        | Description                  | Example                  | Where to Get               |
| --------------- | ---------------------------- | ------------------------ | -------------------------- |
| DATABASE_URL    | PostgreSQL connection string | postgres://...           | Railway/Supabase dashboard |
| NEXTAUTH_SECRET | Auth encryption key          | [random 32 char]         | `openssl rand -base64 32`  |
| NEXTAUTH_URL    | App URL                      | https://myapp.vercel.app | Your domain                |

## Optional

| Variable  | Description       | Default |
| --------- | ----------------- | ------- |
| LOG_LEVEL | Logging verbosity | info    |
```

---

## Pre-Deployment Checklist

Before deploying:

1. [ ] All tests pass
2. [ ] Build succeeds locally
3. [ ] Environment variables documented
4. [ ] Database migrations ready
5. [ ] No hardcoded secrets in code
6. [ ] Error monitoring configured (optional)
7. [ ] README updated with deployment instructions
