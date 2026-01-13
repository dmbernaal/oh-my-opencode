import { describe, test, expect } from "bun:test"
import { parseResearchDocument } from "./parser"
import { writeFileSync, mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"

const TEST_DIR = join(import.meta.dir, ".test-tmp")

describe("parseResearchDocument", () => {
  test("parses complete research document", () => {
    // #given
    mkdirSync(TEST_DIR, { recursive: true })
    const testFile = join(TEST_DIR, "test-research.md")
    const content = `# Goal
Build a task management application

## Requirements
- User authentication
- Task CRUD operations
- Real-time updates

## Findings

### Technical Stack
- Next.js for frontend
- PostgreSQL for database

### Architecture
- Microservices approach recommended
- API-first design

## Recommendations
- Use TypeScript for type safety
- Implement CI/CD pipeline
- Add comprehensive testing

## Information Gaps
- Deployment platform not specified
- Scale requirements unclear
`
    writeFileSync(testFile, content)

    // #when
    const result = parseResearchDocument(testFile)

    // #then
    expect(result.goal).toContain("Build a task management application")
    expect(result.requirements).toHaveLength(3)
    expect(result.requirements[0]).toBe("User authentication")
    expect(result.findings).toHaveLength(2)
    expect(result.findings[0].category).toBe("Technical Stack")
    expect(result.findings[0].summary).toContain("Next.js")
    expect(result.recommendations).toHaveLength(3)
    expect(result.gaps).toHaveLength(2)
    expect(result.metadata.filename).toBe("test-research.md")

    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  test("handles minimal research document", () => {
    // #given
    mkdirSync(TEST_DIR, { recursive: true })
    const testFile = join(TEST_DIR, "minimal.md")
    const content = `# Goal
Simple goal

## Requirements
- One requirement
`
    writeFileSync(testFile, content)

    // #when
    const result = parseResearchDocument(testFile)

    // #then
    expect(result.goal).toBe("Simple goal")
    expect(result.requirements).toHaveLength(1)
    expect(result.findings).toHaveLength(0)
    expect(result.recommendations).toHaveLength(0)
    expect(result.gaps).toHaveLength(0)

    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  test("handles document with no sections", () => {
    // #given
    mkdirSync(TEST_DIR, { recursive: true })
    const testFile = join(TEST_DIR, "empty.md")
    const content = `Some random content without proper sections`
    writeFileSync(testFile, content)

    // #when
    const result = parseResearchDocument(testFile)

    // #then
    expect(result.goal).toBe("")
    expect(result.requirements).toHaveLength(0)
    expect(result.findings).toHaveLength(0)
    expect(result.recommendations).toHaveLength(0)
    expect(result.gaps).toHaveLength(0)

    rmSync(TEST_DIR, { recursive: true, force: true })
  })
})
