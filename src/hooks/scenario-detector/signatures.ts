export interface ScenarioSignature {
  mode: "surgery" | "feature" | "builder" | "refactor";
  keywords: string[];
  patterns: RegExp[];
  contextSignals: string[];
  confidenceThreshold: number;
  requiredVerification: string[];
  requiresPRD: boolean;
  requiresArchitecture: boolean;
}

export const SCENARIOS: ScenarioSignature[] = [
  {
    mode: "surgery",
    keywords: [
      "fix",
      "bug",
      "broken",
      "doesn't work",
      "doesn't",
      "error",
      "crash",
      "hotfix",
      "patch",
      "typo",
      "quick",
    ],
    patterns: [
      /fix (the|this|a)/i,
      /not working/i,
      /throws? (an? )?error/i,
      /doesn'?t work/i,
      /is broken/i,
    ],
    contextSignals: [],
    confidenceThreshold: 60,
    requiredVerification: ["tests"],
    requiresPRD: false,
    requiresArchitecture: false,
  },
  {
    mode: "feature",
    keywords: ["add", "create", "implement", "build", "new", "feature", "want", "need"],
    patterns: [
      /add (a|the|new)/i,
      /create (a|the)/i,
      /I want/i,
      /I need/i,
      /implement/i,
      /build (a|the)/i,
    ],
    contextSignals: [],
    confidenceThreshold: 80,
    requiredVerification: ["typecheck", "tests", "lint", "build"],
    requiresPRD: true,
    requiresArchitecture: true,
  },
  {
    mode: "builder",
    keywords: [
      "new project",
      "from scratch",
      "scaffold",
      "initialize",
      "setup",
      "bootstrap",
      "start",
    ],
    patterns: [
      /new (app|project|repo)/i,
      /start fresh/i,
      /from scratch/i,
      /scaffold/i,
      /initialize/i,
    ],
    contextSignals: ["empty_directory", "no_package_json"],
    confidenceThreshold: 70,
    requiredVerification: ["typecheck", "tests", "lint", "build"],
    requiresPRD: true,
    requiresArchitecture: true,
  },
  {
    mode: "refactor",
    keywords: [
      "refactor",
      "restructure",
      "reorganize",
      "clean up",
      "improve",
      "migrate",
      "rewrite",
    ],
    patterns: [
      /refactor (the|this)/i,
      /clean up/i,
      /restructure/i,
      /reorganize/i,
      /migrate/i,
    ],
    contextSignals: [],
    confidenceThreshold: 90,
    requiredVerification: ["typecheck", "tests", "lint", "build"],
    requiresPRD: true,
    requiresArchitecture: true,
  },
];

export interface SessionConfiguration {
  mode: "surgery" | "feature" | "builder" | "refactor";
  confidenceThreshold: number;
  requiredVerification: string[];
  requiresPRD: boolean;
  requiresArchitecture: boolean;
}

export function detectScenario(
  userRequest: string,
  projectContext: { isEmpty: boolean; hasPackageJson: boolean }
): ScenarioSignature | null {
  const requestLower = userRequest.toLowerCase();

  let bestMatch: { scenario: ScenarioSignature; score: number } | null = null;

  for (const scenario of SCENARIOS) {
    let score = 0;

    for (const keyword of scenario.keywords) {
      if (requestLower.includes(keyword.toLowerCase())) {
        score += 2;
      }
    }

    for (const pattern of scenario.patterns) {
      if (pattern.test(userRequest)) {
        score += 3;
      }
    }

    for (const signal of scenario.contextSignals) {
      if (signal === "empty_directory" && projectContext.isEmpty) {
        score += 5;
      }
      if (signal === "no_package_json" && !projectContext.hasPackageJson) {
        score += 5;
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { scenario, score };
    }
  }

  return bestMatch ? bestMatch.scenario : null;
}

export function parseUserOverride(userRequest: string): ScenarioSignature["mode"] | null {
  const requestLower = userRequest.toLowerCase();

  if (
    requestLower.includes("treat this as surgery") ||
    requestLower.includes("just a quick fix") ||
    requestLower.includes("quick fix")
  ) {
    return "surgery";
  }

  if (
    requestLower.includes("do this properly") ||
    requestLower.includes("treat this as a feature") ||
    requestLower.includes("full feature")
  ) {
    return "feature";
  }

  if (
    requestLower.includes("let's refactor") ||
    requestLower.includes("treat this as refactor")
  ) {
    return "refactor";
  }

  if (
    requestLower.includes("new project") ||
    requestLower.includes("from scratch") ||
    requestLower.includes("treat this as builder")
  ) {
    return "builder";
  }

  return null;
}
