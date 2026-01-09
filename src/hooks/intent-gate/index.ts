import * as fs from "fs";
import * as path from "path";
import type { Hooks } from "@opencode-ai/plugin";
import { analyzeIntent, type ProjectContext } from "./analyzer";
import { getSessionConfiguration } from "../scenario-detector";

let clarificationRound = 0;
const MAX_CLARIFICATION_ROUNDS = 3;

export const createIntentGateHook = (ctx: { directory: string; client: any }): Hooks => {
  return {
    "chat.message": async (input: any, output: any) => {
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

      if (userMessage.toLowerCase().includes("execute the plan") || 
          userMessage.toLowerCase().includes("let's implement") ||
          userMessage.toLowerCase().includes("continue")) {
        return;
      }

      const projectContext = loadProjectContext(ctx.directory);
      const sessionConfig = getSessionConfiguration();

      if (!sessionConfig) {
        return;
      }

      const analysis = await analyzeIntent(userMessage, projectContext, ctx.client);

      if (analysis.confidence >= sessionConfig.confidenceThreshold) {
        clarificationRound = 0;
        return;
      }

      if (clarificationRound >= MAX_CLARIFICATION_ROUNDS) {
        parts.push({
          type: "text",
          text: `\n\n---\n\n⚠️ **Proceeding with Assumptions**\n\nAfter ${MAX_CLARIFICATION_ROUNDS} rounds of clarification, I'll proceed with my best understanding. I've noted the following assumptions in the plan:\n\n${analysis.ambiguities.map((a) => `- ${a}`).join("\n")}\n\nIf any of these assumptions are wrong, please let me know and I'll adjust.`,
        });
        clarificationRound = 0;
        return;
      }

      clarificationRound++;

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

export function resetClarificationRound(): void {
  clarificationRound = 0;
}
