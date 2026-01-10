import * as fs from "fs";
import * as path from "path";

const PROJECT_CONTEXT_MESSAGE = `
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
`;

interface ChatMessageInput {
  sessionID?: string;
  messageID?: string;
}

interface Part {
  id?: string;
  messageID?: string;
  sessionID?: string;
  type: string;
  text?: string;
}

interface ChatMessageOutput {
  parts?: Part[];
}

export const createProjectContextEnforcerHook = (
  ctx: { directory: string }
) => {
  return {
    "chat.message": async (input: ChatMessageInput, output: ChatMessageOutput) => {
      const projectContextPath = path.join(
        ctx.directory,
        "docs/agent/project-context.md"
      );

      if (!fs.existsSync(projectContextPath)) {
        const parts = output.parts;
        
        if (parts && parts.length > 0) {
          const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text);
          if (textPartIndex >= 0) {
            parts[textPartIndex].text = `${parts[textPartIndex].text}\n\n---\n${PROJECT_CONTEXT_MESSAGE}`;
          }
        }
      }
    },
  };
};
