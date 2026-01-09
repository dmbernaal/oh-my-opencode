import * as fs from "fs";
import * as path from "path";
import type { Hooks } from "@opencode-ai/plugin";
import { detectScenario, parseUserOverride, SCENARIOS, type SessionConfiguration } from "./signatures";

let sessionConfiguration: SessionConfiguration | null = null;
let hasDetectedScenario = false;

export function getSessionConfiguration(): SessionConfiguration | null {
  return sessionConfiguration;
}

export function setSessionConfiguration(config: SessionConfiguration): void {
  sessionConfiguration = config;
}

export function resetScenarioDetection(): void {
  hasDetectedScenario = false;
  sessionConfiguration = null;
}

export const createScenarioDetectorHook = (ctx: { directory: string }): Hooks => {
  return {
    "chat.message": async (input: any, output: any) => {
      console.log('[Scenario Detector] Hook triggered');
      
      if (hasDetectedScenario) {
        console.log('[Scenario Detector] Already detected, skipping');
        return;
      }

      const parts = (output as { parts?: Array<{ type: string; text?: string }> }).parts;
      if (!parts || parts.length === 0) {
        return;
      }

      const userMessage = parts
        .filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join(" ");

      if (!userMessage || userMessage.trim().length === 0) {
        return;
      }

      const userOverride = parseUserOverride(userMessage);
      
      if (userOverride) {
        const scenario = SCENARIOS.find((s) => s.mode === userOverride);
        if (scenario) {
          applyScenario(ctx.directory, scenario);
          hasDetectedScenario = true;
          return;
        }
      }

      const projectContext = analyzeProjectContext(ctx.directory);
      const detectedScenario = detectScenario(userMessage, projectContext);

      if (detectedScenario) {
        console.log('[Scenario Detector] Detected mode:', detectedScenario.mode);
        applyScenario(ctx.directory, detectedScenario);
        hasDetectedScenario = true;
      } else {
        console.log('[Scenario Detector] No match, using default: feature');
        const defaultScenario = SCENARIOS.find((s) => s.mode === "feature");
        if (defaultScenario) {
          applyScenario(ctx.directory, defaultScenario);
          hasDetectedScenario = true;
        }
      }
    },
  };
};

function analyzeProjectContext(directory: string): { isEmpty: boolean; hasPackageJson: boolean } {
  try {
    const files = fs.readdirSync(directory);
    const visibleFiles = files.filter((f) => !f.startsWith("."));
    
    const isEmpty = visibleFiles.length === 0;
    const hasPackageJson = files.includes("package.json");

    return { isEmpty, hasPackageJson };
  } catch (error) {
    return { isEmpty: true, hasPackageJson: false };
  }
}

function applyScenario(directory: string, scenario: any): void {
  console.log('[Scenario Detector] Applying scenario:', scenario.mode);
  
  const config: SessionConfiguration = {
    mode: scenario.mode,
    confidenceThreshold: scenario.confidenceThreshold,
    requiredVerification: scenario.requiredVerification,
    requiresPRD: scenario.requiresPRD,
    requiresArchitecture: scenario.requiresArchitecture,
  };

  setSessionConfiguration(config);
  console.log('[Scenario Detector] Session config set:', config);

  const constraintsPath = path.join(directory, "docs", "agent", "constraints.md");
  const constraintsDir = path.dirname(constraintsPath);

  if (!fs.existsSync(constraintsDir)) {
    fs.mkdirSync(constraintsDir, { recursive: true });
  }

  const now = new Date().toISOString();
  const constraintsContent = `# Session Constraints

**Created:** ${now}
**Mode:** ${scenario.mode}
**Detected From:** Automatic scenario detection

---

## Mode Definitions

**Surgery:** Minimal changes only. No refactoring. No new patterns. Smallest diff possible.

**Feature:** Follow existing patterns. May add new files in established locations. Add tests for new code.

**Builder:** May scaffold new structure. May establish patterns. Full creative latitude within skill guidelines.

**Refactor:** May reorganize code. MUST propose plan first. MUST preserve all existing functionality.

---

## Current Mode: ${scenario.mode.toUpperCase()}

### Configuration

- Confidence Threshold: ${scenario.confidenceThreshold}%
- Required Verification: ${scenario.requiredVerification.join(", ")}
- Requires PRD: ${scenario.requiresPRD ? "Yes" : "No"}
- Requires Architecture: ${scenario.requiresArchitecture ? "Yes" : "No"}

### Allowed

${getAllowedActions(scenario.mode)}

### Prohibited

${getProhibitedActions(scenario.mode)}
`;

  fs.writeFileSync(constraintsPath, constraintsContent, "utf-8");
}

function getAllowedActions(mode: string): string {
  switch (mode) {
    case "surgery":
      return `- Fix the specific bug or issue
- Make minimal code changes
- Run existing tests to ensure no regressions
- Update documentation if the fix changes behavior`;
    case "feature":
      return `- Add new files following existing patterns
- Modify existing files to integrate the feature
- Write tests for new functionality
- Update documentation for the new feature`;
    case "builder":
      return `- Create new project structure
- Establish coding patterns and conventions
- Set up build, test, and lint infrastructure
- Create comprehensive documentation`;
    case "refactor":
      return `- Reorganize code structure
- Improve code quality and maintainability
- Update tests to match new structure
- Ensure all existing functionality is preserved`;
    default:
      return "- (No specific actions defined)";
  }
}

function getProhibitedActions(mode: string): string {
  switch (mode) {
    case "surgery":
      return `- Refactoring unrelated code
- Adding new features
- Changing architecture
- Making "while we're here" improvements`;
    case "feature":
      return `- Refactoring existing unrelated code
- Changing established patterns without discussion
- Skipping tests for new code
- Making breaking changes to existing APIs`;
    case "builder":
      return `- Using outdated or deprecated patterns
- Skipping essential infrastructure (tests, lint, build)
- Creating inconsistent code styles`;
    case "refactor":
      return `- Changing functionality or behavior
- Adding new features during refactoring
- Skipping tests or reducing test coverage
- Making changes without a clear plan`;
    default:
      return "- (No specific prohibitions defined)";
  }
}
