import { readFileSync, statSync } from "node:fs"
import { basename } from "node:path"
import type { ResearchDocument, ResearchFinding } from "./types"

export function parseResearchDocument(filePath: string): ResearchDocument {
  const content = readFileSync(filePath, "utf-8")
  const filename = basename(filePath)
  const stats = statSync(filePath)
  
  const document: ResearchDocument = {
    goal: "",
    requirements: [],
    findings: [],
    recommendations: [],
    gaps: [],
    metadata: {
      filename,
      created_at: stats.birthtime.toISOString(),
    },
  }

  const lines = content.split('\n')
  let currentSection: 'goal' | 'requirements' | 'findings' | 'recommendations' | 'gaps' | null = null
  let currentFinding: Partial<ResearchFinding> | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('# Goal') || trimmed.startsWith('## Goal')) {
      currentSection = 'goal'
      continue
    }
    
    if (trimmed.startsWith('# Requirements') || trimmed.startsWith('## Requirements')) {
      currentSection = 'requirements'
      continue
    }
    
    if (trimmed.startsWith('# Findings') || trimmed.startsWith('## Findings')) {
      currentSection = 'findings'
      continue
    }
    
    if (trimmed.startsWith('# Recommendations') || trimmed.startsWith('## Recommendations')) {
      currentSection = 'recommendations'
      continue
    }
    
    if (trimmed.startsWith('# Gaps') || trimmed.startsWith('## Gaps') || 
        trimmed.startsWith('# Information Gaps') || trimmed.startsWith('## Information Gaps')) {
      currentSection = 'gaps'
      continue
    }

    if (!currentSection || !trimmed) {
      continue
    }

    if (currentSection === 'goal') {
      if (document.goal) {
        document.goal += ' ' + trimmed
      } else {
        document.goal = trimmed
      }
    }

    if (currentSection === 'requirements' && trimmed.startsWith('-')) {
      document.requirements.push(trimmed.substring(1).trim())
    }

    if (currentSection === 'findings') {
      if (trimmed.startsWith('###')) {
        if (currentFinding && currentFinding.category && currentFinding.summary) {
          document.findings.push(currentFinding as ResearchFinding)
        }
        currentFinding = {
          category: trimmed.replace(/^###\s*/, '').trim(),
          summary: '',
        }
      } else if (currentFinding && trimmed.startsWith('-')) {
        const text = trimmed.substring(1).trim()
        if (!currentFinding.summary) {
          currentFinding.summary = text
        } else {
          currentFinding.summary += ' ' + text
        }
      }
    }

    if (currentSection === 'recommendations' && trimmed.startsWith('-')) {
      document.recommendations.push(trimmed.substring(1).trim())
    }

    if (currentSection === 'gaps' && trimmed.startsWith('-')) {
      document.gaps.push(trimmed.substring(1).trim())
    }
  }

  if (currentFinding && currentFinding.category && currentFinding.summary) {
    document.findings.push(currentFinding as ResearchFinding)
  }

  return document
}
