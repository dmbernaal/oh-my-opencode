import {
  detectSlashCommand,
  extractPromptText,
} from "./detector"
import { executeSlashCommand, type ExecutorOptions } from "./executor"
import { log } from "../../shared"
import {
  AUTO_SLASH_COMMAND_TAG_OPEN,
  AUTO_SLASH_COMMAND_TAG_CLOSE,
} from "./constants"
import type {
  AutoSlashCommandHookInput,
  AutoSlashCommandHookOutput,
} from "./types"
import type { LoadedSkill } from "../../features/opencode-skill-loader"
import { isDebugEnabled, setDebugEnabled, getDebugStatus } from "../../features/aide-debug-state"

export * from "./detector"
export * from "./executor"
export * from "./constants"
export * from "./types"

const sessionProcessedCommands = new Set<string>()

export interface AutoSlashCommandHookOptions {
  skills?: LoadedSkill[]
}

export function createAutoSlashCommandHook(options?: AutoSlashCommandHookOptions) {
  const executorOptions: ExecutorOptions = {
    skills: options?.skills,
  }

  return {
    "chat.message": async (
      input: AutoSlashCommandHookInput,
      output: AutoSlashCommandHookOutput
    ): Promise<void> => {
      const promptText = extractPromptText(output.parts)

      if (
        promptText.includes(AUTO_SLASH_COMMAND_TAG_OPEN) ||
        promptText.includes(AUTO_SLASH_COMMAND_TAG_CLOSE) ||
        promptText.includes("[DEBUG-COMMAND-PROCESSED]")
      ) {
        return
      }

      const parsed = detectSlashCommand(promptText)

      if (!parsed) {
        return
      }

      const commandKey = `${input.sessionID}:${input.messageID}:${parsed.command}`
      if (sessionProcessedCommands.has(commandKey)) {
        return
      }
      sessionProcessedCommands.add(commandKey)

      log(`[auto-slash-command] Detected: /${parsed.command}`, {
        sessionID: input.sessionID,
        args: parsed.args,
      })

      // Handle /debug command immediately
      if (parsed.command.toLowerCase() === "debug") {
        const arg = parsed.args.trim().toLowerCase()
        let response = ""

        if (arg === "on" || arg === "enable" || arg === "true" || arg === "1") {
          setDebugEnabled(true)
          response = "🔍 Debug mode **ENABLED**\n\nYou'll now see:\n- 🔍 [Scenario Detector] mode and verification requirements\n- 🔍 [Intent Gate] confidence scores and clarification decisions"
        } else if (arg === "off" || arg === "disable" || arg === "false" || arg === "0") {
          setDebugEnabled(false)
          response = "🔍 Debug mode **DISABLED**\n\nScenario detection and intent analysis will run silently in the background."
        } else if (arg === "" || arg === "status") {
          const status = getDebugStatus()
          response = `🔍 Debug mode: **${status.enabled ? "ON" : "OFF"}**\n\nSource: ${status.source}\n\nUse \`/debug on\` or \`/debug off\` to toggle.`
        } else {
          response = `**Usage:** \`/debug <on|off|status>\`\n\n**Current status:** ${isDebugEnabled() ? "ON" : "OFF"}\n\n**Examples:**\n- \`/debug on\` - Enable debug messages\n- \`/debug off\` - Disable debug messages\n- \`/debug status\` - Show current status`
        }

        const idx = output.parts.findIndex((p) => p.type === "text" && p.text)
        if (idx >= 0) {
          output.parts[idx].text = `[DEBUG-COMMAND-PROCESSED]\n\n${response}`
        }

        log(`[auto-slash-command] Debug command executed`, {
          sessionID: input.sessionID,
          arg,
          newState: isDebugEnabled(),
        })

        return
      }

      const result = await executeSlashCommand(parsed, executorOptions)

      const idx = output.parts.findIndex((p) => p.type === "text" && p.text)
      if (idx < 0) {
        return
      }

      if (result.success && result.replacementText) {
        const taggedContent = `${AUTO_SLASH_COMMAND_TAG_OPEN}\n${result.replacementText}\n${AUTO_SLASH_COMMAND_TAG_CLOSE}`
        output.parts[idx].text = taggedContent

        log(`[auto-slash-command] Replaced message with command template`, {
          sessionID: input.sessionID,
          command: parsed.command,
        })
      } else {
        const errorMessage = `${AUTO_SLASH_COMMAND_TAG_OPEN}\n[AUTO-SLASH-COMMAND ERROR]\n${result.error}\n\nOriginal input: ${parsed.raw}\n${AUTO_SLASH_COMMAND_TAG_CLOSE}`
        output.parts[idx].text = errorMessage

        log(`[auto-slash-command] Command not found, showing error`, {
          sessionID: input.sessionID,
          command: parsed.command,
          error: result.error,
        })
      }
    },
  }
}
