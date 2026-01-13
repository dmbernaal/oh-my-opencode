export interface PlanTemplateData {
  topic: string
  problemStatement: string
  userStories: Array<{
    id: string
    title: string
    asA: string
    iWant: string
    soThat: string
    acceptanceCriteria: string[]
  }>
  successMetrics: string[]
  outOfScope: string[]
}

export interface ArchitectureTemplateData {
  topic: string
  overview: string
  componentDiagram: string
  dataFlow: string[]
  apiContracts: Array<{
    method: string
    endpoint: string
    request?: string
    response: string
  }>
  fileStructure: string
  technologyDecisions: Array<{
    category: string
    choice: string
    reasoning: string
  }>
}

export interface TasksTemplateData {
  topic: string
  phases: Array<{
    name: string
    tasks: Array<{
      id: string
      title: string
      description: string
      agent: string
      dependencies: string[]
      complexity: 'low' | 'medium' | 'high'
    }>
  }>
}

export function generatePRD(data: PlanTemplateData): string {
  const userStoriesSection = data.userStories
    .map(
      (story) => `### ${story.id}: ${story.title}
**As a** ${story.asA}  
**I want to** ${story.iWant}  
**So that** ${story.soThat}

**Acceptance Criteria:**
${story.acceptanceCriteria.map((criteria) => `- [ ] ${criteria}`).join('\n')}
`
    )
    .join('\n')

  return `# PRD: ${data.topic}

## Problem Statement
${data.problemStatement}

## User Stories

${userStoriesSection}

## Success Metrics
${data.successMetrics.map((metric) => `- ${metric}`).join('\n')}

## Out of Scope (v1)
${data.outOfScope.map((item) => `- ${item}`).join('\n')}
`
}

export function generateArchitecture(data: ArchitectureTemplateData): string {
  const apiContractsSection = data.apiContracts
    .map(
      (contract) => `### ${contract.method} ${contract.endpoint}
${contract.request ? `Request:\n\`\`\`json\n${contract.request}\n\`\`\`\n` : ''}
Response:
\`\`\`json
${contract.response}
\`\`\`
`
    )
    .join('\n')

  const techDecisionsSection = data.technologyDecisions
    .map((decision) => `- **${decision.category}**: ${decision.choice} (${decision.reasoning})`)
    .join('\n')

  return `# Architecture: ${data.topic}

## Overview
${data.overview}

## Component Diagram

\`\`\`
${data.componentDiagram}
\`\`\`

## Data Flow

${data.dataFlow.map((step, index) => `${index + 1}. ${step}`).join('\n')}

## API Contracts

${apiContractsSection}

## File Structure

\`\`\`
${data.fileStructure}
\`\`\`

## Technology Decisions
${techDecisionsSection}
`
}

export function generateTasks(data: TasksTemplateData): string {
  const phasesSection = data.phases
    .map(
      (phase) => `## ${phase.name} (${phase.tasks.length} tasks)

${phase.tasks
  .map(
    (task) => `### ${task.id}: ${task.title}
**Description**: ${task.description}  
**Agent**: ${task.agent}  
**Complexity**: ${task.complexity}  
${task.dependencies.length > 0 ? `**Dependencies**: ${task.dependencies.join(', ')}` : '**Dependencies**: None'}
`
  )
  .join('\n')}
`
    )
    .join('\n')

  return `# Tasks: ${data.topic}

${phasesSection}
`
}
