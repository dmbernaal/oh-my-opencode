import * as fs from "fs";
import * as path from "path";
import type { Hooks } from "@opencode-ai/plugin";
import { analyzeIntent, type ProjectContext } from "./analyzer";
import { getSessionConfiguration } from "../scenario-detector";

const clarificationRounds = new Map<string, number>();
const MAX_CLARIFICATION_ROUNDS = 3;

export const createIntentGateHook = (ctx: { directory: string; client: any }): Hooks => {
  return {
    "chat.message": async (input: any, output: any) => {
      const sessionID = (input as { sessionID?: string }).sessionID;
      
      console.log('[Intent Gate] Hook triggered', { sessionID });
      
      if (!sessionID) {
        console.log('[Intent Gate] No sessionID, skipping');
        return;
      }
      
      const parts = (output as { parts?: Array<{ type: string; text?: string }> }).parts;
      if (!parts || parts.length === 0) {
        console.log('[Intent Gate] No parts in output, skipping');
        return;
      }

      const userMessage = parts
        .filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join(" ");

      if (!userMessage || userMessage.trim().length === 0) {
        console.log('[Intent Gate] Empty user message, skipping');
        return;
      }

      console.log('[Intent Gate] User message:', userMessage.substring(0, 100));

      if (userMessage.toLowerCase().includes("execute the plan") || 
          userMessage.toLowerCase().includes("let's implement") ||
          userMessage.toLowerCase().includes("continue")) {
        console.log('[Intent Gate] Skip keyword detected, bypassing');
        return;
      }

      const projectContext = loadProjectContext(ctx.directory);
      const sessionConfig = getSessionConfiguration(sessionID);

      if (!sessionConfig) {
        console.log('[Intent Gate] No session config found, skipping (Scenario Detector may not have run yet)');
        return;
      }

      console.log('[Intent Gate] Session config:', sessionConfig);

      const analysis = await analyzeIntent(userMessage, projectContext, ctx.client);

      const currentRound = clarificationRounds.get(sessionID) ?? 0;

      if (analysis.confidence >= sessionConfig.confidenceThreshold) {
        console.log('[Intent Gate] Confidence sufficient, clearing clarification rounds');
        clarificationRounds.set(sessionID, 0);
        return;
      }

      if (currentRound >= MAX_CLARIFICATION_ROUNDS) {
        parts.push({
          type: "text",
          text: `\n\n---\n\n⚠️ **Proceeding with Assumptions**\n\nAfter ${MAX_CLARIFICATION_ROUNDS} rounds of clarification, I'll proceed with my best understanding. I've noted the following assumptions in the plan:\n\n${analysis.ambiguities.map((a) => `- ${a}`).join("\n")}\n\nIf any of these assumptions are wrong, please let me know and I'll adjust.`,
        });
        clarificationRounds.set(sessionID, 0);
        return;
      }

      clarificationRounds.set(sessionID, currentRound + 1);

      const clarificationMessage = buildClarificationMessage(analysis);
      
      parts.push({
        type: "text",
        text: clarificationMessage,
      });
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
  } catch (error) {
    return {};
  }
}

function buildClarificationMessage(analysis: any): string {
  let message = "\n\n---\n\n🤔 **Before I proceed, I want to make sure I understand what you're looking for.**\n\n";

  if (analysis.knownFactors.length > 0) {
    message += "**What I understand so far:**\n";
    analysis.knownFactors.forEach((factor: string) => {
      message += `- ${factor}\n`;
    });
    message += "\n";
  }

  if (analysis.ambiguities.length > 0) {
    message += "**What's ambiguous:**\n";
    analysis.ambiguities.forEach((ambiguity: string) => {
      message += `- ${ambiguity}\n`;
    });
    message += "\n";
  }

  if (analysis.missingInfo.length > 0) {
    message += "**What I need to know:**\n";
    analysis.missingInfo.forEach((info: string) => {
      message += `- ${info}\n`;
    });
    message += "\n";
  }

  if (analysis.suggestedQuestions.length > 0) {
    message += "**Specifically:**\n";
    analysis.suggestedQuestions.forEach((question: string, idx: number) => {
      message += `${idx + 1}. ${question}\n`;
    });
    message += "\n";
  }

  message += "Once I understand these details, I can create a solid plan.\n\n---";

  return message;
}

export function resetClarificationRound(sessionID?: string): void {
  if (sessionID) {
    clarificationRounds.delete(sessionID);
  } else {
    clarificationRounds.clear();
  }
}
