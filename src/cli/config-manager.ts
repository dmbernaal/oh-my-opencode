import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs"
import { join } from "node:path"
import {
  parseJsonc,
  getOpenCodeConfigPaths,
  type OpenCodeBinaryType,
  type OpenCodeConfigPaths,
} from "../shared"
import type { ConfigMergeResult, DetectedConfig, InstallConfig } from "./types"

const OPENCODE_BINARIES = ["opencode", "opencode-desktop"] as const

interface ConfigContext {
  binary: OpenCodeBinaryType
  version: string | null
  paths: OpenCodeConfigPaths
}

let configContext: ConfigContext | null = null

export function initConfigContext(binary: OpenCodeBinaryType, version: string | null): void {
  const paths = getOpenCodeConfigPaths({ binary, version })
  configContext = { binary, version, paths }
}

export function getConfigContext(): ConfigContext {
  if (!configContext) {
    const paths = getOpenCodeConfigPaths({ binary: "opencode", version: null })
    configContext = { binary: "opencode", version: null, paths }
  }
  return configContext
}

export function resetConfigContext(): void {
  configContext = null
}

function getConfigDir(): string {
  return getConfigContext().paths.configDir
}

function getConfigJson(): string {
  return getConfigContext().paths.configJson
}

function getConfigJsonc(): string {
  return getConfigContext().paths.configJsonc
}

function getPackageJson(): string {
  return getConfigContext().paths.packageJson
}

function getOmoConfig(): string {
  return getConfigContext().paths.omoConfig
}

const BUN_INSTALL_TIMEOUT_SECONDS = 60
const BUN_INSTALL_TIMEOUT_MS = BUN_INSTALL_TIMEOUT_SECONDS * 1000

interface NodeError extends Error {
  code?: string
}

function isPermissionError(err: unknown): boolean {
  const nodeErr = err as NodeError
  return nodeErr?.code === "EACCES" || nodeErr?.code === "EPERM"
}

function isFileNotFoundError(err: unknown): boolean {
  const nodeErr = err as NodeError
  return nodeErr?.code === "ENOENT"
}

function formatErrorWithSuggestion(err: unknown, context: string): string {
  if (isPermissionError(err)) {
    return `Permission denied: Cannot ${context}. Try running with elevated permissions or check file ownership.`
  }

  if (isFileNotFoundError(err)) {
    return `File not found while trying to ${context}. The file may have been deleted or moved.`
  }

  if (err instanceof SyntaxError) {
    return `JSON syntax error while trying to ${context}: ${err.message}. Check for missing commas, brackets, or invalid characters.`
  }

  const message = err instanceof Error ? err.message : String(err)

  if (message.includes("ENOSPC")) {
    return `Disk full: Cannot ${context}. Free up disk space and try again.`
  }

  if (message.includes("EROFS")) {
    return `Read-only filesystem: Cannot ${context}. Check if the filesystem is mounted read-only.`
  }

  return `Failed to ${context}: ${message}`
}

export async function fetchLatestVersion(packageName: string): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`)
    if (!res.ok) return null
    const data = await res.json() as { version: string }
    return data.version
  } catch {
    return null
  }
}

type ConfigFormat = "json" | "jsonc" | "none"

interface OpenCodeConfig {
  plugin?: string[]
  [key: string]: unknown
}

export function detectConfigFormat(): { format: ConfigFormat; path: string } {
  const configJsonc = getConfigJsonc()
  const configJson = getConfigJson()

  if (existsSync(configJsonc)) {
    return { format: "jsonc", path: configJsonc }
  }
  if (existsSync(configJson)) {
    return { format: "json", path: configJson }
  }
  return { format: "none", path: configJson }
}

interface ParseConfigResult {
  config: OpenCodeConfig | null
  error?: string
}

function isEmptyOrWhitespace(content: string): boolean {
  return content.trim().length === 0
}

function parseConfig(path: string, _isJsonc: boolean): OpenCodeConfig | null {
  const result = parseConfigWithError(path)
  return result.config
}

function parseConfigWithError(path: string): ParseConfigResult {
  try {
    const stat = statSync(path)
    if (stat.size === 0) {
      return { config: null, error: `Config file is empty: ${path}. Delete it or add valid JSON content.` }
    }

    const content = readFileSync(path, "utf-8")

    if (isEmptyOrWhitespace(content)) {
      return { config: null, error: `Config file contains only whitespace: ${path}. Delete it or add valid JSON content.` }
    }

    const config = parseJsonc<OpenCodeConfig>(content)

    if (config === null || config === undefined) {
      return { config: null, error: `Config file parsed to null/undefined: ${path}. Ensure it contains valid JSON.` }
    }

    if (typeof config !== "object" || Array.isArray(config)) {
      return { config: null, error: `Config file must contain a JSON object, not ${Array.isArray(config) ? "an array" : typeof config}: ${path}` }
    }

    return { config }
  } catch (err) {
    return { config: null, error: formatErrorWithSuggestion(err, `parse config file ${path}`) }
  }
}

function ensureConfigDir(): void {
  const configDir = getConfigDir()
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
}

export function addPluginToOpenCodeConfig(): ConfigMergeResult {
  try {
    ensureConfigDir()
  } catch (err) {
    return { success: false, configPath: getConfigDir(), error: formatErrorWithSuggestion(err, "create config directory") }
  }

  const { format, path } = detectConfigFormat()
  const pluginName = "oh-my-opencode"

  try {
    if (format === "none") {
      const config: OpenCodeConfig = { plugin: [pluginName] }
      writeFileSync(path, JSON.stringify(config, null, 2) + "\n")
      return { success: true, configPath: path }
    }

    const parseResult = parseConfigWithError(path)
    if (!parseResult.config) {
      return { success: false, configPath: path, error: parseResult.error ?? "Failed to parse config file" }
    }

    const config = parseResult.config
    const plugins = config.plugin ?? []
    if (plugins.some((p) => p.startsWith(pluginName))) {
      return { success: true, configPath: path }
    }

    config.plugin = [...plugins, pluginName]

    if (format === "jsonc") {
      const content = readFileSync(path, "utf-8")
      const pluginArrayRegex = /"plugin"\s*:\s*\[([\s\S]*?)\]/
      const match = content.match(pluginArrayRegex)

      if (match) {
        const arrayContent = match[1].trim()
        const newArrayContent = arrayContent
          ? `${arrayContent},\n    "${pluginName}"`
          : `"${pluginName}"`
        const newContent = content.replace(pluginArrayRegex, `"plugin": [\n    ${newArrayContent}\n  ]`)
        writeFileSync(path, newContent)
      } else {
        const newContent = content.replace(/^(\s*\{)/, `$1\n  "plugin": ["${pluginName}"],`)
        writeFileSync(path, newContent)
      }
    } else {
      writeFileSync(path, JSON.stringify(config, null, 2) + "\n")
    }

    return { success: true, configPath: path }
  } catch (err) {
    return { success: false, configPath: path, error: formatErrorWithSuggestion(err, "update opencode config") }
  }
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target }

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key]
    const targetValue = result[key]

    if (
      sourceValue !== null &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T]
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T]
    }
  }

  return result
}

export function generateOmoConfig(installConfig: InstallConfig): Record<string, unknown> {
  const config: Record<string, unknown> = {
    $schema: "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
  }

  if (installConfig.hasGemini) {
    config.google_auth = false
  }

  const agents: Record<string, Record<string, unknown>> = {}

  // Sisyphus - Primary orchestrator with rich prompt and skill configuration
  const sisyphusConfig: Record<string, unknown> = {}
  if (!installConfig.hasClaude) {
    sisyphusConfig.model = "opencode/glm-4.7-free"
  }
  sisyphusConfig.temperature = 0
  sisyphusConfig.tools = {
    "skill_frontend-design": false,
    "skill_documentation": false,
  }
  sisyphusConfig.prompt_append =
    "You are the primary orchestrator. Before starting implementation, load relevant skills: 'tdd-workflow' for test-driven development, 'backend-patterns' for API/server work, 'api-design' for endpoints, 'database-design' for data models. Always create TODOs before implementing. Delegate frontend to @frontend-ui-ux-engineer, documentation to @document-writer."
  sisyphusConfig.description =
    "Primary orchestrator and backend specialist. Plans obsessively with TODOs, delegates strategically. Handles: API design, database work, business logic, authentication, server-side code. NEVER does frontend - always delegates to @frontend-ui-ux-engineer. Loads skills: tdd-workflow, backend-patterns, api-design, database-design."
  agents["Sisyphus"] = sisyphusConfig

  // Oracle - Strategic advisor
  const oracleConfig: Record<string, unknown> = {}
  if (!installConfig.hasChatGPT) {
    oracleConfig.model = installConfig.hasClaude ? "google/gemini-3-pro-preview" : "opencode/glm-4.7-free"
  }
  oracleConfig.temperature = 0
  oracleConfig.tools = {
    "skill_frontend-design": false,
    "skill_tdd-workflow": false,
    "skill_documentation": false,
  }
  oracleConfig.prompt_append =
    "You are a strategic advisor. Load 'architecture-design' skill for architecture reviews. Load 'code-review' skill when reviewing implementations. Provide deep analysis, identify risks, suggest improvements."
  oracleConfig.description =
    "Strategic technical advisor. Invoke SYNCHRONOUSLY for: architecture decisions, code review, debugging complex issues, security review, choosing between approaches. Loads skills: architecture-design, code-review. Wait for response before proceeding."
  agents["oracle"] = oracleConfig

  // Librarian - Research specialist
  const librarianConfig: Record<string, unknown> = {
    model: "opencode/glm-4.7-free",
    temperature: 0,
    tools: {
      "skill_frontend-design": false,
      "skill_tdd-workflow": false,
      "skill_backend-patterns": false,
    },
    prompt_append:
      "You are a research specialist. Load 'research' skill when investigating problems or technologies. Provide evidence-based answers with sources.",
    description:
      "Research specialist. Run in BACKGROUND for parallel research. Use for: documentation lookup, finding implementation examples, GitHub exploration, library evaluation. Loads skill: research.",
  }
  agents["librarian"] = librarianConfig

  // Explore - Fast codebase exploration
  const exploreConfig: Record<string, unknown> = {}
  if (installConfig.hasGemini) {
    exploreConfig.model = "google/antigravity-gemini-3-flash"
  } else if (installConfig.hasClaude && installConfig.isMax20) {
    exploreConfig.model = "anthropic/claude-haiku-4-5"
  } else {
    exploreConfig.model = "opencode/glm-4.7-free"
  }
  exploreConfig.temperature = 0
  exploreConfig.tools = { "skill*": false }
  exploreConfig.description =
    "Blazing fast codebase exploration. Run in BACKGROUND always. Use for: quick file searches, finding existing implementations, keyword matching. No skills - pure speed."
  agents["explore"] = exploreConfig

  // Frontend UI/UX Engineer
  const frontendConfig: Record<string, unknown> = {}
  if (installConfig.hasGemini) {
    frontendConfig.model = "google/antigravity-gemini-3-pro-high"
  } else {
    const fallbackModel = installConfig.hasClaude ? "google/gemini-3-pro-preview" : "opencode/glm-4.7-free"
    frontendConfig.model = fallbackModel
  }
  frontendConfig.temperature = 0.3
  frontendConfig.tools = {
    "skill*": false,
    "skill_frontend-design": true,
  }
  frontendConfig.prompt_append =
    "You are an elite frontend specialist. ALWAYS load 'frontend-design' skill before starting any UI work. Create distinctive, production-grade interfaces. Avoid generic AI aesthetics."
  frontendConfig.description =
    "Elite frontend and UI/UX specialist. Delegate ALL visual work here: React/Vue/Svelte components, CSS/Tailwind, responsive design, animations. ALWAYS loads skill: frontend-design."
  agents["frontend-ui-ux-engineer"] = frontendConfig

  // Document Writer
  const documentWriterConfig: Record<string, unknown> = {}
  if (installConfig.hasGemini) {
    documentWriterConfig.model = "google/antigravity-gemini-3-flash"
  } else {
    const fallbackModel = installConfig.hasClaude ? "google/gemini-3-pro-preview" : "opencode/glm-4.7-free"
    documentWriterConfig.model = fallbackModel
  }
  documentWriterConfig.temperature = 0.2
  documentWriterConfig.tools = {
    "skill*": false,
    "skill_documentation": true,
  }
  documentWriterConfig.prompt_append = "You are a technical writing expert. Load 'documentation' skill for all writing tasks."
  documentWriterConfig.description = "Technical writing expert. Run in BACKGROUND. Use for: README, API docs, code comments. Loads skill: documentation."
  agents["document-writer"] = documentWriterConfig

  // Multimodal Looker
  const multimodalConfig: Record<string, unknown> = {}
  if (installConfig.hasGemini) {
    multimodalConfig.model = "google/antigravity-gemini-3-flash"
  } else {
    const fallbackModel = installConfig.hasClaude ? "google/gemini-3-pro-preview" : "opencode/glm-4.7-free"
    multimodalConfig.model = fallbackModel
  }
  multimodalConfig.temperature = 0
  multimodalConfig.tools = { "skill*": false }
  multimodalConfig.description = "Visual content analyst for PDFs, images, diagrams. Run in BACKGROUND. No skills - pure visual analysis."
  agents["multimodal-looker"] = multimodalConfig

  // Architect - Planning and analysis agent
  const architectConfig: Record<string, unknown> = {
    model: "google/gemini-3-pro-preview",
    temperature: 0,
    tools: {
      "skill_frontend-design": false,
      "skill_tdd-workflow": false,
      "skill_backend-patterns": false,
    },
    prompt_append:
      "You are in planning/analysis mode. Load skills based on phase: 'project-onboarding' for new projects, 'research' for investigation, 'problem-framing' for requirements, 'prd-creation' for specifications, 'architecture-design' for technical design, 'test-specification' for test planning. Do NOT make code changes.",
    description:
      "Planning and analysis agent. Does NOT make changes. Use for: project onboarding, research, PRD creation, architecture design, test specification. Invoke with @architect.",
  }
  agents["architect"] = architectConfig

  if (Object.keys(agents).length > 0) {
    config.agents = agents
  }

  // Categories: override model for Antigravity auth (gemini-3-pro-preview → gemini-3-pro-high)
  if (installConfig.hasGemini) {
    config.categories = {
      "visual-engineering": { model: "google/gemini-3-pro-high" },
      artistry: { model: "google/gemini-3-pro-high" },
      writing: { model: "google/gemini-3-flash-high" },
    }
  }

  return config
}

export function writeOmoConfig(installConfig: InstallConfig): ConfigMergeResult {
  try {
    ensureConfigDir()
  } catch (err) {
    return { success: false, configPath: getConfigDir(), error: formatErrorWithSuggestion(err, "create config directory") }
  }

  const omoConfigPath = getOmoConfig()

  try {
    const newConfig = generateOmoConfig(installConfig)

    if (existsSync(omoConfigPath)) {
      try {
        const stat = statSync(omoConfigPath)
        const content = readFileSync(omoConfigPath, "utf-8")

        if (stat.size === 0 || isEmptyOrWhitespace(content)) {
          writeFileSync(omoConfigPath, JSON.stringify(newConfig, null, 2) + "\n")
          return { success: true, configPath: omoConfigPath }
        }

        const existing = parseJsonc<Record<string, unknown>>(content)
        if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
          writeFileSync(omoConfigPath, JSON.stringify(newConfig, null, 2) + "\n")
          return { success: true, configPath: omoConfigPath }
        }

        delete existing.agents
        const merged = deepMerge(existing, newConfig)
        writeFileSync(omoConfigPath, JSON.stringify(merged, null, 2) + "\n")
      } catch (parseErr) {
        if (parseErr instanceof SyntaxError) {
          writeFileSync(omoConfigPath, JSON.stringify(newConfig, null, 2) + "\n")
          return { success: true, configPath: omoConfigPath }
        }
        throw parseErr
      }
    } else {
      writeFileSync(omoConfigPath, JSON.stringify(newConfig, null, 2) + "\n")
    }

    return { success: true, configPath: omoConfigPath }
  } catch (err) {
    return { success: false, configPath: omoConfigPath, error: formatErrorWithSuggestion(err, "write oh-my-opencode config") }
  }
}

interface OpenCodeBinaryResult {
  binary: OpenCodeBinaryType
  version: string
}

async function findOpenCodeBinaryWithVersion(): Promise<OpenCodeBinaryResult | null> {
  for (const binary of OPENCODE_BINARIES) {
    try {
      const proc = Bun.spawn([binary, "--version"], {
        stdout: "pipe",
        stderr: "pipe",
      })
      const output = await new Response(proc.stdout).text()
      await proc.exited
      if (proc.exitCode === 0) {
        const version = output.trim()
        initConfigContext(binary, version)
        return { binary, version }
      }
    } catch {
      continue
    }
  }
  return null
}

export async function isOpenCodeInstalled(): Promise<boolean> {
  const result = await findOpenCodeBinaryWithVersion()
  return result !== null
}

export async function getOpenCodeVersion(): Promise<string | null> {
  const result = await findOpenCodeBinaryWithVersion()
  return result?.version ?? null
}

export async function addAuthPlugins(config: InstallConfig): Promise<ConfigMergeResult> {
  try {
    ensureConfigDir()
  } catch (err) {
    return { success: false, configPath: getConfigDir(), error: formatErrorWithSuggestion(err, "create config directory") }
  }

  const { format, path } = detectConfigFormat()

  try {
    let existingConfig: OpenCodeConfig | null = null
    if (format !== "none") {
      const parseResult = parseConfigWithError(path)
      if (parseResult.error && !parseResult.config) {
        existingConfig = {}
      } else {
        existingConfig = parseResult.config
      }
    }

    const plugins: string[] = existingConfig?.plugin ?? []

    if (config.hasGemini) {
      const version = await fetchLatestVersion("opencode-antigravity-auth")
      const pluginEntry = version ? `opencode-antigravity-auth@${version}` : "opencode-antigravity-auth"
      if (!plugins.some((p) => p.startsWith("opencode-antigravity-auth"))) {
        plugins.push(pluginEntry)
      }
    }

    if (config.hasChatGPT) {
      if (!plugins.some((p) => p.startsWith("opencode-openai-codex-auth"))) {
        plugins.push("opencode-openai-codex-auth")
      }
    }

    const newConfig = { ...(existingConfig ?? {}), plugin: plugins }
    writeFileSync(path, JSON.stringify(newConfig, null, 2) + "\n")
    return { success: true, configPath: path }
  } catch (err) {
    return { success: false, configPath: path, error: formatErrorWithSuggestion(err, "add auth plugins to config") }
  }
}

export interface BunInstallResult {
  success: boolean
  timedOut?: boolean
  error?: string
}

export async function runBunInstall(): Promise<boolean> {
  const result = await runBunInstallWithDetails()
  return result.success
}

export async function runBunInstallWithDetails(): Promise<BunInstallResult> {
  try {
    const proc = Bun.spawn(["bun", "install"], {
      cwd: getConfigDir(),
      stdout: "pipe",
      stderr: "pipe",
    })

    const timeoutPromise = new Promise<"timeout">((resolve) =>
      setTimeout(() => resolve("timeout"), BUN_INSTALL_TIMEOUT_MS)
    )

    const exitPromise = proc.exited.then(() => "completed" as const)

    const result = await Promise.race([exitPromise, timeoutPromise])

    if (result === "timeout") {
      try {
        proc.kill()
      } catch {
        /* intentionally empty - process may have already exited */
      }
      return {
        success: false,
        timedOut: true,
        error: `bun install timed out after ${BUN_INSTALL_TIMEOUT_SECONDS} seconds. Try running manually: cd ~/.config/opencode && bun i`,
      }
    }

    if (proc.exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text()
      return {
        success: false,
        error: stderr.trim() || `bun install failed with exit code ${proc.exitCode}`,
      }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: `bun install failed: ${message}. Is bun installed? Try: curl -fsSL https://bun.sh/install | bash`,
    }
  }
}

/**
 * Antigravity Provider Configuration
 *
 * IMPORTANT: Model names MUST use `antigravity-` prefix for stability.
 *
 * The opencode-antigravity-auth plugin supports two naming conventions:
 * - `antigravity-gemini-3-pro-high` (RECOMMENDED, explicit Antigravity quota routing)
 * - `gemini-3-pro-high` (LEGACY, backward compatible but may break in future)
 *
 * Legacy names rely on Gemini CLI using `-preview` suffix for disambiguation.
 * If Google removes `-preview`, legacy names may route to wrong quota.
 *
 * @see https://github.com/NoeFabris/opencode-antigravity-auth#migration-guide-v127
 */
export const ANTIGRAVITY_PROVIDER_CONFIG = {
  google: {
    name: "Google",
    models: {
      "antigravity-gemini-3-pro-high": {
        name: "Gemini 3 Pro High (Antigravity)",
        thinking: true,
        attachment: true,
        limit: { context: 1048576, output: 65535 },
        modalities: { input: ["text", "image", "pdf"], output: ["text"] },
      },
      "antigravity-gemini-3-pro-low": {
        name: "Gemini 3 Pro Low (Antigravity)",
        thinking: true,
        attachment: true,
        limit: { context: 1048576, output: 65535 },
        modalities: { input: ["text", "image", "pdf"], output: ["text"] },
      },
      "antigravity-gemini-3-flash": {
        name: "Gemini 3 Flash (Antigravity)",
        attachment: true,
        limit: { context: 1048576, output: 65536 },
        modalities: { input: ["text", "image", "pdf"], output: ["text"] },
      },
    },
  },
}

const CODEX_PROVIDER_CONFIG = {
  openai: {
    name: "OpenAI",
    options: {
      reasoningEffort: "medium",
      reasoningSummary: "auto",
      textVerbosity: "medium",
      include: ["reasoning.encrypted_content"],
      store: false,
    },
    models: {
      "gpt-5.2": {
        name: "GPT 5.2 (OAuth)",
        limit: { context: 272000, output: 128000 },
        modalities: { input: ["text", "image"], output: ["text"] },
        variants: {
          none: { reasoningEffort: "none", reasoningSummary: "auto", textVerbosity: "medium" },
          low: { reasoningEffort: "low", reasoningSummary: "auto", textVerbosity: "medium" },
          medium: { reasoningEffort: "medium", reasoningSummary: "auto", textVerbosity: "medium" },
          high: { reasoningEffort: "high", reasoningSummary: "detailed", textVerbosity: "medium" },
          xhigh: { reasoningEffort: "xhigh", reasoningSummary: "detailed", textVerbosity: "medium" },
        },
      },
      "gpt-5.2-codex": {
        name: "GPT 5.2 Codex (OAuth)",
        limit: { context: 272000, output: 128000 },
        modalities: { input: ["text", "image"], output: ["text"] },
        variants: {
          low: { reasoningEffort: "low", reasoningSummary: "auto", textVerbosity: "medium" },
          medium: { reasoningEffort: "medium", reasoningSummary: "auto", textVerbosity: "medium" },
          high: { reasoningEffort: "high", reasoningSummary: "detailed", textVerbosity: "medium" },
          xhigh: { reasoningEffort: "xhigh", reasoningSummary: "detailed", textVerbosity: "medium" },
        },
      },
      "gpt-5.1-codex-max": {
        name: "GPT 5.1 Codex Max (OAuth)",
        limit: { context: 272000, output: 128000 },
        modalities: { input: ["text", "image"], output: ["text"] },
        variants: {
          low: { reasoningEffort: "low", reasoningSummary: "detailed", textVerbosity: "medium" },
          medium: { reasoningEffort: "medium", reasoningSummary: "detailed", textVerbosity: "medium" },
          high: { reasoningEffort: "high", reasoningSummary: "detailed", textVerbosity: "medium" },
          xhigh: { reasoningEffort: "xhigh", reasoningSummary: "detailed", textVerbosity: "medium" },
        },
      },
    },
  },
}

export function addProviderConfig(config: InstallConfig): ConfigMergeResult {
  try {
    ensureConfigDir()
  } catch (err) {
    return { success: false, configPath: getConfigDir(), error: formatErrorWithSuggestion(err, "create config directory") }
  }

  const { format, path } = detectConfigFormat()

  try {
    let existingConfig: OpenCodeConfig | null = null
    if (format !== "none") {
      const parseResult = parseConfigWithError(path)
      if (parseResult.error && !parseResult.config) {
        existingConfig = {}
      } else {
        existingConfig = parseResult.config
      }
    }

    const newConfig = { ...(existingConfig ?? {}) }

    const providers = (newConfig.provider ?? {}) as Record<string, unknown>

    if (config.hasGemini) {
      providers.google = ANTIGRAVITY_PROVIDER_CONFIG.google
    }

    if (config.hasChatGPT) {
      providers.openai = CODEX_PROVIDER_CONFIG.openai
    }

    if (Object.keys(providers).length > 0) {
      newConfig.provider = providers
    }

    writeFileSync(path, JSON.stringify(newConfig, null, 2) + "\n")
    return { success: true, configPath: path }
  } catch (err) {
    return { success: false, configPath: path, error: formatErrorWithSuggestion(err, "add provider config") }
  }
}

interface OmoConfigData {
  google_auth?: boolean
  agents?: Record<string, { model?: string }>
}

export function detectCurrentConfig(): DetectedConfig {
  const result: DetectedConfig = {
    isInstalled: false,
    hasClaude: true,
    isMax20: true,
    hasChatGPT: true,
    hasGemini: false,
  }

  const { format, path } = detectConfigFormat()
  if (format === "none") {
    return result
  }

  const parseResult = parseConfigWithError(path)
  if (!parseResult.config) {
    return result
  }

  const openCodeConfig = parseResult.config
  const plugins = openCodeConfig.plugin ?? []
  result.isInstalled = plugins.some((p) => p.startsWith("oh-my-opencode"))

  if (!result.isInstalled) {
    return result
  }

  result.hasGemini = plugins.some((p) => p.startsWith("opencode-antigravity-auth"))
  result.hasChatGPT = plugins.some((p) => p.startsWith("opencode-openai-codex-auth"))

  const omoConfigPath = getOmoConfig()
  if (!existsSync(omoConfigPath)) {
    return result
  }

  try {
    const stat = statSync(omoConfigPath)
    if (stat.size === 0) {
      return result
    }

    const content = readFileSync(omoConfigPath, "utf-8")
    if (isEmptyOrWhitespace(content)) {
      return result
    }

    const omoConfig = parseJsonc<OmoConfigData>(content)
    if (!omoConfig || typeof omoConfig !== "object") {
      return result
    }

    const agents = omoConfig.agents ?? {}

    if (agents["Sisyphus"]?.model === "opencode/glm-4.7-free") {
      result.hasClaude = false
      result.isMax20 = false
    } else if (agents["librarian"]?.model === "opencode/glm-4.7-free") {
      result.hasClaude = true
      result.isMax20 = false
    }

    if (agents["oracle"]?.model?.startsWith("anthropic/")) {
      result.hasChatGPT = false
    } else if (agents["oracle"]?.model === "opencode/glm-4.7-free") {
      result.hasChatGPT = false
    }

    if (omoConfig.google_auth === false) {
      result.hasGemini = plugins.some((p) => p.startsWith("opencode-antigravity-auth"))
    }
  } catch {
    /* intentionally empty - malformed omo config returns defaults from opencode config detection */
  }

  return result
}
