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
    const { sessionId, healthCheckMetrics } = body;
    
    // Store healthCheckMetrics for use in prompt
    const metrics = healthCheckMetrics || {};

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        summary: 'No session ID',
        keyFindings: [],
        recommendations: [],
        riskAreas: [],
      }, { status: 400 });
    }

    // Extract counts from health check metrics (from Vision API)
    const strengthsCount = healthCheckMetrics?.strengths;
    const opportunitiesCount = healthCheckMetrics?.areasOfOpportunities;
    const actionsCount = healthCheckMetrics?.actionsRequired;
    
    // Calculate potential performance improvement
    const actionImpactPerItem = 2.5; // 2.5% per action
    const opportunityImpactPerItem = 1.2; // 1.2% per opportunity
    const actionImprovement = (actionsCount ?? 0) * actionImpactPerItem;
    const opportunityImprovement = (opportunitiesCount ?? 0) * opportunityImpactPerItem;
    const totalPotentialImprovement = Math.min(actionImprovement + opportunityImprovement, 50); // Cap at 50%
    
    console.log('[Summarize] Health Check Metrics:', {
      strengths: strengthsCount,
      opportunities: opportunitiesCount,
      actions: actionsCount,
      potentialImprovement: totalPotentialImprovement,
    });

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

    // Build prompt with exact counts from Health Check metrics
    let countsInstruction = '';
    if (strengthsCount || opportunitiesCount || actionsCount) {
      countsInstruction = `\n\nIMPORTANT - EXACT COUNTS REQUIRED:
The Health Check Report's pie chart shows these exact numbers:
${strengthsCount ? `- STRENGTHS: ${strengthsCount} checks passed as strengths` : ''}
${opportunitiesCount ? `- OPPORTUNITIES: ${opportunitiesCount} checks identified as areas for improvement` : ''}
${actionsCount ? `- ACTIONS REQUIRED: ${actionsCount} checks need immediate attention` : ''}

You MUST generate EXACTLY these numbers of items in each section:
${strengthsCount ? `- **KEY_FINDINGS** section: Generate EXACTLY ${strengthsCount} strength points` : '- **KEY_FINDINGS** section: List important positive findings'}
${opportunitiesCount ? `- **RISK_AREAS** section: Generate EXACTLY ${opportunitiesCount} opportunity points` : '- **RISK_AREAS** section: List issues and areas needing attention'}
${actionsCount ? `- **RECOMMENDATIONS** section: Generate EXACTLY ${actionsCount} action items` : '- **RECOMMENDATIONS** section: List actionable recommendations'}

Do NOT generate more or fewer items. Match the exact counts from the Health Check metrics.`;
    }

    // Comprehensive summary prompt
    const prompt = `You are analyzing a Contentstack Health Check Report for a client. Provide a COMPREHENSIVE summary that gives a clear picture of their stack's health.

INSTRUCTIONS:
- Be thorough - the client should understand their stack's status after reading this
- Include specific numbers, metrics, and data points from the report
- Highlight both strengths and areas needing improvement
- Make it actionable and easy to understand${countsInstruction}

FORMAT YOUR RESPONSE EXACTLY AS:

**FEEDBACK**
CRITICAL: You MUST format your response as BULLET POINTS. Each point must start with "- " on a new line. DO NOT write paragraphs.

Format your response EXACTLY like this:
- [First bullet point here]
- [Second bullet point here]
- [Third bullet point here]

Write 8-15 meaningful bullet points covering:
- Acknowledge their stack and organization by name
- Provide encouraging words about their current state and strengths (mention specific strengths count: ${strengthsCount || 0})
- Discuss the current health status: "Out of ${metrics.totalChecks || 0} total checks, ${metrics.performedChecks || 0} were performed, with ${strengthsCount || 0} areas showing as strengths"
- Include SPECIFIC PERFORMANCE METRICS: "By addressing the ${actionsCount || 0} actions required and ${opportunitiesCount || 0} opportunities, you can potentially improve your stack performance by approximately ${Math.round(totalPotentialImprovement)}%"
- Break down the improvement in detail: "Addressing the ${actionsCount || 0} critical actions could contribute ~${Math.round(actionImprovement)}% improvement, while optimizing the ${opportunitiesCount || 0} opportunity areas could add ~${Math.round(opportunityImprovement)}% enhancement"
- Explain what these improvements mean in practical terms (e.g., faster content delivery, better security, reduced maintenance overhead, improved team productivity)
- Highlight the value and ROI of addressing the recommendations
- Mention specific benefits: efficiency gains, security improvements, cost savings, scalability enhancements
- Provide context about what good stack health means
- Be professional, supportive, and action-oriented
- Address them directly as the stack owner
- Make it motivating and clear about the benefits
- Include a forward-looking statement about the potential after improvements
- Each bullet point should be meaningful, specific, and actionable
- Use clear, concise language for each point]

**KEY_FINDINGS**
${strengthsCount ? `- [Generate EXACTLY ${strengthsCount} strength points - what's working well, well-configured areas, positive findings]` : '- [List 8-12 important findings - be specific with numbers and details]'}
- Be specific with numbers and details
- Focus on what's configured correctly and working well
- Prioritize by importance

**RISK_AREAS**
${opportunitiesCount ? `- [Generate EXACTLY ${opportunitiesCount} opportunity points - areas that can be improved, optimization opportunities]` : '- [List ALL issues, problems, or areas needing attention]'}
- Include severity level if apparent
- Be specific about what can be improved
- Focus on areas with potential for enhancement

**RECOMMENDATIONS**
${actionsCount ? `- [Generate EXACTLY ${actionsCount} action items - specific things that need immediate attention or fixing]` : '- [List 8-12 actionable recommendations]'}
- Prioritize by impact and urgency
- Be specific about what to do
- Focus on critical items requiring action

HEALTH CHECK REPORT TO ANALYZE:
${reportText}`;

    // Call Gemini
    console.log('[Summarize] Calling Gemini...');
    const gemini = getGeminiClient();
    const response = await gemini.generate({
      prompt,
      maxTokens: 8000, // Increased for more detailed feedback
    });

    if (!response.success) {
      throw new Error(response.error || 'Gemini API failed');
    }

    console.log(`[Summarize] Got response: ${response.text.length} chars`);

    // Parse the response with exact counts
    const parsed = parseGeminiSummary(
      response.text,
      strengthsCount,
      opportunitiesCount,
      actionsCount
    );

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
 * @param text - The response text from Gemini
 * @param exactStrengthsCount - Exact number of strengths to extract (from Health Check)
 * @param exactOpportunitiesCount - Exact number of opportunities to extract (from Health Check)
 * @param exactActionsCount - Exact number of actions to extract (from Health Check)
 */
function parseGeminiSummary(
  text: string,
  exactStrengthsCount?: number,
  exactOpportunitiesCount?: number,
  exactActionsCount?: number
): {
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
    // Extract Client Feedback and convert to bullet points
    const feedbackMatch = text.match(/\*\*CLIENT_FEEDBACK\*\*\s*([\s\S]*?)(?=\*\*KEY_FINDINGS|\*\*RISK_AREAS|\*\*RECOMMENDATIONS|$)/i);
    if (feedbackMatch) {
      const feedbackText = feedbackMatch[1].trim();
      // Extract bullet points from feedback
      let summaryBullets = extractBulletPoints(feedbackText);
      
      // If no bullets found, convert paragraphs to bullet points
      if (summaryBullets.length === 0) {
        // Try to split by double newlines (paragraphs) first
        const paragraphs = feedbackText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        if (paragraphs.length > 1) {
          // Each paragraph becomes a bullet point
          summaryBullets = paragraphs.map(p => cleanText(p.trim())).filter(p => p.length > 0);
        } else {
          // Split by sentences and filter meaningful ones
          const sentences = feedbackText
            .split(/[.!?]+/)
            .map(s => cleanText(s.trim()))
            .filter(s => s.length > 30 && s.length < 500); // Meaningful sentence length
          
          if (sentences.length > 0) {
            summaryBullets = sentences;
          } else {
            // Last resort: split by single newlines or use as-is
            const lines = feedbackText.split('\n').filter(l => l.trim().length > 20);
            summaryBullets = lines.length > 1 ? lines.map(l => cleanText(l.trim())) : [cleanText(feedbackText)];
          }
        }
      }
      
      // Store as array of bullet points joined by newlines
      summary = summaryBullets.join('\n');
    }

    // Extract Key Findings (Strengths)
    const findingsMatch = text.match(/\*\*KEY_FINDINGS\*\*\s*([\s\S]*?)(?=\*\*RISK_AREAS|\*\*RECOMMENDATIONS|$)/i);
    if (findingsMatch) {
      const items = extractBulletPoints(findingsMatch[1]);
      keyFindings.push(...items);
    }

    // Extract Risk Areas (Opportunities)
    const risksMatch = text.match(/\*\*RISK_AREAS\*\*\s*([\s\S]*?)(?=\*\*RECOMMENDATIONS|$)/i);
    if (risksMatch) {
      const items = extractBulletPoints(risksMatch[1]);
      riskAreas.push(...items);
    }

    // Extract Recommendations (Actions Required)
    const recsMatch = text.match(/\*\*RECOMMENDATIONS\*\*\s*([\s\S]*?)$/i);
    if (recsMatch) {
      const items = extractBulletPoints(recsMatch[1]);
      recommendations.push(...items);
    }

    // Fallback: if no structured output, convert the whole response to bullet points
    if (!summary) {
      const fallbackText = text.substring(0, 2000);
      // Try to convert to bullet points
      const fallbackBullets = extractBulletPoints(fallbackText);
      if (fallbackBullets.length > 0) {
        summary = fallbackBullets.join('\n');
      } else {
        // Split by sentences
        const sentences = fallbackText
          .split(/[.!?]+/)
          .map(s => cleanText(s.trim()))
          .filter(s => s.length > 30 && s.length < 500);
        summary = sentences.length > 0 ? sentences.join('\n') : fallbackText;
      }
    }

  } catch (e) {
    console.error('[Parse] Error:', e);
    // Even in error case, try to convert to bullet points
    const errorBullets = extractBulletPoints(text);
    summary = errorBullets.length > 0 ? errorBullets.join('\n') : text;
  }

  // Ensure summary is always in bullet point format (split by newlines)
  // If summary doesn't have newlines, try to split it into meaningful points
  if (summary && !summary.includes('\n')) {
    const sentences = summary
      .split(/[.!?]+/)
      .map(s => cleanText(s.trim()))
      .filter(s => s.length > 30 && s.length < 500);
    if (sentences.length > 1) {
      summary = sentences.join('\n');
    }
  }

  // Clean and deduplicate, then apply exact counts if provided
  const cleanedFindings = [...new Set(keyFindings)].filter(f => f.length > 5);
  const cleanedRisks = [...new Set(riskAreas)].filter(r => r.length > 5);
  const cleanedRecs = [...new Set(recommendations)].filter(r => r.length > 5);

  // Apply exact counts from Health Check metrics
  const finalFindings = exactStrengthsCount 
    ? cleanedFindings.slice(0, exactStrengthsCount)
    : cleanedFindings.slice(0, 30);
  
  const finalRisks = exactOpportunitiesCount
    ? cleanedRisks.slice(0, exactOpportunitiesCount)
    : cleanedRisks.slice(0, 30);
  
  const finalRecs = exactActionsCount
    ? cleanedRecs.slice(0, exactActionsCount)
    : cleanedRecs.slice(0, 20);

  console.log('[Parse] Final counts:', {
    strengths: finalFindings.length,
    opportunities: finalRisks.length,
    actions: finalRecs.length,
    summaryPoints: summary.split('\n').filter(l => l.trim().length > 0).length,
    requested: {
      strengths: exactStrengthsCount,
      opportunities: exactOpportunitiesCount,
      actions: exactActionsCount,
    },
  });

  return {
    summary: summary, // Keep as newline-separated string for display
    keyFindings: finalFindings,
    recommendations: finalRecs,
    riskAreas: finalRisks,
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
    
    // Match bullet points or numbered lists (more flexible patterns)
    const match = trimmed.match(/^[-•*►▪▫]\s*(.+)/) 
      || trimmed.match(/^\d+[.)]\s*(.+)/)
      || trimmed.match(/^[a-z][.)]\s*(.+)/i);
    
    if (match) {
      const cleaned = cleanText(match[1]);
      if (cleaned.length > 10) { // Only add meaningful points
        items.push(cleaned);
      }
    } else if (trimmed.length > 30 && trimmed.length < 500) {
      // If line doesn't match bullet pattern but is a meaningful sentence, include it
      // This handles cases where Gemini returns text without bullet markers
      const cleaned = cleanText(trimmed);
      if (cleaned.length > 10) {
        items.push(cleaned);
      }
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
