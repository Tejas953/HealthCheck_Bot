'use client';

import React from 'react';
import { Building2, User, Calendar, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export interface HealthCheckMetrics {
  organization?: string;
  stack?: string;
  runBy?: string;
  lastRun?: string;
  totalChecks?: number;
  performedChecks?: number;
  skippedChecks?: number;
  actionsRequired?: number;
  areasOfOpportunities?: number;
  strengths?: number;
}

interface MetricsDashboardProps {
  metrics: HealthCheckMetrics;
  isLoading?: boolean;
}

export default function MetricsDashboard({ metrics, isLoading }: MetricsDashboardProps) {
  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-4 mb-4 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-40 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-white/5 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  // Check if we have any meaningful metrics
  const hasMetrics = metrics && (metrics.totalChecks || metrics.organization || metrics.stack);
  if (!hasMetrics) return null;

  // Calculate percentages for breakdown
  const strengthsVal = metrics.strengths ?? 0;
  const oppsVal = metrics.areasOfOpportunities ?? 0;
  const actionsVal = metrics.actionsRequired ?? 0;
  const performedChecks = metrics.performedChecks ?? (strengthsVal + oppsVal + actionsVal);
  
  const strengthsPercent = performedChecks > 0 ? (strengthsVal / performedChecks) * 100 : 0;
  const oppsPercent = performedChecks > 0 ? (oppsVal / performedChecks) * 100 : 0;
  const actionsPercent = performedChecks > 0 ? (actionsVal / performedChecks) * 100 : 0;

  return (
    <div className="glass-card rounded-xl p-4 mb-4">
      {/* Compact Header Info */}
      <div className="flex flex-wrap items-center gap-3 mb-4 pb-3 border-b border-white/10">
        {metrics.organization && (
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-gray-300">{metrics.organization}</span>
          </div>
        )}
        {metrics.stack && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500">Stack:</span>
            <span className="text-xs font-medium text-white">{metrics.stack}</span>
          </div>
        )}
        {metrics.runBy && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] text-gray-400">{metrics.runBy}</span>
          </div>
        )}
        {metrics.lastRun && (
          <div className="flex items-center gap-1.5 ml-auto">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] text-gray-400">{metrics.lastRun}</span>
          </div>
        )}
      </div>

      {/* Compact Health Check Stats */}
      <div className="flex items-center gap-3 mb-3">
        {/* Total Checks */}
        {metrics.totalChecks !== undefined && (
          <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg p-3 border border-indigo-500/30 min-w-[110px]">
            <div className="text-2xl font-bold text-white">{metrics.totalChecks}</div>
            <div className="text-xs text-indigo-300 font-medium">Total Checks</div>
          </div>
        )}

        {/* Arrow */}
        {metrics.totalChecks !== undefined && (metrics.performedChecks !== undefined || metrics.skippedChecks !== undefined) && (
          <div className="hidden sm:flex items-center text-gray-600">
            <ArrowRight className="w-4 h-4" />
          </div>
        )}

        {/* Performed & Skipped - Compact */}
        <div className="flex gap-2 flex-1">
          {metrics.performedChecks !== undefined && (
            <div className="flex-1 bg-emerald-500/10 rounded-lg p-2.5 border border-emerald-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] text-emerald-300 font-medium">Performed</span>
              </div>
              <div className="text-xl font-bold text-white">{metrics.performedChecks}</div>
            </div>
          )}
          
          {metrics.skippedChecks !== undefined && (
            <div className="bg-gray-500/10 rounded-lg p-2.5 border border-gray-500/20 min-w-[80px]">
              <div className="flex items-center gap-1.5 mb-1">
                <XCircle className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] text-gray-400 font-medium">Skipped</span>
              </div>
              <div className="text-xl font-bold text-gray-400">{metrics.skippedChecks}</div>
            </div>
          )}
        </div>
      </div>

      {/* Compact Percentage Breakdown */}
      {(strengthsVal > 0 || oppsVal > 0 || actionsVal > 0) && (
        <div className="pt-3 border-t border-white/5">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 text-center">
            Results Distribution
          </div>
          
          {/* Progress Bar with Percentages */}
          <div className="h-5 rounded-lg overflow-hidden flex bg-white/5 mb-3 relative">
            {strengthsPercent > 0 && (
              <div 
                className="bg-emerald-500 transition-all duration-500 flex items-center justify-center relative" 
                style={{ width: `${strengthsPercent}%` }}
              >
                {strengthsPercent > 8 && (
                  <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                    {Math.round(strengthsPercent)}%
                  </span>
                )}
              </div>
            )}
            {oppsPercent > 0 && (
              <div 
                className="bg-amber-500 transition-all duration-500 flex items-center justify-center relative" 
                style={{ width: `${oppsPercent}%` }}
              >
                {oppsPercent > 8 && (
                  <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                    {Math.round(oppsPercent)}%
                  </span>
                )}
              </div>
            )}
            {actionsPercent > 0 && (
              <div 
                className="bg-red-500 transition-all duration-500 flex items-center justify-center relative" 
                style={{ width: `${actionsPercent}%` }}
              >
                {actionsPercent > 8 && (
                  <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                    {Math.round(actionsPercent)}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Labels - Larger and More Visible */}
          <div className="flex items-center justify-center gap-5 text-xs flex-wrap">
            {strengthsVal > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-emerald-400">{strengthsVal}</span>
                <span className="text-gray-300 font-medium">Strengths</span>
              </div>
            )}
            
            {oppsVal > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="font-semibold text-amber-400">{oppsVal}</span>
                <span className="text-gray-300 font-medium">Opportunities</span>
              </div>
            )}
            
            {actionsVal > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="font-semibold text-red-400">{actionsVal}</span>
                <span className="text-gray-300 font-medium">Actions</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
