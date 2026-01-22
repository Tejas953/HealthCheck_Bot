'use client';

import React, { useState } from 'react';
import { 
  FileText,
  AlertTriangle, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Target,
  Copy,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface SummaryProps {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  riskAreas: string[];
  isLoading: boolean;
  error?: string;
}

export default function Summary({
  summary,
  keyFindings,
  recommendations,
  riskAreas,
  isLoading,
  error,
}: SummaryProps) {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    findings: true,
    risks: true,
    actions: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCopy = async () => {
    const text = `
HEALTH CHECK SUMMARY
====================

${summary}

KEY FINDINGS:
${keyFindings.map(f => `• ${f}`).join('\n')}

ISSUES & RISKS:
${riskAreas.map(r => `• ${r}`).join('\n')}

RECOMMENDATIONS:
${recommendations.map(r => `• ${r}`).join('\n')}
    `.trim();
    
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-8 h-full flex items-center justify-center border border-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Analyzing Report...</h3>
          <p className="text-gray-400">This may take a moment</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gray-900 rounded-2xl p-8 h-full border border-gray-800">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Analysis Failed</h3>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!summary) {
    return (
      <div className="bg-gray-900 rounded-2xl p-8 h-full flex items-center justify-center border border-gray-800">
        <div className="text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Waiting for report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Report Analysis</h2>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 p-4 border-b border-gray-800 bg-gray-800/50">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">{keyFindings.length}</div>
          <div className="text-xs text-gray-400">Findings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400">{riskAreas.length}</div>
          <div className="text-xs text-gray-400">Issues</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-400">{recommendations.length}</div>
          <div className="text-xs text-gray-400">Actions</div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Overview Section */}
        <div className="bg-gray-800/50 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('overview')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="font-medium text-white">Overview</span>
            </div>
            {expandedSections.overview ? 
              <ChevronUp className="w-5 h-5 text-gray-400" /> : 
              <ChevronDown className="w-5 h-5 text-gray-400" />
            }
          </button>
          {expandedSections.overview && (
            <div className="px-4 pb-4">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{summary}</p>
            </div>
          )}
        </div>

        {/* Key Findings Section */}
        {keyFindings.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('findings')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="font-medium text-white">Key Findings</span>
                  <span className="ml-2 text-sm text-gray-500">({keyFindings.length})</span>
                </div>
              </div>
              {expandedSections.findings ? 
                <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                <ChevronDown className="w-5 h-5 text-gray-400" />
              }
            </button>
            {expandedSections.findings && (
              <div className="px-4 pb-4 max-h-64 overflow-y-auto">
                <ul className="space-y-2">
                  {keyFindings.map((finding, index) => (
                    <li key={index} className="flex items-start gap-3 py-2 border-b border-gray-700/50 last:border-0">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-emerald-400">{index + 1}</span>
                      </span>
                      <span className="text-gray-300 text-sm">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Issues & Risks Section */}
        {riskAreas.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('risks')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <span className="font-medium text-white">Issues & Risks</span>
                  <span className="ml-2 text-sm text-gray-500">({riskAreas.length})</span>
                </div>
              </div>
              {expandedSections.risks ? 
                <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                <ChevronDown className="w-5 h-5 text-gray-400" />
              }
            </button>
            {expandedSections.risks && (
              <div className="px-4 pb-4 max-h-64 overflow-y-auto">
                <ul className="space-y-2">
                  {riskAreas.map((risk, index) => (
                    <li key={index} className="flex items-start gap-3 py-2 border-b border-gray-700/50 last:border-0">
                      <span className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('actions')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <span className="font-medium text-white">What to Fix</span>
                  <span className="ml-2 text-sm text-gray-500">({recommendations.length})</span>
                </div>
              </div>
              {expandedSections.actions ? 
                <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                <ChevronDown className="w-5 h-5 text-gray-400" />
              }
            </button>
            {expandedSections.actions && (
              <div className="px-4 pb-4 max-h-72 overflow-y-auto">
                <ul className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-3 py-2 border-b border-gray-700/50 last:border-0">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
