'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { HealthCheckMetrics } from '@/utils/types';

interface FileUploadProps {
  onUploadSuccess: (sessionId: string, filename: string, metrics?: HealthCheckMetrics) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function FileUpload({ onUploadSuccess, onUploadError, disabled }: FileUploadProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [filename, setFilename] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      onUploadError('Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onUploadError('File too large. Maximum size is 10MB.');
      return;
    }

    setFilename(file.name);
    setStatus('uploading');
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 8, 90));
    }, 150);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-report', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      // Store report text in sessionStorage for serverless compatibility
      if (data.reportText) {
        try {
          sessionStorage.setItem(`report_${data.sessionId}`, data.reportText);
          sessionStorage.setItem(`report_filename_${data.sessionId}`, file.name);
          console.log('[FileUpload] Stored report in sessionStorage');
        } catch (storageError) {
          console.warn('[FileUpload] Failed to store report in sessionStorage:', storageError);
        }
      }

      setStatus('success');
      onUploadSuccess(data.sessionId, file.name, data.metrics);
    } catch (error) {
      clearInterval(progressInterval);
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Upload failed';
      onUploadError(message);
    }
  }, [onUploadSuccess, onUploadError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || status === 'uploading') return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [disabled, status, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && status !== 'uploading') setIsDragging(true);
  }, [disabled, status]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (!disabled && status !== 'uploading') fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const resetUpload = () => {
    setStatus('idle');
    setFilename('');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || status === 'uploading'}
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          upload-zone relative cursor-pointer rounded-2xl p-10 transition-all duration-400
          ${isDragging ? 'dragging' : ''}
          ${disabled || status === 'uploading' ? 'opacity-60 cursor-not-allowed' : ''}
          ${status === 'success' ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
          ${status === 'error' ? 'border-red-500/50 bg-red-500/5' : ''}
        `}
      >
        {/* Progress Bar */}
        {status === 'uploading' && (
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl overflow-hidden bg-gray-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex flex-col items-center gap-5 text-center relative z-10">
          {/* Icon */}
          <div className={`
            relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
            ${status === 'idle' ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20' : ''}
            ${status === 'uploading' ? 'bg-indigo-500/20' : ''}
            ${status === 'success' ? 'bg-emerald-500/20' : ''}
            ${status === 'error' ? 'bg-red-500/20' : ''}
          `}>
            {status === 'idle' && (
              <>
                <Upload className="w-9 h-9 text-indigo-400" />
                <div className="absolute -inset-1 rounded-2xl bg-indigo-500/20 blur-lg opacity-50" />
              </>
            )}
            {status === 'uploading' && (
              <Loader2 className="w-9 h-9 text-indigo-400 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-9 h-9 text-emerald-400" />
            )}
            {status === 'error' && (
              <AlertCircle className="w-9 h-9 text-red-400" />
            )}
          </div>

          {/* Text Content */}
          <div>
            {status === 'idle' && (
              <>
                <p className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Drop your Health Check Report
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  or click to browse your files
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10">PDF</span>
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10">DOCX</span>
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10">DOC</span>
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10">TXT</span>
                </div>
              </>
            )}
            {status === 'uploading' && (
              <>
                <p className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Processing Report...
                </p>
                <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  {filename}
                </p>
              </>
            )}
            {status === 'success' && (
              <>
                <p className="text-xl font-semibold text-emerald-400 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Report Uploaded Successfully!
                </p>
                <p className="text-gray-400 text-sm">
                  {filename} •{' '}
                  <button
                    onClick={(e) => { e.stopPropagation(); resetUpload(); }}
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                  >
                    Upload another
                  </button>
                </p>
              </>
            )}
            {status === 'error' && (
              <>
                <p className="text-xl font-semibold text-red-400 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Upload Failed
                </p>
                <p className="text-gray-400 text-sm">
                  <button
                    onClick={(e) => { e.stopPropagation(); resetUpload(); }}
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                  >
                    Try again
                  </button>
                </p>
              </>
            )}
          </div>

          {/* Max size note */}
          {status === 'idle' && (
            <p className="text-xs text-gray-600">
              Maximum file size: 10MB
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
