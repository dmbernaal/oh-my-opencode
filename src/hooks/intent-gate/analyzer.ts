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

const ANALYSIS_TIMEOUT_MS = 5000;
const EXPLORE_AGENT = "explore";

export async function analyzeIntent(
  userRequest: string,
  projectContext: ProjectContext,
  client: any,
  parentSessionID?: string
): Promise<IntentAnalysis> {
  const sessionConfig = getSessionConfiguration(parentSessionID);
  const threshold = sessionConfig?.confidenceThreshold || 80;

  if (!client || !parentSessionID) {
    log("[Intent Gate] No client or session, using heuristic analysis");
    return createFallbackAnalysis(userRequest, threshold, projectContext);
  }

  try {
    const result = await Promise.race([
      performLLMAnalysis(userRequest, projectContext, client, parentSessionID, threshold),
      createTimeoutPromise(ANALYSIS_TIMEOUT_MS),
    ]);

    return result;
  } catch (error) {
    log("[Intent Gate] LLM analysis failed, falling back to heuristics:", error);
    return createFallbackAnalysis(userRequest, threshold, projectContext);
  }
}

function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Intent analysis timed out after ${ms}ms`)), ms);
  });
}

async function performLLMAnalysis(
  userRequest: string,
  projectContext: ProjectContext,
  client: any,
  parentSessionID: string,
  threshold: number
): Promise<IntentAnalysis> {
  const prompt = buildAnalysisPrompt(userRequest, projectContext, threshold);

  log(`[Intent Gate] Creating analysis session with parent: ${parentSessionID}`);
  const createResult = await client.session.create({
    body: {
      parentID: parentSessionID,
      title: `Intent Analysis: ${userRequest.substring(0, 30)}...`,
    },
  });

  if (createResult.error) {
    log(`[Intent Gate] Session create error:`, createResult.error);
    throw new Error(`Failed to create session: ${createResult.error}`);
  }

  const sessionID = createResult.data.id;
  log(`[Intent Gate] Created session: ${sessionID}`);

  await client.session.prompt({
    path: { id: sessionID },
    body: {
      agent: EXPLORE_AGENT,
      tools: {
        task: false,
        call_omo_agent: false,
        write: false,
        edit: false,
        bash: false,
      },
      parts: [{ type: "text", text: prompt }],
    },
  });

  log(`[Intent Gate] Prompt sent, fetching messages...`);

  const messagesResult = await client.session.messages({
    path: { id: sessionID },
  });

  if (messagesResult.error) {
    log(`[Intent Gate] Messages error:`, messagesResult.error);
    throw new Error(`Failed to get messages: ${messagesResult.error}`);
  }

  const messages = messagesResult.data;
  log(`[Intent Gate] Got ${messages.length} messages`);

  const lastAssistantMessage = messages
    .filter((m: any) => m.info.role === "assistant")
    .sort((a: any, b: any) => (b.info.time?.created || 0) - (a.info.time?.created || 0))[0];

  if (!lastAssistantMessage) {
    log(`[Intent Gate] No assistant message found`);
    throw new Error("No response from analysis agent");
  }

  const textParts = lastAssistantMessage.parts.filter((p: any) => p.type === "text");
  const responseText = textParts.map((p: any) => p.text).join("\n");

  log(`[Intent Gate] Got response, length: ${responseText.length}`);

  return parseAnalysisResponse(responseText, threshold);
}

function buildAnalysisPrompt(userRequest: string, projectContext: ProjectContext, threshold: number): string {
  const contextInfo = projectContext.stack || projectContext.framework
    ? `\nProject context: ${projectContext.stack || ""} ${projectContext.framework || ""}`.trim()
    : "";

  return `Analyze this user request for clarity and completeness. Return ONLY valid JSON.

User Request: "${userRequest}"${contextInfo}

Evaluate:
1. Is the request specific enough to act on?
2. Are there ambiguous terms that could mean multiple things?
3. What information is missing that would help?

Return JSON in this exact format (no markdown, no explanation):
{
  "confidence": <0-100 number>,
  "classification": "<clear|ambiguous|under-specified>",
  "knownFactors": ["<what is clear about the request>"],
  "ambiguities": ["<what could mean multiple things>"],
  "missingInfo": ["<what information would help>"],
  "suggestedQuestions": ["<questions to ask for clarity>"]
}

Confidence guidelines:
- 90-100: Very specific request with clear file/component/action
- 70-89: Reasonably clear but could use minor clarification
- 50-69: Ambiguous, multiple interpretations possible
- 0-49: Very vague, needs significant clarification

Threshold for this session: ${threshold}%`;
}

function parseAnalysisResponse(responseText: string, threshold: number): IntentAnalysis {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    log("[Intent Gate] No JSON found in response, using heuristic fallback");
    throw new Error("No JSON in response");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    
    const analysis: IntentAnalysis = {
      confidence: typeof parsed.confidence === "number" ? Math.min(100, Math.max(0, parsed.confidence)) : 50,
      classification: ["clear", "ambiguous", "under-specified"].includes(parsed.classification) 
        ? parsed.classification 
        : parsed.confidence >= threshold ? "clear" : parsed.confidence >= 60 ? "ambiguous" : "under-specified",
      knownFactors: Array.isArray(parsed.knownFactors) ? parsed.knownFactors : [],
      ambiguities: Array.isArray(parsed.ambiguities) ? parsed.ambiguities : [],
      missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo : [],
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : [],
    };

    log("[Intent Gate] LLM analysis:", { confidence: analysis.confidence, classification: analysis.classification });
    return analysis;
  } catch (parseError) {
    log("[Intent Gate] JSON parse error:", parseError);
    throw new Error("Failed to parse JSON response");
  }
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
