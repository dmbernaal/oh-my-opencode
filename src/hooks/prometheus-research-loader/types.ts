export interface ResearchFinding {
  category: string
  summary: string
  details?: string
}

export interface ResearchMetadata {
  filename: string
  created_at: string
  session_id?: string
}

export interface ResearchDocument {
  goal: string
  requirements: string[]
  findings: ResearchFinding[]
  recommendations: string[]
  gaps: string[]
  metadata: ResearchMetadata
}
