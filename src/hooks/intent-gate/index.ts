import * as fs from "fs";
import * as path from "path";
import type { Hooks } from "@opencode-ai/plugin";
import { analyzeIntent, type ProjectContext } from "./analyzer";
import { getSessionConfiguration } from "../scenario-detector";
import { isDebugEnabled } from "../../features/aide-debug-state";
import { log } from "../../shared/logger";

const clarificationRounds = new Map<string, number>();
const MAX_CLARIFICATION_ROUNDS = 3;

export const createIntentGateHook = (ctx: { directory: string; client: any }): Hooks => {
  return {
    "chat.message": async (input: any, output: any) => {
      const sessionID = (input as { sessionID?: string }).sessionID;
      
      if (!sessionID) {
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

      // Skip if user is confirming/continuing
      if (userMessage.toLowerCase().includes("execute the plan") || 
          userMessage.toLowerCase().includes("let's implement") ||
          userMessage.toLowerCase().includes("continue") ||
          userMessage.toLowerCase().includes("proceed") ||
          userMessage.toLowerCase().includes("go ahead") ||
          userMessage.toLowerCase().includes("yes") ||
          userMessage.toLowerCase().includes("ok") ||
          userMessage.toLowerCase().includes("sounds good")) {
        return;
      }

      const projectContext = loadProjectContext(ctx.directory);
      const sessionConfig = getSessionConfiguration(sessionID);

      if (!sessionConfig) {
        log('[Intent Gate] No session config, skipping');
        return;
      }

      const analysis = await analyzeIntent(userMessage, projectContext, ctx.client, sessionID);

      const currentRound = clarificationRounds.get(sessionID) ?? 0;

      // Prepend debug message if enabled
      if (isDebugEnabled() && parts) {
        const debugMessage = `🔍 [Intent Gate] Confidence: ${analysis.confidence}% | Threshold: ${sessionConfig.confidenceThreshold}% | Decision: ${analysis.confidence >= sessionConfig.confidenceThreshold ? "PASS" : "CLARIFY"} | Round: ${currentRound + 1}/${MAX_CLARIFICATION_ROUNDS}`;
        const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text);
        if (textPartIndex >= 0 && parts[textPartIndex]) {
          parts[textPartIndex].text = `${debugMessage}\n\n${parts[textPartIndex].text ?? ""}`;
        }
      }

      // If confidence is sufficient, proceed
      if (analysis.confidence >= sessionConfig.confidenceThreshold) {
        clarificationRounds.set(sessionID, 0);
        return;
      }

      // If max rounds reached, proceed with assumptions
      if (currentRound >= MAX_CLARIFICATION_ROUNDS) {
        const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text);
        if (textPartIndex >= 0) {
          const assumptionsList = analysis.ambiguities.length > 0 
            ? analysis.ambiguities.map((a) => `- ${a}`).join("\n")
            : "- Proceeding with best interpretation of the request";
          parts[textPartIndex].text = `${parts[textPartIndex].text}\n\n---\n\n⚠️ **Proceeding with Assumptions**\n\nAfter ${MAX_CLARIFICATION_ROUNDS} clarification attempts, I'll proceed with my best understanding:\n\n${assumptionsList}\n\nLet me know if I should adjust.`;
        }
        clarificationRounds.set(sessionID, 0);
        return;
      }

      // Increment round and add clarification
      clarificationRounds.set(sessionID, currentRound + 1);

      const clarificationMessage = buildClarificationMessage(analysis);
      
      const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text);
      if (textPartIndex >= 0) {
        parts[textPartIndex].text = `${parts[textPartIndex].text}${clarificationMessage}`;
      }
    },
  };
};

function loadProjectContext(directory: string): ProjectContext {
  const contextPath = path.join(directory, "docs", "agent", "project-context.md");
  
  if (!fs.existsSync(contextPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(contextPath, "utf-8");
    
    const stackMatch = content.match(/Framework\s*\|\s*([^\|]+)/);
    const frameworkMatch = content.match(/Language\s*\|\s*([^\|]+)/);
    
    const hasTests = content.includes("Test:") || content.includes("test:");
    const hasLint = content.includes("Lint:") || content.includes("lint:");
    
    return {
      stack: stackMatch ? stackMatch[1].trim() : undefined,
      framework: frameworkMatch ? frameworkMatch[1].trim() : undefined,
      hasTests,
      hasLint,
      conventions: [],
    };
  } catch {
    return {};
  }
}

function buildClarificationMessage(analysis: any): string {
  let message = "\n\n---\n\n🤔 **Before I proceed, I want to make sure I understand your request.**\n\n";

  if (analysis.knownFactors.length > 0) {
    message += "**What I understand:**\n";
    analysis.knownFactors.forEach((factor: string) => {
      message += `✓ ${factor}\n`;
    });
    message += "\n";
  }

  if (analysis.missingInfo.length > 0) {
    message += "**What would help:**\n";
    analysis.missingInfo.forEach((info: string) => {
      message += `• ${info}\n`;
    });
    message += "\n";
  }

  if (analysis.suggestedQuestions.length > 0) {
    message += "**Quick questions:**\n";
    analysis.suggestedQuestions.slice(0, 3).forEach((question: string, idx: number) => {
      message += `${idx + 1}. ${question}\n`;
    });
    message += "\n";
  }

  message += "_Reply with details, or say 'proceed' to continue with my best guess._\n\n---";

  return message;
}

export function resetClarificationRound(sessionID?: string): void {
  if (sessionID) {
    clarificationRounds.delete(sessionID);
  } else {
    clarificationRounds.clear();
  }
}
