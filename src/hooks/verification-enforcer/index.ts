import type { Hooks } from "@opencode-ai/plugin";
import { getSessionConfiguration } from "../scenario-detector";
import { detectVerificationEvidence } from "./patterns";
import { updateVerificationStatus } from "../../utils/active-plan";
import { log } from "../../shared/logger";

export const createVerificationEnforcerHook = (ctx: { directory: string }): Hooks => {
  let recentToolOutputs: string[] = [];
  const MAX_CONTEXT_ITEMS = 50;

  return {
    "tool.execute.after": async (input: any, output: any) => {
      const toolOutput = JSON.stringify(output);
      recentToolOutputs.push(toolOutput);

      if (recentToolOutputs.length > MAX_CONTEXT_ITEMS) {
        recentToolOutputs = recentToolOutputs.slice(-MAX_CONTEXT_ITEMS);
      }

      if (input.tool === "todowrite") {
        const args = input.args as { todos?: Array<{ status: string; id: string }> } | undefined;
        const todos = args?.todos || [];

        const hasCompletedTasks = todos.some((todo) => todo.status === "completed");

        if (!hasCompletedTasks) {
          return;
        }

        const sessionConfig = getSessionConfiguration(input.sessionID);
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
          log('[Verification Enforcer] Missing checks:', missingChecks);
          
          if (sessionConfig.mode === "surgery") {
            // Surgery mode: warning only, append to output
            const warningMessage = `\n\n⚠️ **Verification Recommended**\n\nYou're marking work as complete, but I haven't seen evidence for:\n${missingChecks.map((c) => `- ${c}`).join("\n")}\n\nFor surgery mode, this is a warning, not a blocker. But it's good practice to verify.`;
            
            // Append to result instead of pushing to parts
            if (output && typeof output === 'object') {
              output.verificationWarning = warningMessage;
            }
          } else {
            // Other modes: blocking message
            const blockingMessage = `\n\n🛑 **VERIFICATION REQUIRED**\n\nYou are attempting to mark work as complete, but verification evidence is missing.\n\nBefore completing this task, you must run and show output for:\n${missingChecks.map((c) => `- [ ] ${c}`).join("\n")}\n\nRun these commands and include the output, then you may mark the task complete.`;
            
            // Append to result instead of pushing to parts
            if (output && typeof output === 'object') {
              output.verificationRequired = blockingMessage;
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
