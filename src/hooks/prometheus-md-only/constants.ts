export const HOOK_NAME = "prometheus-md-only"

export const PROMETHEUS_AGENTS = ["Prometheus (Planner)"]

export const ALLOWED_EXTENSIONS = [".md"]

export const ALLOWED_PATH_PREFIX = ".sisyphus/"

export const BLOCKED_TOOLS = ["Write", "Edit", "write", "edit"]

export const BASH_WRITE_PATTERNS = [
  /\bcat\s+>\s*/i,
  /\bcat\s+>>\s*/i,
  /\becho\s+.*>\s*/i,
  /\becho\s+.*>>\s*/i,
  /\btee\s+/i,
  /\bprintf\s+.*>\s*/i,
  /<<\s*['"]?EOF/i,
  /<<\s*['"]?END/i,
  /\bmkdir\s+(?!.*\.sisyphus)/i,
  /\btouch\s+(?!.*\.sisyphus)/i,
  /\bcp\s+/i,
  /\bmv\s+/i,
]

export const PLANNING_CONSULT_WARNING = `

---

[SYSTEM DIRECTIVE - READ-ONLY PLANNING CONSULTATION]

You are being invoked by Prometheus (Planner), a READ-ONLY planning agent.

**CRITICAL CONSTRAINTS:**
- DO NOT modify any files (no Write, Edit, or any file mutations)
- DO NOT execute commands that change system state
- DO NOT create, delete, or rename files
- ONLY provide analysis, recommendations, and information

**YOUR ROLE**: Provide consultation, research, and analysis to assist with planning.
Return your findings and recommendations. The actual implementation will be handled separately after planning is complete.

---

`
