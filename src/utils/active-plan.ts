import * as fs from "fs";
import * as path from "path";
import yaml from "yaml";

export interface ActivePlanMetadata {
  name: string;
  status: "planning" | "in-progress" | "blocked" | "complete";
  mode: "surgery" | "feature" | "builder" | "refactor";
  created: string;
  updated: string;
  verification: {
    typeCheck: "pass" | "fail" | "pending";
    lint: "pass" | "fail" | "pending";
    tests: "pass" | "fail" | "pending";
    build: "pass" | "fail" | "pending";
  };
}

export interface Task {
  description: string;
  files: string[];
  acceptance: string;
  done: boolean;
}

export interface Phase {
  name: string;
  tasks: Task[];
}

export interface ProgressLogEntry {
  timestamp: string;
  entry: string;
}

export interface ActivePlanContent {
  objective: string;
  whatWeKnow: string[];
  assumptions: string[];
  openQuestions: string[];
  phases: Phase[];
  progressLog: ProgressLogEntry[];
}

export interface ActivePlan {
  metadata: ActivePlanMetadata;
  content: ActivePlanContent;
}

const PLAN_TEMPLATE = `---
name: {{name}}
status: {{status}}
mode: {{mode}}
created: {{created}}
updated: {{updated}}
verification:
  typeCheck: {{typeCheck}}
  lint: {{lint}}
  tests: {{tests}}
  build: {{build}}
---

# Active Plan: {{name}}

## Objective

{{objective}}

## Understanding

### What We Know
{{whatWeKnow}}

### What We Assumed
{{assumptions}}

### Open Questions
{{openQuestions}}

---

## The Plan

{{phases}}

---

## Progress Log

{{progressLog}}
`;

export function getActivePlanPath(directory: string): string {
  return path.join(directory, "docs", "session", "active-plan.md");
}

export function activePlanExists(directory: string): boolean {
  const planPath = getActivePlanPath(directory);
  return fs.existsSync(planPath);
}

export function readActivePlan(directory: string): ActivePlan | null {
  const planPath = getActivePlanPath(directory);
  
  if (!fs.existsSync(planPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(planPath, "utf-8");
    const parts = content.split("---\n");
    
    if (parts.length < 3) {
      return null;
    }

    const frontmatter = yaml.parse(parts[1]);
    const body = parts.slice(2).join("---\n");

    const metadata: ActivePlanMetadata = {
      name: frontmatter.name || "Untitled Plan",
      status: frontmatter.status || "planning",
      mode: frontmatter.mode || "feature",
      created: frontmatter.created || new Date().toISOString(),
      updated: frontmatter.updated || new Date().toISOString(),
      verification: frontmatter.verification || {
        typeCheck: "pending",
        lint: "pending",
        tests: "pending",
        build: "pending",
      },
    };

    const parsedContent = parseActivePlanBody(body);

    return {
      metadata,
      content: parsedContent,
    };
  } catch (error) {
    console.error("Failed to read active plan:", error);
    return null;
  }
}

function parseActivePlanBody(body: string): ActivePlanContent {
  const objectiveMatch = body.match(/## Objective\s+([\s\S]*?)(?=\n## |$)/);
  const whatWeKnowMatch = body.match(/### What We Know\s+([\s\S]*?)(?=\n### |$)/);
  const assumptionsMatch = body.match(/### What We Assumed\s+([\s\S]*?)(?=\n### |$)/);
  const openQuestionsMatch = body.match(/### Open Questions\s+([\s\S]*?)(?=\n---|$)/);
  const phasesMatch = body.match(/## The Plan\s+([\s\S]*?)(?=\n## Progress Log|$)/);
  const progressLogMatch = body.match(/## Progress Log\s+([\s\S]*?)$/);

  const objective = objectiveMatch ? objectiveMatch[1].trim() : "";
  
  const whatWeKnow = whatWeKnowMatch
    ? whatWeKnowMatch[1]
        .split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.replace(/^-\s*/, "").trim())
    : [];

  const assumptions = assumptionsMatch
    ? assumptionsMatch[1]
        .split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.replace(/^-\s*/, "").trim())
    : [];

  const openQuestions = openQuestionsMatch
    ? openQuestionsMatch[1]
        .split("\n")
        .filter((line) => line.trim().startsWith("- [ ]"))
        .map((line) => line.replace(/^-\s*\[\s*\]\s*/, "").trim())
    : [];

  const phases = phasesMatch ? parsePhases(phasesMatch[1]) : [];

  const progressLog = progressLogMatch ? parseProgressLog(progressLogMatch[1]) : [];

  return {
    objective,
    whatWeKnow,
    assumptions,
    openQuestions,
    phases,
    progressLog,
  };
}

function parsePhases(phasesText: string): Phase[] {
  const phases: Phase[] = [];
  const phaseMatches = phasesText.matchAll(/### Phase \d+: (.+?)\n([\s\S]*?)(?=\n### Phase \d+:|$)/g);

  for (const match of phaseMatches) {
    const phaseName = match[1].trim();
    const tasksText = match[2];
    const tasks = parseTasksFromPhase(tasksText);

    phases.push({
      name: phaseName,
      tasks,
    });
  }

  return phases;
}

function parseTasksFromPhase(tasksText: string): Task[] {
  const tasks: Task[] = [];
  const taskMatches = tasksText.matchAll(/- \[([ x])\] Task \d+\.\d+: (.+?)\n([\s\S]*?)(?=\n- \[|$)/g);

  for (const match of taskMatches) {
    const done = match[1] === "x";
    const description = match[2].trim();
    const details = match[3];

    const filesMatch = details.match(/- Files: (.+)/);
    const acceptanceMatch = details.match(/- Acceptance: (.+)/);

    const files = filesMatch ? filesMatch[1].split(",").map((f) => f.trim()) : [];
    const acceptance = acceptanceMatch ? acceptanceMatch[1].trim() : "";

    tasks.push({
      description,
      files,
      acceptance,
      done,
    });
  }

  return tasks;
}

function parseProgressLog(logText: string): ProgressLogEntry[] {
  const entries: ProgressLogEntry[] = [];
  const entryMatches = logText.matchAll(/### (.+?)\n([\s\S]*?)(?=\n### |$)/g);

  for (const match of entryMatches) {
    const timestamp = match[1].trim();
    const entry = match[2].trim();

    entries.push({
      timestamp,
      entry,
    });
  }

  return entries;
}

export function writeActivePlan(directory: string, plan: ActivePlan): void {
  const planPath = getActivePlanPath(directory);
  const planDir = path.dirname(planPath);

  if (!fs.existsSync(planDir)) {
    fs.mkdirSync(planDir, { recursive: true });
  }

  plan.metadata.updated = new Date().toISOString();

  const frontmatter = yaml.stringify(plan.metadata);
  
  const whatWeKnowList = plan.content.whatWeKnow.map((item) => `- ${item}`).join("\n");
  const assumptionsList = plan.content.assumptions.map((item) => `- ${item}`).join("\n");
  const openQuestionsList = plan.content.openQuestions.map((item) => `- [ ] ${item}`).join("\n");
  
  const phasesText = plan.content.phases
    .map((phase, phaseIdx) => {
      const tasksText = phase.tasks
        .map((task, taskIdx) => {
          const checkbox = task.done ? "[x]" : "[ ]";
          const filesList = task.files.join(", ");
          return `- ${checkbox} Task ${phaseIdx + 1}.${taskIdx + 1}: ${task.description}\n  - Files: ${filesList}\n  - Acceptance: ${task.acceptance}`;
        })
        .join("\n");

      return `### Phase ${phaseIdx + 1}: ${phase.name}\n${tasksText}`;
    })
    .join("\n\n");

  const progressLogText = plan.content.progressLog
    .map((entry) => `### ${entry.timestamp}\n${entry.entry}`)
    .join("\n\n");

  const body = `# Active Plan: ${plan.metadata.name}

## Objective

${plan.content.objective}

## Understanding

### What We Know
${whatWeKnowList || "(None yet)"}

### What We Assumed
${assumptionsList || "(None yet)"}

### Open Questions
${openQuestionsList || "(None yet)"}

---

## The Plan

${phasesText || "(No phases defined yet)"}

---

## Progress Log

${progressLogText || "(No progress yet)"}
`;

  const fullContent = `---\n${frontmatter}---\n\n${body}`;

  fs.writeFileSync(planPath, fullContent, "utf-8");
}

export function updateTaskStatus(
  directory: string,
  phaseIndex: number,
  taskIndex: number,
  done: boolean
): void {
  const plan = readActivePlan(directory);
  if (!plan) return;

  if (
    phaseIndex >= 0 &&
    phaseIndex < plan.content.phases.length &&
    taskIndex >= 0 &&
    taskIndex < plan.content.phases[phaseIndex].tasks.length
  ) {
    plan.content.phases[phaseIndex].tasks[taskIndex].done = done;
    writeActivePlan(directory, plan);
  }
}

export function addProgressLogEntry(directory: string, entry: string): void {
  const plan = readActivePlan(directory);
  if (!plan) return;

  const timestamp = new Date().toISOString();
  plan.content.progressLog.push({
    timestamp,
    entry,
  });

  writeActivePlan(directory, plan);
}

export function updateVerificationStatus(
  directory: string,
  check: keyof ActivePlanMetadata["verification"],
  status: "pass" | "fail" | "pending",
  notes?: string
): void {
  const plan = readActivePlan(directory);
  if (!plan) return;

  plan.metadata.verification[check] = status;

  if (notes) {
    addProgressLogEntry(directory, `Verification: ${check} = ${status}. ${notes}`);
  }

  writeActivePlan(directory, plan);
}

export function updatePlanStatus(
  directory: string,
  status: ActivePlanMetadata["status"]
): void {
  const plan = readActivePlan(directory);
  if (!plan) return;

  plan.metadata.status = status;
  writeActivePlan(directory, plan);
}

export function createActivePlan(
  directory: string,
  name: string,
  mode: ActivePlanMetadata["mode"],
  objective: string,
  phases: Phase[]
): ActivePlan {
  const now = new Date().toISOString();

  const plan: ActivePlan = {
    metadata: {
      name,
      status: "planning",
      mode,
      created: now,
      updated: now,
      verification: {
        typeCheck: "pending",
        lint: "pending",
        tests: "pending",
        build: "pending",
      },
    },
    content: {
      objective,
      whatWeKnow: [],
      assumptions: [],
      openQuestions: [],
      phases,
      progressLog: [],
    },
  };

  writeActivePlan(directory, plan);
  return plan;
}
