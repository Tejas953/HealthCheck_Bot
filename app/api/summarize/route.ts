/**
 * API Route: /api/summarize
 * Uses Gemini to summarize the report section by section
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReportStore } from '@/lib/reportStore';
import { getGeminiClient } from '@/lib/gemini';
import { SummarizeResponse } from '@/utils/types';

export async function POST(request: NextRequest): Promise<NextResponse<SummarizeResponse>> {
  console.log('[Summarize] Starting...');
  
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        summary: 'No session ID',
        keyFindings: [],
        recommendations: [],
        riskAreas: [],
      }, { status: 400 });
    }

    // Get stored report
    const reportStore = getReportStore();
    const report = reportStore.get(sessionId);

    if (!report) {
      return NextResponse.json({
        success: false,
        summary: 'Please upload a report first.',
        keyFindings: [],
        recommendations: [],
        riskAreas: [],
      }, { status: 404 });
    }

    console.log(`[Summarize] Found report with ${report.rawText.length} characters`);

    // Truncate report if too long (for faster processing)
    const MAX_REPORT_LENGTH = 60000;
    let reportText = report.rawText;
    if (reportText.length > MAX_REPORT_LENGTH) {
      console.log(`[Summarize] Truncating report from ${reportText.length} to ${MAX_REPORT_LENGTH} chars`);
      reportText = reportText.substring(0, MAX_REPORT_LENGTH) + '\n[... truncated ...]';
    }

    // Comprehensive summary prompt
    const prompt = `You are analyzing a Contentstack Health Check Report for a client. Provide a COMPREHENSIVE summary that gives a clear picture of their stack's health.

INSTRUCTIONS:
- Be thorough - the client should understand their stack's status after reading this
- Include specific numbers, metrics, and data points from the report
- Highlight both strengths and areas needing improvement
- Make it actionable and easy to understand

FORMAT YOUR RESPONSE EXACTLY AS:

**OVERVIEW**
[4-5 sentences giving a complete high-level summary: What is the overall health? What stack is this? Key metrics? Overall impression?]

**SECTION-BY-SECTION ANALYSIS**

For EACH section in the report, provide:
**[Section Name]**
- What was analyzed
- Key findings with specific data/numbers
- Status (Good/Needs Attention/Critical)
---

**KEY_FINDINGS**
- [List 8-12 important findings - be specific with numbers and details]
- Include both positive findings and concerns
- Prioritize by importance

**RISK_AREAS**
- [List ALL issues, problems, or areas needing attention]
- Include severity level if apparent
- Be specific about what's wrong

**RECOMMENDATIONS**
- [List 8-12 actionable recommendations]
- Prioritize by impact
- Be specific about what to do

HEALTH CHECK REPORT TO ANALYZE:
${reportText}`;

    // Call Gemini
    console.log('[Summarize] Calling Gemini...');
    const gemini = getGeminiClient();
    const response = await gemini.generate({
      prompt,
      maxTokens: 6000, // Increased for comprehensive summary
    });

    if (!response.success) {
      throw new Error(response.error || 'Gemini API failed');
    }

    console.log(`[Summarize] Got response: ${response.text.length} chars`);

    // Parse the response
    const parsed = parseGeminiSummary(response.text);

    return NextResponse.json({
      success: true,
      ...parsed,
    });

  } catch (error) {
    console.error('[Summarize] Error:', error);
    return NextResponse.json({
      success: false,
      summary: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      keyFindings: [],
      recommendations: [],
      riskAreas: [],
    }, { status: 500 });
  }
}

/**
 * Parse Gemini's summary response
 */
function parseGeminiSummary(text: string): {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  riskAreas: string[];
} {
  let summary = '';
  const keyFindings: string[] = [];
  const recommendations: string[] = [];
  const riskAreas: string[] = [];

  try {
    // Extract Overview
    const overviewMatch = text.match(/\*\*OVERVIEW\*\*\s*([\s\S]*?)(?=\*\*SECTION|$)/i);
    if (overviewMatch) {
      summary = overviewMatch[1].trim();
    }

    // Extract Section-by-Section Analysis and add to summary
    const sectionMatch = text.match(/\*\*SECTION-BY-SECTION ANALYSIS\*\*\s*([\s\S]*?)(?=\*\*KEY_FINDINGS|$)/i);
    if (sectionMatch) {
      summary += '\n\n' + sectionMatch[1].trim();
    }

    // Extract Key Findings
    const findingsMatch = text.match(/\*\*KEY_FINDINGS\*\*\s*([\s\S]*?)(?=\*\*RISK_AREAS|\*\*RECOMMENDATIONS|$)/i);
    if (findingsMatch) {
      const items = extractBulletPoints(findingsMatch[1]);
      keyFindings.push(...items);
    }

    // Extract Risk Areas
    const risksMatch = text.match(/\*\*RISK_AREAS\*\*\s*([\s\S]*?)(?=\*\*RECOMMENDATIONS|$)/i);
    if (risksMatch) {
      const items = extractBulletPoints(risksMatch[1]);
      riskAreas.push(...items);
    }

    // Extract Recommendations
    const recsMatch = text.match(/\*\*RECOMMENDATIONS\*\*\s*([\s\S]*?)$/i);
    if (recsMatch) {
      const items = extractBulletPoints(recsMatch[1]);
      recommendations.push(...items);
    }

    // Fallback: if no structured output, use the whole response as summary
    if (!summary) {
      summary = text.substring(0, 2000);
    }

  } catch (e) {
    console.error('[Parse] Error:', e);
    summary = text;
  }

  return {
    summary: cleanText(summary),
    keyFindings: [...new Set(keyFindings)].filter(f => f.length > 5).slice(0, 30),
    recommendations: [...new Set(recommendations)].filter(r => r.length > 5).slice(0, 20),
    riskAreas: [...new Set(riskAreas)].filter(r => r.length > 5).slice(0, 30),
  };
}

/**
 * Extract bullet points from text
 */
function extractBulletPoints(text: string): string[] {
  const items: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Match bullet points or numbered lists
    const match = trimmed.match(/^[-•*►]\s*(.+)/) || trimmed.match(/^\d+\.\s*(.+)/);
    if (match) {
      items.push(cleanText(match[1]));
    }
  }
  
  return items;
}

/**
 * Clean text
 */
function cleanText(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
}
