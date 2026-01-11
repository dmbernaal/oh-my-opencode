import { describe, test, expect } from "bun:test"
import { createVerificationEnforcerHook } from "./index"

describe("verification-enforcer", () => {
  const ctx = { directory: "/test/dir" }

  function createOutput(): any {
    return {
      title: "todowrite",
      output: "{}",
      metadata: {},
    }
  }

  test("handles undefined input.args gracefully", async () => {
    const hook = createVerificationEnforcerHook(ctx)
    const handler = hook["tool.execute.after"]

    if (!handler) {
      throw new Error("tool.execute.after handler not found")
    }

    const input = {
      tool: "todowrite",
      args: undefined,
      sessionID: "test-session",
      callID: "test-call-1",
    }

    const output = createOutput()

    await handler(input, output)

    expect(output.verificationWarning).toBeUndefined()
    expect(output.verificationRequired).toBeUndefined()
  })

  test("handles missing todos property", async () => {
    const hook = createVerificationEnforcerHook(ctx)
    const handler = hook["tool.execute.after"]

    if (!handler) {
      throw new Error("tool.execute.after handler not found")
    }

    const input = {
      tool: "todowrite",
      args: {},
      sessionID: "test-session",
      callID: "test-call-2",
    }

    const output = createOutput()

    await handler(input, output)

    expect(output.verificationWarning).toBeUndefined()
    expect(output.verificationRequired).toBeUndefined()
  })

  test("handles empty todos array", async () => {
    const hook = createVerificationEnforcerHook(ctx)
    const handler = hook["tool.execute.after"]

    if (!handler) {
      throw new Error("tool.execute.after handler not found")
    }

    const input = {
      tool: "todowrite",
      args: { todos: [] },
      sessionID: "test-session",
      callID: "test-call-3",
    }

    const output = createOutput()

    await handler(input, output)

    expect(output.verificationWarning).toBeUndefined()
    expect(output.verificationRequired).toBeUndefined()
  })

  test("handles todos without completed status", async () => {
    const hook = createVerificationEnforcerHook(ctx)
    const handler = hook["tool.execute.after"]

    if (!handler) {
      throw new Error("tool.execute.after handler not found")
    }

    const input = {
      tool: "todowrite",
      args: {
        todos: [
          { id: "1", status: "pending", content: "Task 1", priority: "high" },
          { id: "2", status: "in_progress", content: "Task 2", priority: "medium" },
        ],
      },
      sessionID: "test-session",
      callID: "test-call-4",
    }

    const output = createOutput()

    await handler(input, output)

    expect(output.verificationWarning).toBeUndefined()
    expect(output.verificationRequired).toBeUndefined()
  })

  test("ignores non-todowrite tools", async () => {
    const hook = createVerificationEnforcerHook(ctx)
    const handler = hook["tool.execute.after"]

    if (!handler) {
      throw new Error("tool.execute.after handler not found")
    }

    const input = {
      tool: "read",
      args: { filePath: "/test/file.ts" },
      sessionID: "test-session",
      callID: "test-call-5",
    }

    const output: any = {
      title: "todowrite",
      output: "{}",
      metadata: {},
    }

    await handler(input, output)

    expect(output.verificationWarning).toBeUndefined()
    expect(output.verificationRequired).toBeUndefined()
  })
})
