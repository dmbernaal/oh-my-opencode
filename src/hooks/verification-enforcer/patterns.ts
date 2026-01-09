export const VERIFICATION_PATTERNS = {
  typeCheck: [
    /lsp_diagnostics.*0 errors/i,
    /tsc.*Successfully compiled/i,
    /typecheck.*passed/i,
    /No errors found/i,
    /✓.*type.*check/i,
  ],
  tests: [
    /Tests:.*\d+ passed/i,
    /✓.*tests? passed/i,
    /All tests passed/i,
    /bun test.*ok/i,
    /\d+ passing/i,
    /Test Suites:.*passed/i,
  ],
  build: [
    /Build completed/i,
    /Successfully compiled/i,
    /webpack.*compiled successfully/i,
    /next build.*completed/i,
    /✓.*built/i,
    /Bundled.*modules/i,
  ],
  lint: [
    /eslint.*0 errors/i,
    /lint.*passed/i,
    /No linting errors/i,
    /✓.*lint/i,
  ],
};

export function detectVerificationEvidence(
  recentContext: string
): {
  typeCheck: boolean;
  tests: boolean;
  build: boolean;
  lint: boolean;
} {
  return {
    typeCheck: VERIFICATION_PATTERNS.typeCheck.some((pattern) => pattern.test(recentContext)),
    tests: VERIFICATION_PATTERNS.tests.some((pattern) => pattern.test(recentContext)),
    build: VERIFICATION_PATTERNS.build.some((pattern) => pattern.test(recentContext)),
    lint: VERIFICATION_PATTERNS.lint.some((pattern) => pattern.test(recentContext)),
  };
}
