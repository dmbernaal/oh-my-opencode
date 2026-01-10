export const CONTRACT_TEMPLATES = {
  api: `# API Contracts

Define API endpoints and request/response shapes here.

## Endpoints

(No endpoints defined yet)
`,

  types: `# Shared Types

Define shared type definitions here.

## Types

(No types defined yet)
`,

  events: `# Event Contracts

Define WebSocket events, pub/sub topics, and other event schemas here.

## Events

(No events defined yet)
`,
} as const

export const LOG_TEMPLATES = {
  decisions: `# Architecture Decisions

Append-only log of architectural decisions with rationale.

---

`,

  status: `# Task Status Log

Append-only log of task completions.

---

`,
} as const

export const LEARNING_TEMPLATES = {
  frontend: `# Frontend Learnings

React patterns, CSS approaches, component design notes.

---

`,

  backend: `# Backend Learnings

Database queries, service patterns, auth details.

---

`,

  infrastructure: `# Infrastructure Learnings

Deployment, CI/CD, environment config notes.

---

`,

  shared: `# Shared Learnings

Cross-cutting concerns that apply to all roles.

---

`,
} as const
