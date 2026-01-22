/**
 * General Knowledge Module
 * When answer is NOT found in the report, redirects to Gemini for answers
 * Works as a general-purpose AI assistant for any question
 */

import { getGeminiClient } from './gemini';

// ============== TYPES ==============

export interface ContentstackKnowledgeResult {
  isContentstackRelated: boolean;
  answer: string;
  suggestedQuestions: string[];
}

/**
 * Parse response to extract answer and suggested questions
 */
export function parseResponseWithSuggestions(responseText: string): {
  answer: string;
  suggestedQuestions: string[];
} {
  const suggestedQuestions: string[] = [];
  let answer = responseText;

  const suggestionsMatch = responseText.match(/SUGGESTED_QUESTIONS:\s*([\s\S]*?)$/i);
  
  if (suggestionsMatch) {
    answer = responseText.replace(/\n*SUGGESTED_QUESTIONS:\s*[\s\S]*$/i, '').trim();
    
    const questionsText = suggestionsMatch[1];
    const lines = questionsText.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const match = trimmed.match(/^[-•*►]\s*(.+)/) || trimmed.match(/^\d+\.\s*(.+)/);
      if (match) {
        const question = match[1].trim();
        const cleanQuestion = question.replace(/\*\*/g, '').replace(/\[|\]/g, '').trim();
        if (cleanQuestion.length > 5 && cleanQuestion.length < 150) {
          suggestedQuestions.push(cleanQuestion);
        }
      }
    }
  }

  return {
    answer,
    suggestedQuestions: suggestedQuestions.slice(0, 4),
  };
}

// ============== MAIN FUNCTION ==============

/**
 * Redirect to Gemini when answer is not found in report
 * Works as a general-purpose AI assistant for any question
 */
export async function getContentstackKnowledge(
  gemini: ReturnType<typeof getGeminiClient>,
  query: string,
  conversationContext: string
): Promise<ContentstackKnowledgeResult> {
  
  console.log(`[Gemini Assistant] Question not in report, asking Gemini: "${query}"`);
  
  // Prompt for balanced, precise answers
  const prompt = `You are a helpful AI assistant. The person asking is a Contentstack client.

RESPONSE STYLE:
- Be PRECISE and CONCISE - answer exactly what was asked
- Match answer length to question complexity (simple = short, complex = detailed)
- Use bullet points for clarity when helpful
- Easy to read and understand
- No unnecessary filler or repetition
- For Contentstack questions: include navigation paths if relevant

${conversationContext ? `Context: ${conversationContext}\n` : ''}
Question: ${query}

Start with "**Gemini AI:**" then give a clear, sufficient answer. End with 2-3 follow-up questions:

SUGGESTED_QUESTIONS:
- [Question 1]
- [Question 2]
- [Question 3]`;

  try {
    const response = await gemini.generate({
      prompt,
      maxTokens: 3000, // Balanced responses
    });

    if (!response.success) {
      console.error('[Gemini Assistant] Gemini call failed:', response.error);
      return {
        isContentstackRelated: false,
        answer: 'Sorry, I could not get an answer from Gemini. Please try again.',
        suggestedQuestions: [
          'What are the main findings from my report?',
          'Can you summarize the key points?',
          'What recommendations do you have?',
        ],
      };
    }

    const { answer, suggestedQuestions } = parseResponseWithSuggestions(response.text);
    
    console.log(`[Gemini Assistant] Response received: ${answer.length} characters`);

    return {
      isContentstackRelated: true,
      answer,
      suggestedQuestions,
    };
    
  } catch (error) {
    console.error('[Gemini Assistant] Error:', error);
    return {
      isContentstackRelated: false,
      answer: 'Sorry, something went wrong. Please try again.',
      suggestedQuestions: [],
    };
  }
}
