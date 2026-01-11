export interface PlanningSession {
  active: boolean
  agent: string
  startedAt: string
  planName: string | null
  lastActivity: string
}

export interface PlanningSessionOptions {
  agent?: string
  planName?: string | null
}
