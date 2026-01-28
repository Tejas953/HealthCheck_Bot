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
  Award,
  Lightbulb
} from 'lucide-react';

// Health Check Metrics from dashboard
interface HealthCheckMetrics {
  strengths?: number;
  areasOfOpportunities?: number;
  actionsRequired?: number;
}

interface SummaryProps {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  riskAreas: string[];
  isLoading: boolean;
  error?: string;
  healthCheckMetrics?: HealthCheckMetrics; // Add health check metrics
}

type TabType = 'overview' | 'strengths' | 'opportunities' | 'actions';

export default function Summary({
  summary,
  keyFindings,
  recommendations,
  riskAreas,
  isLoading,
  error,
  healthCheckMetrics,
}: SummaryProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const handleCopy = async () => {
    const strengthsCount = healthCheckMetrics?.strengths ?? keyFindings.length;
    const oppsCount = healthCheckMetrics?.areasOfOpportunities ?? riskAreas.length;
    const actionsCount = healthCheckMetrics?.actionsRequired ?? recommendations.length;
    
    const text = `
HEALTH CHECK ANALYSIS REPORT
============================

OVERVIEW:
${summary}

METRICS SUMMARY:
• Strengths: ${strengthsCount} (Well configured)
• Opportunities: ${oppsCount} (Can be improved)
• Actions Required: ${actionsCount} (Need attention)

STRENGTHS (${strengthsCount} items well configured):
${keyFindings.map(f => `✓ ${f}`).join('\n')}

OPPORTUNITIES (${oppsCount} areas for improvement):
${riskAreas.map(r => `○ ${r}`).join('\n')}

ACTIONS REQUIRED (${actionsCount} items need attention):
${recommendations.map(r => `! ${r}`).join('\n')}
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

  // Tab configuration
  const tabs: Array<{
    id: TabType;
    label: string;
    icon: React.ReactNode;
    count?: number;
    color: string;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <FileText className="w-4 h-4" />,
      color: 'indigo',
    },
    {
      id: 'strengths',
      label: 'Strengths',
      icon: <Award className="w-4 h-4" />,
      count: healthCheckMetrics?.strengths ?? keyFindings.length,
      color: 'emerald',
    },
    {
      id: 'opportunities',
      label: 'Opportunities',
      icon: <Lightbulb className="w-4 h-4" />,
      count: healthCheckMetrics?.areasOfOpportunities ?? riskAreas.length,
      color: 'amber',
    },
    {
      id: 'actions',
      label: 'Actions Required',
      icon: <AlertTriangle className="w-4 h-4" />,
      count: healthCheckMetrics?.actionsRequired ?? recommendations.length,
      color: 'red',
    },
  ];

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

      {/* Tab Navigation */}
      <div className="border-b border-gray-800 bg-gray-800/30">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            
            // Get color classes based on tab color
            let activeClasses = '';
            let badgeClasses = '';
            
            if (isActive) {
              switch (tab.color) {
                case 'indigo':
                  activeClasses = 'bg-indigo-500/20 text-indigo-400 border-indigo-500';
                  badgeClasses = 'bg-indigo-500/30 text-indigo-300';
                  break;
                case 'emerald':
                  activeClasses = 'bg-emerald-500/20 text-emerald-400 border-emerald-500';
                  badgeClasses = 'bg-emerald-500/30 text-emerald-300';
                  break;
                case 'amber':
                  activeClasses = 'bg-amber-500/20 text-amber-400 border-amber-500';
                  badgeClasses = 'bg-amber-500/30 text-amber-300';
                  break;
                case 'red':
                  activeClasses = 'bg-red-500/20 text-red-400 border-red-500';
                  badgeClasses = 'bg-red-500/30 text-red-300';
                  break;
              }
            } else {
              activeClasses = 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50';
              badgeClasses = 'bg-gray-700 text-gray-500';
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200
                  border-b-2 border-transparent whitespace-nowrap
                  ${activeClasses}
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClasses}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Container - Fixed height, no scroll on parent */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Overview Tab - Internal Scroll */}
        {activeTab === 'overview' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              {summary && (
                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-indigo-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="font-semibold text-white">Client Feedback</h3>
                  </div>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
                    {summary}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Strengths Tab - Internal Scroll */}
        {activeTab === 'strengths' && keyFindings.length > 0 && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-xl p-4 border-l-4 border-emerald-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Award className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Strengths Analysis</h3>
                    <p className="text-xs text-emerald-400/70 mt-1">
                      {healthCheckMetrics?.strengths ?? keyFindings.length} areas well configured
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-4 pb-3 border-b border-gray-700">
                  These areas are well configured and working optimally:
                </p>
                <ul className="space-y-3">
                  {keyFindings.map((finding, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-500/30">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      </span>
                      <span className="text-gray-300 text-sm leading-relaxed flex-1">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Opportunities Tab - Internal Scroll */}
        {activeTab === 'opportunities' && riskAreas.length > 0 && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-xl p-4 border-l-4 border-amber-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Opportunities Analysis</h3>
                    <p className="text-xs text-amber-400/70 mt-1">
                      {healthCheckMetrics?.areasOfOpportunities ?? riskAreas.length} areas can be improved
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-4 pb-3 border-b border-gray-700">
                  These areas have room for improvement and optimization:
                </p>
                <ul className="space-y-3">
                  {riskAreas.map((risk, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-500/30">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      </span>
                      <span className="text-gray-300 text-sm leading-relaxed flex-1">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Actions Required Tab - Internal Scroll */}
        {activeTab === 'actions' && recommendations.length > 0 && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-xl p-4 border-l-4 border-red-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Actions Required</h3>
                    <p className="text-xs text-red-400/70 mt-1">
                      {healthCheckMetrics?.actionsRequired ?? recommendations.length} items need attention
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-4 pb-3 border-b border-gray-700">
                  These items need immediate attention and action:
                </p>
                <ul className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                      <span className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-red-500/30">
                        <Target className="w-3.5 h-3.5 text-red-400" />
                      </span>
                      <span className="text-gray-300 text-sm leading-relaxed flex-1">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Empty States - Internal Scroll */}
        {activeTab === 'strengths' && keyFindings.length === 0 && (
          <div className="h-full overflow-y-auto p-4 flex items-center justify-center">
            <div className="text-center py-12 text-gray-500">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No strengths data available</p>
            </div>
          </div>
        )}
        {activeTab === 'opportunities' && riskAreas.length === 0 && (
          <div className="h-full overflow-y-auto p-4 flex items-center justify-center">
            <div className="text-center py-12 text-gray-500">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No opportunities data available</p>
            </div>
          </div>
        )}
        {activeTab === 'actions' && recommendations.length === 0 && (
          <div className="h-full overflow-y-auto p-4 flex items-center justify-center">
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No actions required</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
