import type { Hooks } from "@opencode-ai/plugin";
import { getSessionConfiguration } from "../scenario-detector";
import { detectVerificationEvidence } from "./patterns";
import { updateVerificationStatus } from "../../utils/active-plan";

export const createVerificationEnforcerHook = (ctx: { directory: string }): Hooks => {
  let recentToolOutputs: string[] = [];
  const MAX_CONTEXT_ITEMS = 50;

  return {
    "tool.execute.after": async (input: any, output: any) => {
      console.log('[Verification Enforcer] Hook triggered for tool:', input.tool);
      const toolOutput = JSON.stringify(output);
      recentToolOutputs.push(toolOutput);

      if (recentToolOutputs.length > MAX_CONTEXT_ITEMS) {
        recentToolOutputs = recentToolOutputs.slice(-MAX_CONTEXT_ITEMS);
      }

      if (input.tool === "todowrite") {
        const args = input.args as { todos?: Array<{ status: string; id: string }> };
        const todos = args.todos || [];

        const hasCompletedTasks = todos.some((todo) => todo.status === "completed");

        if (!hasCompletedTasks) {
          return;
        }

        const sessionConfig = getSessionConfiguration();
        if (!sessionConfig) {
          return;
        }

        const recentContext = recentToolOutputs.join("\n");
        const evidence = detectVerificationEvidence(recentContext);

        const requiredChecks = sessionConfig.requiredVerification;
        const missingChecks: string[] = [];

        for (const check of requiredChecks) {
          if (check === "typecheck" && !evidence.typeCheck) {
            missingChecks.push("Type check (lsp_diagnostics or typecheck command)");
          }
          if (check === "tests" && !evidence.tests) {
            missingChecks.push("Tests (test command from project-context.md)");
          }
          if (check === "build" && !evidence.build) {
            missingChecks.push("Build (build command from project-context.md)");
          }
          if (check === "lint" && !evidence.lint) {
            missingChecks.push("Lint (lint command from project-context.md)");
          }
        }

        if (missingChecks.length > 0) {
          if (sessionConfig.mode === "surgery") {
            const warningMessage = `\n\n⚠️ **Verification Recommended**\n\nYou're marking work as complete, but I haven't seen evidence for:\n${missingChecks.map((c) => `- ${c}`).join("\n")}\n\nFor surgery mode, this is a warning, not a blocker. But it's good practice to verify.`;
            
            const parts = (output as { parts?: Array<{ type: string; text?: string }> }).parts;
            if (parts) {
              parts.push({
                type: "text",
                text: warningMessage,
              });
            }
          } else {
            const blockingMessage = `\n\n🛑 **VERIFICATION REQUIRED**\n\nYou are attempting to mark work as complete, but verification evidence is missing.\n\nBefore completing this task, you must run and show output for:\n${missingChecks.map((c) => `- [ ] ${c}`).join("\n")}\n\nRun these commands and include the output, then you may mark the task complete.`;
            
            const parts = (output as { parts?: Array<{ type: string; text?: string }> }).parts;
            if (parts) {
              parts.push({
                type: "text",
                text: blockingMessage,
              });
            }
          }
        } else {
          if (evidence.typeCheck) {
            updateVerificationStatus(ctx.directory, "typeCheck", "pass");
          }
          if (evidence.tests) {
            updateVerificationStatus(ctx.directory, "tests", "pass");
          }
          if (evidence.build) {
            updateVerificationStatus(ctx.directory, "build", "pass");
          }
          if (evidence.lint) {
            updateVerificationStatus(ctx.directory, "lint", "pass");
          }
        }
      }
    },
  };
};
