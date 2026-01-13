export interface HookInput {
  sessionID?: string
  agent?: string
}

export interface HookOutput {
  parts?: Array<{ type: string; text?: string }>
}
