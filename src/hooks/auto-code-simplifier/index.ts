import type { Hooks } from "@opencode-ai/plugin";
import { getMainSessionID } from "../../features/claude-code-session-state";
import { createSisyphusTask } from "../../tools";
import { BackgroundManager } from "../../features/background-agent";

interface AutoCodeSimplifierOptions {
  backgroundManager: BackgroundManager;
  client: any;
}

export const createAutoCodeSimplifierHook = (
  ctx: { directory: string },
  options: AutoCodeSimplifierOptions
): Hooks => {
  const dirtyFiles = new Set<string>();
  let isSimplifying = false;

  const sisyphusTask = createSisyphusTask({
    manager: options.backgroundManager,
    client: options.client,
  });

  return {
    "tool.execute.after": async (input: any, output: any) => {
      // Only track edits from the main session to avoid loops
      const mainSessionID = getMainSessionID();
      if (input.sessionID !== mainSessionID) return;

      // Track files modified by edit tools
      if (
        ["write", "edit", "ast_grep_replace", "lsp_rename", "lsp_code_action_resolve"].includes(
          input.tool
        )
      ) {
        const args = input.args as { filePath?: string; path?: string } | undefined;
        const filePath = args?.filePath || args?.path;
        
        if (filePath && typeof filePath === "string") {
          dirtyFiles.add(filePath);
        }
      }
    },

    event: async (input: any) => {
      const { event } = input;
      
      // Trigger on session idle if we have dirty files and aren't already simplifying
      if (
        event.type === "session.idle" &&
        dirtyFiles.size > 0 &&
        !isSimplifying
      ) {
        const mainSessionID = getMainSessionID();
        // Only trigger for main session idle
        if (input.sessionID !== mainSessionID) return;

        isSimplifying = true;
        const filesToSimplify = Array.from(dirtyFiles);
        dirtyFiles.clear();

        try {
          // Launch code simplifier as a background task
          await sisyphusTask.execute({
            agent: "code-simplifier",
            prompt: `Simplify and clean up the following recently modified files:\n${filesToSimplify.join("\n")}\n\nEnsure you run lsp_diagnostics after changes to verify no regressions.`,
            background: true,
          }, { tool: "sisyphus_task" } as any);
          
          // Notify user via toast
          await options.client.tui.showToast({
            body: {
              title: "Auto-Simplifier Started",
              message: `Cleaning up ${filesToSimplify.length} modified files...`,
              variant: "info",
            },
          });
        } catch (error) {
          console.error("Failed to launch auto-code-simplifier:", error);
          // Re-add files to dirty set on failure to try again later
          filesToSimplify.forEach(f => dirtyFiles.add(f));
        } finally {
          isSimplifying = false;
        }
      }
    },
  };
};
