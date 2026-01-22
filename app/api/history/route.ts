/**
 * Chat History API
 * Endpoints for managing chat threads
 * 
 * GET /api/history - List all threads
 * GET /api/history?threadId=xxx - Get specific thread
 * GET /api/history?sessionId=xxx - List threads for session
 * POST /api/history - Create new thread or add message
 * DELETE /api/history?threadId=xxx - Delete a thread
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createThread,
  getThread,
  addMessage,
  listThreads,
  listThreadsBySession,
  deleteThread,
  ChatThread,
  ThreadSummary,
} from '@/lib/chatHistory';

// ============== TYPES ==============

interface CreateThreadRequest {
  action: 'create_thread';
  sessionId: string;
  reportName: string;
}

interface AddMessageRequest {
  action: 'add_message';
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'report' | 'custom' | 'contentstack_knowledge' | 'mixed';
}

type PostRequest = CreateThreadRequest | AddMessageRequest;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============== GET HANDLER ==============

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ChatThread | ThreadSummary[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');
    const sessionId = searchParams.get('sessionId');

    // Get specific thread
    if (threadId) {
      const thread = getThread(threadId);
      
      if (!thread) {
        return NextResponse.json(
          { success: false, error: 'Thread not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true, data: thread });
    }

    // List threads for a specific session
    if (sessionId) {
      const threads = listThreadsBySession(sessionId);
      return NextResponse.json({ success: true, data: threads });
    }

    // List all threads
    const threads = listThreads();
    return NextResponse.json({ success: true, data: threads });
    
  } catch (error) {
    console.error('[History API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

// ============== POST HANDLER ==============

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ChatThread>>> {
  try {
    const body = await request.json() as PostRequest;

    // Create new thread
    if (body.action === 'create_thread') {
      const { sessionId, reportName } = body;
      
      if (!sessionId || !reportName) {
        return NextResponse.json(
          { success: false, error: 'sessionId and reportName are required' },
          { status: 400 }
        );
      }
      
      const thread = createThread(sessionId, reportName);
      return NextResponse.json({ success: true, data: thread }, { status: 201 });
    }

    // Add message to thread
    if (body.action === 'add_message') {
      const { threadId, role, content, source } = body;
      
      if (!threadId || !role || !content) {
        return NextResponse.json(
          { success: false, error: 'threadId, role, and content are required' },
          { status: 400 }
        );
      }
      
      const thread = addMessage(threadId, { role, content, source });
      
      if (!thread) {
        return NextResponse.json(
          { success: false, error: 'Thread not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true, data: thread });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('[History API] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// ============== DELETE HANDLER ==============

export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
      return NextResponse.json(
        { success: false, error: 'threadId is required' },
        { status: 400 }
      );
    }

    const deleted = deleteThread(threadId);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Thread not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
    
  } catch (error) {
    console.error('[History API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete thread' },
      { status: 500 }
    );
  }
}

