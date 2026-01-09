import * as fs from "fs";
import * as path from "path";

export const createProjectContextEnforcerHook = (
  ctx: { directory: string }
) => {
  return {
    "chat.message": async (input: any, output: any) => {
      const projectContextPath = path.join(
        ctx.directory,
        "docs/agent/project-context.md"
      );

      if (!fs.existsSync(projectContextPath)) {
        const parts = (output as { parts?: Array<{ type: string; text?: string }> })
          .parts;
        
        if (parts) {
          parts.push({
            type: "text",
            text: `
⚠️ PROJECT CONTEXT REQUIRED

Before proceeding with ANY task, you MUST:

1. Check for project context: cat docs/agent/project-context.md
2. If not found, generate it:
   - Create docs/agent/ directory
   - Analyze: package.json, config files, directory structure
   - Generate docs/agent/project-context.md with: stack, commands, conventions, quality gates
   - Generate docs/agent/constraints.md with: MODE (surgery/feature/builder/refactor)
   - Show summary to user and wait for confirmation

This is MANDATORY. Do not proceed with implementation until project context exists.
`,
          });
        }
      }
    },
  };
};
