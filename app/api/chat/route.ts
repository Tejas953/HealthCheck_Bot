/**
 * API Route: /api/chat
 * Handles Q&A using Gemini with 3-step processing:
 * 1. Custom Q&A (semantic + keyword matching)
 * 2. Report-based answers
 * 3. Contentstack knowledge base
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReportStore } from '@/lib/reportStore';
import { getGeminiClient } from '@/lib/gemini';
import { findCustomAnswer } from '@/lib/customQA';
import { getContentstackKnowledge, parseResponseWithSuggestions } from '@/lib/contentstackKB';
import { ChatResponse, AnswerSource } from '@/utils/types';

// ============== CONSTANTS ==============

// Phrases that indicate the answer was NOT found in the report
// When detected, we redirect to Gemini AI for a general answer
const NOT_FOUND_PHRASES = [
  'not available in the',
  'not mentioned in the',
  'not found in the',
  'no information about',
  'does not contain',
  'not covered in',
  "doesn't contain",
  'does not include',
  'this information is not available',
  'information is not available',
  'not present in the report',
  'not included in the report',
  'not specified in the',
  'cannot find',
  "can't find",
  'no data about',
  'no details about',
  'not addressed in',
  'not provided in',
  'outside the scope',
  'beyond the scope',
  'report does not',
  "report doesn't",
  'not in the health check',
  'unable to find',
  'no mention of',
  'is not covered',
  'is not available',
  'was not found',
  'could not find',
  "couldn't find",
  'does not have information',
  "doesn't have information",
  'lacks information',
  'missing from the report',
  'absent from the report',
];

// ============== MAIN POST HANDLER ==============

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    const body = await request.json();
    const { sessionId, query, conversationHistory = [] } = body;

    console.log(`[Chat] Question: "${query}"`);

    // Validate inputs
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        answer: 'Please upload a health check report first.',
        citations: [],
        isGrounded: false,
      }, { status: 400 });
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({
        success: false,
        answer: 'Please ask a question about the health check report.',
        citations: [],
        isGrounded: false,
      }, { status: 400 });
    }

    const gemini = getGeminiClient();

    // ========== STEP 1: CHECK CUSTOM Q&A ==========
    console.log('[Chat] Step 1: Checking custom Q&A...');
    const customResult = await findCustomAnswer(query, gemini);
    
    if (customResult.qa) {
      console.log(`[Chat] Custom answer found (${customResult.method})`);
      return NextResponse.json({
        success: true,
        answer: customResult.qa.answer,
        citations: [],
        isGrounded: false,
        suggestedQuestions: customResult.qa.suggestedQuestions || [],
        source: 'custom' as AnswerSource,
      });
    }

    // ========== STEP 2: CHECK IN REPORT ==========
    console.log('[Chat] Step 2: Searching in report...');
    
    const reportStore = getReportStore();
    const report = reportStore.get(sessionId);

    if (!report) {
      return NextResponse.json({
        success: false,
        answer: 'Session expired. Please upload the health check report again.',
        citations: [],
        isGrounded: false,
      }, { status: 404 });
    }

    // Build conversation context
    const conversationContext = conversationHistory
      .map((msg: { role: string; content: string }) => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      )
      .join('\n');

    // Generate answer from report
    const reportPrompt = buildReportPrompt(report.rawText, query, conversationContext);
    const response = await gemini.generate({ prompt: reportPrompt, maxTokens: 3000 }); // Balanced responses

    if (!response.success) {
      throw new Error(response.error || 'Gemini API failed');
    }

    console.log(`[Chat] Answer generated: ${response.text.length} chars`);

    let { answer, suggestedQuestions } = parseResponseWithSuggestions(response.text);
    
    // Check if answer was found in report
    const answerLower = answer.toLowerCase();
    const matchedPhrase = NOT_FOUND_PHRASES.find(phrase => answerLower.includes(phrase));
    const isGrounded = !matchedPhrase;

    let source: AnswerSource = 'report';

    // ========== STEP 3: ANSWER NOT IN REPORT - REDIRECT TO GEMINI ==========
    if (!isGrounded) {
      console.log(`[Chat] Step 3: Answer NOT in report (matched: "${matchedPhrase}")`);
      console.log('[Chat] Redirecting to Gemini AI for general knowledge answer...');
      
      // Completely redirect to Gemini - don't show "not in report" message
      const kbResult = await getContentstackKnowledge(gemini, query, conversationContext);
      
      // Always use Gemini response (replace the "not found" answer completely)
      answer = kbResult.answer;
      suggestedQuestions = kbResult.suggestedQuestions;
      source = 'contentstack_knowledge';
      
      console.log('[Chat] Gemini response received - showing to user');
    }

    console.log(`[Chat] Done. Source: ${source}`);

    return NextResponse.json({
      success: true,
      answer,
      citations: [],
      isGrounded: source === 'report',
      suggestedQuestions,
      source,
    });

  } catch (error) {
    console.error('[Chat] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      answer: `Sorry, I encountered an error. Please try again. (${errorMessage})`,
      citations: [],
      isGrounded: false,
    }, { status: 500 });
  }
}

// ============== HELPER FUNCTIONS ==============

// Max characters for report text (balance between context and speed)
const MAX_REPORT_LENGTH = 30000; // ~7,500 words - keeps response fast

/**
 * Truncate report text if too long
 */
function truncateReport(text: string): string {
  if (text.length <= MAX_REPORT_LENGTH) return text;
  console.log(`[Chat] Truncating report from ${text.length} to ${MAX_REPORT_LENGTH} chars for faster processing`);
  return text.substring(0, MAX_REPORT_LENGTH) + '\n\n[... Report truncated ...]';
}

/**
 * Build the prompt for report-based Q&A
 */
function buildReportPrompt(reportText: string, query: string, conversationContext: string): string {
  const truncatedReport = truncateReport(reportText);
  
  return `You are a Contentstack Solution Architect assistant helping a CLIENT who owns this stack.

RESPONSE STYLE:
- Be PRECISE and CONCISE - answer exactly what was asked
- Match answer length to question complexity (simple question = short answer, complex = detailed)
- Use bullet points for clarity
- Easy to read and understand
- No unnecessary filler or repetition
- If NOT in report: "This information is not available in the health check report."

REPORT:
${truncatedReport}

${conversationContext ? `Context: ${conversationContext}\n` : ''}
Question: ${query}

Give a clear, sufficient answer. End with 2-3 follow-up questions:

SUGGESTED_QUESTIONS:
- [Question 1]
- [Question 2]
- [Question 3]`;
}

// ============== GET HANDLER ==============

/**
 * Check session status
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  const reportStore = getReportStore();
  const report = reportStore.get(sessionId);

  if (!report) {
    return NextResponse.json({ active: false, message: 'Session not found' });
  }

  return NextResponse.json({
    active: true,
    filename: report.filename,
    uploadedAt: report.uploadedAt,
  });
}
