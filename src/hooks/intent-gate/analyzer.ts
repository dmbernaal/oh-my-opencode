import { getSessionConfiguration } from "../scenario-detector";

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
  client: any
): Promise<IntentAnalysis> {
  const sessionConfig = getSessionConfiguration();
  const threshold = sessionConfig?.confidenceThreshold || 80;

  const analysisPrompt = `You are an intent analyzer for a development AI system. Your job is to determine if a user's request is clear enough to proceed with implementation.

User Request: "${userRequest}"

Project Context:
${JSON.stringify(projectContext, null, 2)}

Analyze this request and provide:
1. Confidence score (0-100) - how clear and actionable is this request?
2. Classification: "clear", "ambiguous", or "under-specified"
3. Known factors: What do we know for sure from the request?
4. Ambiguities: What could be interpreted multiple ways?
5. Missing info: What critical information is missing?
6. Suggested questions: If confidence is low, what should we ask?

Factors that INCREASE confidence:
- Specific technical terms
- References to existing files/code
- Clear acceptance criteria
- Explicit constraints
- Mentions specific scope

Factors that DECREASE confidence:
- Vague terms ("make it better", "add filtering", "improve")
- Multiple possible interpretations
- No scope boundaries
- Missing critical details (where, how, for whom)

Respond in JSON format:
{
  "confidence": <number 0-100>,
  "classification": "<clear|ambiguous|under-specified>",
  "knownFactors": ["<factor1>", "<factor2>"],
  "ambiguities": ["<ambiguity1>", "<ambiguity2>"],
  "missingInfo": ["<missing1>", "<missing2>"],
  "suggestedQuestions": ["<question1>", "<question2>"]
}`;

  try {
    const response = await client.chat.completions.create({
      model: "google/gemini-3.0-flash",
      messages: [
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return createFallbackAnalysis(userRequest, threshold);
    }

    const parsed = JSON.parse(content);

    return {
      confidence: parsed.confidence || 50,
      classification: parsed.classification || "ambiguous",
      knownFactors: parsed.knownFactors || [],
      ambiguities: parsed.ambiguities || [],
      missingInfo: parsed.missingInfo || [],
      suggestedQuestions: parsed.suggestedQuestions || [],
    };
  } catch (error) {
    console.error("Intent analysis failed:", error);
    return createFallbackAnalysis(userRequest, threshold);
  }
}

function createFallbackAnalysis(userRequest: string, threshold: number): IntentAnalysis {
  const requestLower = userRequest.toLowerCase();
  
  const vagueTerms = ["better", "improve", "fix", "add", "update", "change"];
  const hasVagueTerms = vagueTerms.some((term) => requestLower.includes(term));
  
  const hasSpecifics = /\b(file|line|function|component|class|method)\b/i.test(userRequest);
  
  let confidence = 50;
  if (hasSpecifics) confidence += 20;
  if (!hasVagueTerms) confidence += 15;
  if (userRequest.length > 50) confidence += 10;
  
  const classification = confidence >= threshold ? "clear" : confidence >= 60 ? "ambiguous" : "under-specified";

  return {
    confidence,
    classification,
    knownFactors: hasSpecifics ? ["Request mentions specific code elements"] : [],
    ambiguities: hasVagueTerms ? ["Request uses vague terms that could mean different things"] : [],
    missingInfo: !hasSpecifics ? ["No specific files or code elements mentioned"] : [],
    suggestedQuestions: classification !== "clear" ? ["Can you be more specific about what you want to change?"] : [],
  };
}
