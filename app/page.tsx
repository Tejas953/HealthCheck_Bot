'use client';

import React, { useState, useCallback } from 'react';
import { 
  Cpu, 
  Shield, 
  Zap, 
  ExternalLink, 
  AlertCircle, 
  Sparkles,
  FileText,
  Brain,
  Lock,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import Summary from '@/components/Summary';
import ChatInterface from '@/components/ChatInterface';
import MetricsDashboard, { HealthCheckMetrics } from '@/components/MetricsDashboard';

interface SummaryData {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  riskAreas: string[];
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [metrics, setMetrics] = useState<HealthCheckMetrics | null>(null);

  const handleUploadSuccess = useCallback(async (newSessionId: string, uploadedFilename: string, extractedMetrics?: HealthCheckMetrics) => {
    setSessionId(newSessionId);
    setFilename(uploadedFilename);
    setUploadError('');
    setSummaryError('');
    setSummaryData(null);
    setMetrics(extractedMetrics || null);

    setSummaryLoading(true);
    try {
      // Get report text from sessionStorage for serverless compatibility
      let reportText: string | undefined;
      try {
        reportText = sessionStorage.getItem(`report_${newSessionId}`) || undefined;
      } catch (storageError) {
        console.warn('[Page] Failed to read report from sessionStorage:', storageError);
      }

      // Pass health check metrics to summarize API so Gemini generates exact counts
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: newSessionId,
          healthCheckMetrics: extractedMetrics ? {
            strengths: extractedMetrics.strengths,
            areasOfOpportunities: extractedMetrics.areasOfOpportunities,
            actionsRequired: extractedMetrics.actionsRequired,
          } : undefined,
          reportText, // Include report text for serverless compatibility
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.summary || 'Failed to generate summary');
      }

      setSummaryData({
        summary: data.summary,
        keyFindings: data.keyFindings,
        recommendations: data.recommendations,
        riskAreas: data.riskAreas,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate summary';
      setSummaryError(message);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const handleUploadError = useCallback((error: string) => {
    setUploadError(error);
    setSessionId('');
    setFilename('');
    setSummaryData(null);
    setMetrics(null);
  }, []);

  const resetSession = () => {
    setSessionId('');
    setFilename('');
    setSummaryData(null);
    setSummaryError('');
    setUploadError('');
    setMetrics(null);
  };

  return (
    <div className="h-screen flex flex-col bg-pattern relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Header - Fixed height */}
      <header className="flex-shrink-0 glass border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-30" />
              </div>
              <div>
                <h1 className="font-semibold text-white text-lg tracking-tight">
                  Stack Health AI
                </h1>
                <p className="text-xs text-gray-400">
                  Contentstack Analysis Platform
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-4">
              {sessionId && (
                <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="status-dot online" />
                  <span className="text-sm text-emerald-400 font-medium">Session Active</span>
                  <span className="text-xs text-gray-500 max-w-[120px] truncate">{filename}</span>
                </div>
              )}
              <a
                href="https://www.contentstack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                <span className="text-sm hidden sm:inline">Contentstack</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Takes remaining height */}
      <main className="flex-1 relative z-10 overflow-hidden">
        {!sessionId ? (
          /* Upload Screen - Scrollable */
          <div className="h-full overflow-y-auto">
            <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
              {/* Hero Section */}
              <div className="text-center mb-16 reveal">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-indigo-300 font-medium">AI-Powered Analysis</span>
                </div>
                
                <h1 className="hero-title text-5xl sm:text-6xl lg:text-7xl mb-6">
                  <span className="text-white">Stack Health</span>
                  <br />
                  <span className="text-gradient-brand">Intelligence</span>
                </h1>
                
                <p className="hero-subtitle text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                  Transform your Contentstack health check reports into actionable insights 
                  with our AI-powered Solution Architect assistant.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Instant Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>SA-Quality Insights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Gemini AI Powered</span>
                  </div>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {[
                  {
                    icon: Shield,
                    title: 'Grounded Responses',
                    description: 'Every answer is strictly based on your uploaded report. No hallucinations, no assumptions.',
                    iconBg: 'bg-emerald-500/20',
                    iconColor: 'text-emerald-400',
                  },
                  {
                    icon: Zap,
                    title: 'Instant Analysis',
                    description: 'Get comprehensive SA-style summaries with key findings, risks, and recommendations.',
                    iconBg: 'bg-amber-500/20',
                    iconColor: 'text-amber-400',
                  },
                  {
                    icon: Lock,
                    title: 'Secure Processing',
                    description: 'Your reports are processed securely with Google Gemini AI for accurate analysis.',
                    iconBg: 'bg-indigo-500/20',
                    iconColor: 'text-indigo-400',
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className={`feature-card reveal stagger-${index + 1}`}
                  >
                    <div className={`icon-wrapper ${feature.iconBg}`}>
                      <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Upload Zone */}
              <div className="max-w-2xl mx-auto reveal stagger-4">
                <FileUpload
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                />
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="max-w-2xl mx-auto mt-6 flex items-start gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 reveal">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-400 font-medium">Upload Failed</p>
                    <p className="text-sm text-gray-400 mt-1">{uploadError}</p>
                  </div>
                </div>
              )}

              {/* Trust Indicators */}
              <div className="mt-16 text-center reveal stagger-5">
                <p className="text-gray-500 text-sm mb-4">
                  Powered by advanced AI technology
                </p>
                <div className="flex items-center justify-center gap-8">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Brain className="w-5 h-5" />
                    <span className="text-sm">Gemini 2.0 Flash</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-5 h-5" />
                    <span className="text-sm">PDF Analysis</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Cpu className="w-5 h-5" />
                    <span className="text-sm">AI Powered</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Analysis Screen - Fixed height with internal scroll */
          <div className="h-full flex flex-col">
            {/* Header Bar - Fixed */}
            <div className="flex-shrink-0 px-6 lg:px-8 py-4 border-b border-white/5">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Report Analysis
                  </h2>
                  <p className="text-gray-400 text-sm flex items-center gap-2 mt-1">
                    <FileText className="w-4 h-4" />
                    {filename}
                  </p>
                </div>
                <button
                  onClick={resetSession}
                  className="btn-secondary flex items-center gap-2"
                >
                  <span>New Report</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Area - Scrollable page */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 lg:px-8 py-6">
                <div className="max-w-7xl mx-auto">
                  {/* Metrics Dashboard - Scrollable with page */}
                  {metrics && (
                    <div className="mb-6">
                      <MetricsDashboard 
                        metrics={metrics} 
                        isLoading={summaryLoading}
                      />
                    </div>
                  )}

                  {/* Grid with Summary and Chat - Fixed height with internal scroll */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Summary - Fixed height with internal scroll */}
                    <div className="overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
                      <Summary
                        summary={summaryData?.summary || ''}
                        keyFindings={summaryData?.keyFindings || []}
                        recommendations={summaryData?.recommendations || []}
                        riskAreas={summaryData?.riskAreas || []}
                        isLoading={summaryLoading}
                        error={summaryError}
                        healthCheckMetrics={metrics ? {
                          strengths: metrics.strengths,
                          areasOfOpportunities: metrics.areasOfOpportunities,
                          actionsRequired: metrics.actionsRequired,
                        } : undefined}
                      />
                    </div>

                    {/* Right: Chat - Fixed height with internal scroll */}
                    <div className="overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
                      <div className="glass-card rounded-2xl flex flex-col h-full">
                        <ChatInterface
                          sessionId={sessionId}
                          reportName={filename}
                          disabled={!sessionId || summaryLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer - Only shown on upload screen */}
      {!sessionId && (
        <footer className="flex-shrink-0 relative z-10 border-t border-white/5 py-4 footer-gradient">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-gray-500 text-sm">
                Built for Contentstack Solution Architects
              </p>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="status-dot online" />
                  <span className="text-gray-400">Gemini Ready</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Cpu className="w-4 h-4" />
                  <span>AI Active</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
