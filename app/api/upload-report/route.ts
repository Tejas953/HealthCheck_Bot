/**
 * API Route: /api/upload-report
 * Handles file upload and parsing
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseReport, extractHealthCheckMetrics, extractMetricsWithVision } from '@/utils/reportParser';
import { getReportStore } from '@/lib/reportStore';
import { UploadResponse } from '@/utils/types';
import { v4 as uuidv4 } from 'uuid';

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/x-pdf',
  'application/octet-stream',
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
}

function isAllowedFile(filename: string, mimeType: string): boolean {
  const extension = getFileExtension(filename);
  if (ALLOWED_EXTENSIONS.includes(extension)) return true;
  if (ALLOWED_TYPES.includes(mimeType)) return true;
  return false;
}

function getEffectiveFileType(filename: string, mimeType: string): string {
  const extension = getFileExtension(filename);
  switch (extension) {
    case '.pdf': return 'application/pdf';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.doc': return 'application/msword';
    case '.txt': return 'text/plain';
    default: return mimeType;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  console.log('[Upload] Received upload request');
  console.log("request1", request);
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.log('[Upload] No file provided');
      return NextResponse.json({
        success: false,
        sessionId: '',
        filename: '',
        chunksCreated: 0,
        message: 'No file provided',
      }, { status: 400 });
    }

    console.log(`[Upload] File received: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

    if (!isAllowedFile(file.name, file.type)) {
      console.log(`[Upload] Invalid file type: ${file.type}`);
      return NextResponse.json({
        success: false,
        sessionId: '',
        filename: file.name,
        chunksCreated: 0,
        message: `Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.`,
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      console.log(`[Upload] File too large: ${file.size} bytes`);
      return NextResponse.json({
        success: false,
        sessionId: '',
        filename: file.name,
        chunksCreated: 0,
        message: `File too large. Maximum size is 10MB`,
      }, { status: 400 });
    }

    // Convert file to buffer
    console.log('[Upload] Converting file to buffer...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const effectiveFileType = getEffectiveFileType(file.name, file.type);
    console.log(`[Upload] Effective file type: ${effectiveFileType}`);

    // Parse the report
    console.log('[Upload] Parsing file...');
    let parsedDocument;
    try {
      parsedDocument = await parseReport(buffer, file.name, effectiveFileType);
    } catch (parseError) {
      console.error('[Upload] Parse error:', parseError);
      const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      return NextResponse.json({
        success: false,
        sessionId: '',
        filename: file.name,
        chunksCreated: 0,
        message: `Failed to parse file: ${errorMsg}`,
      }, { status: 422 });
    }

    // Validate parsing result
    if (!parsedDocument.rawText || parsedDocument.rawText.trim().length === 0) {
      console.log('[Upload] No content extracted from file');
      return NextResponse.json({
        success: false,
        sessionId: '',
        filename: file.name,
        chunksCreated: 0,
        message: 'Failed to extract content from the file.',
      }, { status: 422 });
    }

    // Create session ID
    const sessionId = uuidv4();
    console.log(`[Upload] Created session: ${sessionId}`);

    // Extract health check metrics
    // For PDFs, use Gemini Vision for accurate extraction (can read pie charts!)
    // For other formats, use text-based extraction
    let metrics;
    if (effectiveFileType === 'application/pdf') {
      console.log('[Upload] Using Gemini Vision for PDF metric extraction...');
      try {
        metrics = await extractMetricsWithVision(buffer);
        console.log('[Upload] Vision-extracted metrics:', metrics);
        
        // If vision extraction failed or returned empty, fall back to text extraction
        if (!metrics || Object.keys(metrics).length === 0) {
          console.log('[Upload] Vision extraction returned empty, falling back to text...');
          metrics = extractHealthCheckMetrics(parsedDocument.rawText);
        }
      } catch (visionError) {
        console.error('[Upload] Vision extraction error, falling back to text:', visionError);
        metrics = extractHealthCheckMetrics(parsedDocument.rawText);
      }
    } else {
      metrics = extractHealthCheckMetrics(parsedDocument.rawText);
    }
    console.log(`[Upload] Final extracted metrics:`, metrics);

    // Store the report
    const reportStore = getReportStore();
    reportStore.store(sessionId, file.name, parsedDocument.rawText);

    console.log(`[Upload] Successfully processed ${file.name}: ${parsedDocument.rawText.length} characters`);

    return NextResponse.json({
      success: true,
      sessionId,
      filename: file.name,
      chunksCreated: 1,
      message: 'Report uploaded and processed successfully',
      metrics, // Include extracted metrics
    });

  } catch (error) {
    console.error('[Upload] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({
      success: false,
      sessionId: '',
      filename: '',
      chunksCreated: 0,
      message: `Failed to process report: ${errorMessage}`,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload a report.' },
    { status: 405 }
  );
}
