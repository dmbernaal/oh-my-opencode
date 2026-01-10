import * as fs from "fs";
import * as path from "path";
import type { Hooks } from "@opencode-ai/plugin";
import { detectScenario, parseUserOverride, SCENARIOS, type SessionConfiguration } from "./signatures";
import { isDebugEnabled } from "../../features/aide-debug-state";
import { log } from "../../shared/logger";

const sessionConfigurations = new Map<string, SessionConfiguration>();
const detectedSessions = new Set<string>();

export function getSessionConfiguration(sessionID?: string): SessionConfiguration | null {
  if (!sessionID) return null;
  return sessionConfigurations.get(sessionID) ?? null;
}

export function setSessionConfiguration(sessionID: string, config: SessionConfiguration): void {
  sessionConfigurations.set(sessionID, config);
}

export function resetScenarioDetection(sessionID?: string): void {
  if (sessionID) {
    detectedSessions.delete(sessionID);
    sessionConfigurations.delete(sessionID);
  } else {
    detectedSessions.clear();
    sessionConfigurations.clear();
  }
}

export const createScenarioDetectorHook = (ctx: { directory: string }): Hooks => {
  return {
    "chat.message": async (input: any, output: any) => {
      const sessionID = (input as { sessionID?: string }).sessionID;
      
      if (!sessionID) {
        return;
      }
      
      if (detectedSessions.has(sessionID)) {
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
          applyScenario(ctx.directory, sessionID, scenario);
          detectedSessions.add(sessionID);
          return;
        }
      }

      const projectContext = analyzeProjectContext(ctx.directory);
      const detectedScenario = detectScenario(userMessage, projectContext);

      if (detectedScenario) {
        log('[Scenario Detector] Detected mode:', detectedScenario.mode);
        
        if (isDebugEnabled() && parts) {
          const debugMessage = `🔍 [Scenario Detector] Mode: ${detectedScenario.mode} | Confidence: ${detectedScenario.confidenceThreshold}% | Verification: ${detectedScenario.requiredVerification.join(", ")}`;
          const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text);
          if (textPartIndex >= 0 && parts[textPartIndex]) {
            parts[textPartIndex].text = `${debugMessage}\n\n${parts[textPartIndex].text ?? ""}`;
          }
        }
        
        applyScenario(ctx.directory, sessionID, detectedScenario);
        detectedSessions.add(sessionID);
      } else {
        log('[Scenario Detector] No match, using default: feature');
        const defaultScenario = SCENARIOS.find((s) => s.mode === "feature");
        if (defaultScenario) {
          if (isDebugEnabled() && parts) {
            const debugMessage = `🔍 [Scenario Detector] Mode: feature (default) | Confidence: ${defaultScenario.confidenceThreshold}% | Verification: ${defaultScenario.requiredVerification.join(", ")}`;
            const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text);
            if (textPartIndex >= 0 && parts[textPartIndex]) {
              parts[textPartIndex].text = `${debugMessage}\n\n${parts[textPartIndex].text ?? ""}`;
            }
          }
          
          applyScenario(ctx.directory, sessionID, defaultScenario);
          detectedSessions.add(sessionID);
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
  } catch {
    return { isEmpty: true, hasPackageJson: false };
  }
}

function applyScenario(directory: string, sessionID: string, scenario: any): void {
  const config: SessionConfiguration = {
    mode: scenario.mode,
    confidenceThreshold: scenario.confidenceThreshold,
    requiredVerification: scenario.requiredVerification,
    requiresPRD: scenario.requiresPRD,
    requiresArchitecture: scenario.requiresArchitecture,
  };

  setSessionConfiguration(sessionID, config);

  const constraintsPath = path.join(directory, "docs", "agent", "constraints.md");
  const constraintsDir = path.dirname(constraintsPath);

  try {
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
  } catch {
    // Silently fail if we can't write constraints file
  }
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
