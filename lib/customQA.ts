/**
 * Custom Q&A Module
 * Handles custom question-answer pairs with semantic and keyword matching
 */

import { getGeminiClient } from './gemini';

// ============== TYPES ==============

export interface CustomQA {
  keywords: string[];           // Keywords to match (case-insensitive)
  question: string;             // Example question (for reference)
  answer: string;               // The answer to return
  suggestedQuestions?: string[]; // Optional follow-up questions
}

export interface CustomQAMatchResult {
  qa: CustomQA | null;
  method: 'semantic' | 'keyword' | 'none';
  confidence?: number;
}

// ============== CONFIGURATION ==============

export const SEMANTIC_CONFIG = {
  /** Enable/disable semantic matching (set to false to use only keyword matching) */
  ENABLE_SEMANTIC: false,  // Disabled - gemini-3-pro-preview doesn't support this well
  
  /** Minimum confidence score from AI to consider a match (0-100) */
  MIN_CONFIDENCE: 90,
  
  /** Fallback to keyword matching if semantic fails */
  FALLBACK_TO_KEYWORDS: true,
  
  /** Minimum keyword matches for fallback (if semantic is disabled or fails) */
  MIN_KEYWORD_MATCHES: 3,
};

// ============== CUSTOM Q&A DATA ==============
// Add your custom questions and answers here

export const CUSTOM_QA_LIST: CustomQA[] = [
  {
    keywords: ['pricing', 'cost', 'price', 'how much'],
    question: 'What is the pricing for Contentstack?',
    answer: `**Contentstack Pricing Information**

Contentstack offers flexible pricing tiers:

1. **Start** - For small teams getting started
2. **Grow** - For growing businesses
3. **Scale** - For enterprise-level needs
4. **Enterprise** - Custom solutions

For detailed pricing, please contact your Contentstack account manager or visit: https://www.contentstack.com/pricing

**Contact Sales:** https://www.contentstack.com/contact-sales`,
    suggestedQuestions: [
      'What features are included in each tier?',
      'How do I upgrade my plan?',
      'What is the difference between Scale and Enterprise?',
    ],
  },
  {
    keywords: ['support', 'help', 'contact', 'ticket'],
    question: 'How do I contact Contentstack support?',
    answer: `**Contentstack Support Options**

**For Technical Support:**
1. **Support Portal:** https://support.contentstack.com
2. **Email:** support@contentstack.com
3. **In-App Chat:** Click the chat icon in your Contentstack dashboard

**For Account/Billing:**
- Contact your Customer Success Manager
- Email: success@contentstack.com

**Documentation:**
- https://www.contentstack.com/docs

**Community:**
- https://community.contentstack.com`,
    suggestedQuestions: [
      'What are the support hours?',
      'How do I check my ticket status?',
      'Where can I find the documentation?',
    ],
  },
  {
    keywords: ['launch checklist', 'go live', 'production ready', 'deployment checklist'],
    question: 'What is the launch checklist for going live?',
    answer: `**Contentstack Launch Checklist**

**Before Go-Live:**

**Content Modeling**
- [ ] All content types finalized
- [ ] Global fields configured
- [ ] Validation rules in place
- [ ] Field descriptions added

**Security**
- [ ] API keys rotated
- [ ] Roles & permissions configured
- [ ] Delivery tokens for production only

**Performance**
- [ ] CDN enabled
- [ ] Image optimization configured
- [ ] Caching strategy defined

**Workflows**
- [ ] Publishing workflows set up
- [ ] Approval processes configured

**Integrations**
- [ ] Webhooks tested
- [ ] Third-party integrations verified

**Full Guide:** https://www.contentstack.com/docs/developers/launch-checklist`,
    suggestedQuestions: [
      'How do I configure CDN?',
      'What security best practices should I follow?',
      'How do I set up staging vs production environments?',
    ],
  },
  {
    keywords: ['healthcheck', 'app', 'health check'],
    question: 'What is the health check app?',
    answer: `The health check app is a tool that helps you analyze the health of your Contentstack stack. It is a web application that provides insights into your stack configuration, content modeling, and best practices.`,
    suggestedQuestions: [
      'How do I use the health check app?',
      'What insights does the health check provide?',
      'How often should I run a health check?',
    ],
  },
  {
    keywords: ['name', 'tejas', 'role', 'designation'],
    question: 'Who is Tejas?',
    answer: `Tejas is an Associate Software Engineer at Contentstack. He is an expert in Contentstack and has a deep understanding of the Contentstack platform.`,
  },
  // ===== ADD MORE CUSTOM Q&A ABOVE THIS LINE =====
];

// ============== MATCHING FUNCTIONS ==============

/**
 * Use AI to semantically match user query against custom Q&A
 */
async function findSemanticMatch(
  query: string,
  gemini: ReturnType<typeof getGeminiClient>
): Promise<{ matchIndex: number; confidence: number; reasoning: string }> {
  
  const questionList = CUSTOM_QA_LIST.map((qa, index) => 
    `${index + 1}. "${qa.question}" [Keywords: ${qa.keywords.join(', ')}]`
  ).join('\n');

  const prompt = `You are a semantic question matcher. Your task is to determine if the USER'S QUESTION has the same meaning or intent as any of the PREDEFINED QUESTIONS below.

PREDEFINED QUESTIONS:
${questionList}

USER'S QUESTION: "${query}"

INSTRUCTIONS:
1. Analyze the semantic meaning and intent of the user's question
2. Compare it against each predefined question
3. Consider synonyms, paraphrasing, and different ways of asking the same thing
4. A match should be based on MEANING, not exact words

Examples of semantic matches:
- "How much does it cost?" matches "What is the pricing for Contentstack?"
- "Tell me about Tejas" matches "Who is Tejas?"
- "I need help" matches "How do I contact Contentstack support?"
- "Getting ready to launch" matches "What is the launch checklist for going live?"

RESPOND IN THIS EXACT JSON FORMAT (no markdown, just JSON):
{
  "matchFound": true or false,
  "matchIndex": number (1-based index of matching question, or 0 if no match),
  "confidence": number (0-100, how confident you are in the match),
  "reasoning": "brief explanation of why this is or isn't a match"
}`;

  try {
    console.log(`[Semantic] Analyzing query: "${query}"`);
    
    // Use skipRetry=true since semantic matching is not critical
    // Falls back to keyword matching if this fails
    const response = await gemini.generate({
      prompt,
      maxTokens: 256,
    }, true); // skipRetry = true for non-critical semantic matching

    if (!response.success) {
      console.log('[Semantic] Gemini call failed (non-critical):', response.error);
      return { matchIndex: -1, confidence: 0, reasoning: 'AI call failed - using keyword fallback' };
    }

    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Semantic] Could not parse JSON from response:', response.text);
      return { matchIndex: -1, confidence: 0, reasoning: 'Could not parse response' };
    }

    const result = JSON.parse(jsonMatch[0]);
    
    console.log(`[Semantic] AI Analysis:`, {
      matchFound: result.matchFound,
      matchIndex: result.matchIndex,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });

    if (result.matchFound && result.matchIndex > 0 && result.confidence >= SEMANTIC_CONFIG.MIN_CONFIDENCE) {
      return {
        matchIndex: result.matchIndex - 1, // Convert to 0-based
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
    }

    return {
      matchIndex: -1,
      confidence: result.confidence || 0,
      reasoning: result.reasoning || 'No semantic match found',
    };

  } catch (error) {
    console.error('[Semantic] Error during semantic matching:', error);
    return { matchIndex: -1, confidence: 0, reasoning: 'Error during analysis' };
  }
}

/**
 * Quick keyword-based matching (fallback)
 */
function findKeywordMatch(query: string): CustomQA | null {
  const queryLower = query.toLowerCase();
  
  for (const qa of CUSTOM_QA_LIST) {
    const keywordMatches = qa.keywords.filter(keyword => 
      queryLower.includes(keyword.toLowerCase())
    ).length;
    
    if (keywordMatches >= SEMANTIC_CONFIG.MIN_KEYWORD_MATCHES) {
      console.log(`[Keyword] Match found for: ${qa.keywords.join(', ')}`);
      return qa;
    }
  }
  
  return null;
}

/**
 * Main function to find custom answer
 * Uses semantic matching first, then falls back to keyword matching
 */
export async function findCustomAnswer(
  query: string,
  gemini: ReturnType<typeof getGeminiClient>
): Promise<CustomQAMatchResult> {
  
  if (CUSTOM_QA_LIST.length === 0) {
    return { qa: null, method: 'none' };
  }

  // Try semantic matching first
  if (SEMANTIC_CONFIG.ENABLE_SEMANTIC) {
    console.log('[CustomQA] Using AI semantic matching...');
    
    const semanticResult = await findSemanticMatch(query, gemini);
    
    if (semanticResult.matchIndex >= 0 && semanticResult.matchIndex < CUSTOM_QA_LIST.length) {
      const matchedQA = CUSTOM_QA_LIST[semanticResult.matchIndex];
      console.log(`[CustomQA] Semantic match found: "${matchedQA.question}" (${semanticResult.confidence}%)`);
      return {
        qa: matchedQA,
        method: 'semantic',
        confidence: semanticResult.confidence,
      };
    }
    
    console.log(`[CustomQA] No semantic match (${semanticResult.confidence}%)`);
  }

  // Fallback to keyword matching
  if (SEMANTIC_CONFIG.FALLBACK_TO_KEYWORDS) {
    console.log('[CustomQA] Trying keyword matching...');
    const keywordMatch = findKeywordMatch(query);
    
    if (keywordMatch) {
      console.log(`[CustomQA] Keyword match found: "${keywordMatch.question}"`);
      return { qa: keywordMatch, method: 'keyword' };
    }
  }

  console.log('[CustomQA] No match found');
  return { qa: null, method: 'none' };
}

