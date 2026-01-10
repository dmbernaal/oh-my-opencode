import { getSessionConfiguration } from "../scenario-detector";
import { log } from "../../shared/logger";

export interface IntentAnalysis {
  confidence: number;
  classification: "clear" | "ambiguous" | "under-specified";
  knownFactors: string[];
  ambiguities: string[];
  missingInfo: string[];
  suggestedQuestions: string[];
}

export interface ProjectContext {
  stack?: string;
  framework?: string;
  hasTests?: boolean;
  hasLint?: boolean;
  conventions?: string[];
}

export async function analyzeIntent(
  userRequest: string,
  projectContext: ProjectContext,
  _client: any,
  sessionID?: string
): Promise<IntentAnalysis> {
  const sessionConfig = getSessionConfiguration(sessionID);
  const threshold = sessionConfig?.confidenceThreshold || 80;

  // Use heuristic analysis (LLM call removed due to API incompatibility)
  return createFallbackAnalysis(userRequest, threshold, projectContext);
}

function createFallbackAnalysis(
  userRequest: string, 
  threshold: number,
  projectContext?: ProjectContext
): IntentAnalysis {
  const requestLower = userRequest.toLowerCase();
  
  // Vague terms that decrease confidence
  const vagueTerms = ["better", "improve", "fix", "add", "update", "change", "make", "do", "help"];
  const hasVagueTerms = vagueTerms.some((term) => {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    return regex.test(requestLower);
  });
  
  // Specific terms that increase confidence
  const hasSpecifics = /\b(file|line|function|component|class|method|error|bug|typo|test|api|endpoint|route|page|button|form|database|schema|migration|config|env)\b/i.test(userRequest);
  const hasFilePath = /[\/\\][\w\-\.]+\.(ts|tsx|js|jsx|json|md|css|html|py|go|rs|java|rb|php|vue|svelte)/.test(userRequest);
  const hasCodeReference = /`[^`]+`/.test(userRequest) || /['"][^'"]+['"]/.test(userRequest);
  const hasExplicitAction = /\b(create|delete|remove|rename|move|copy|install|uninstall|run|execute|build|deploy|test|lint|format)\b/i.test(userRequest);
  
  // Calculate confidence
  let confidence = 40; // Base
  
  if (hasSpecifics) confidence += 20;
  if (hasFilePath) confidence += 15;
  if (hasCodeReference) confidence += 10;
  if (hasExplicitAction) confidence += 15;
  if (!hasVagueTerms) confidence += 10;
  if (userRequest.length > 100) confidence += 10;
  if (userRequest.length > 200) confidence += 5;
  
  // Cap at 100
  confidence = Math.min(confidence, 100);
  
  const classification = confidence >= threshold ? "clear" : confidence >= 60 ? "ambiguous" : "under-specified";

  // Build analysis
  const knownFactors: string[] = [];
  const ambiguities: string[] = [];
  const missingInfo: string[] = [];
  const suggestedQuestions: string[] = [];

  if (hasSpecifics) knownFactors.push("Request mentions specific code elements");
  if (hasFilePath) knownFactors.push("Request includes file path references");
  if (hasCodeReference) knownFactors.push("Request includes code or string references");
  if (hasExplicitAction) knownFactors.push("Request has clear action verb");
  
  if (hasVagueTerms && !hasSpecifics) {
    ambiguities.push("Request uses vague terms without specific targets");
    suggestedQuestions.push("What specific file, component, or feature should I focus on?");
  }
  
  if (!hasFilePath && !hasCodeReference) {
    missingInfo.push("No specific files or code elements mentioned");
    suggestedQuestions.push("Can you point me to the specific file or code you want me to work on?");
  }
  
  if (!hasExplicitAction) {
    missingInfo.push("No clear action specified");
    suggestedQuestions.push("What exactly would you like me to do? (e.g., create, fix, refactor, add)");
  }
  
  if (userRequest.length < 30) {
    missingInfo.push("Request is very brief");
    suggestedQuestions.push("Can you provide more details about what you're trying to achieve?");
  }

  log('[Intent Gate] Heuristic analysis:', { confidence, classification, threshold });

  return {
    confidence,
    classification,
    knownFactors,
    ambiguities,
    missingInfo,
    suggestedQuestions,
  };
}
