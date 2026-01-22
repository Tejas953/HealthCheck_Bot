/**
 * Chat History Module
 * Stores and manages chat threads with persistent storage
 */

import fs from 'fs';
import path from 'path';

// ============== TYPES ==============

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: 'report' | 'custom' | 'contentstack_knowledge' | 'mixed';
}

export interface ChatThread {
  id: string;
  sessionId: string;
  reportName: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ThreadSummary {
  id: string;
  title: string;
  reportName: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============== CONFIGURATION ==============

const DATA_DIR = path.join(process.cwd(), 'data', 'chat-history');
const MAX_THREADS = 100; // Maximum threads to keep

// ============== HELPER FUNCTIONS ==============

/**
 * Ensure the data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('[ChatHistory] Created data directory:', DATA_DIR);
  }
}

/**
 * Get the file path for a thread
 */
function getThreadPath(threadId: string): string {
  return path.join(DATA_DIR, `${threadId}.json`);
}

/**
 * Generate a title from the first user message
 */
function generateTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (firstUserMessage) {
    const title = firstUserMessage.content.slice(0, 50);
    return title.length < firstUserMessage.content.length ? `${title}...` : title;
  }
  return 'New Conversation';
}

// ============== MAIN FUNCTIONS ==============

/**
 * Create a new chat thread
 */
export function createThread(sessionId: string, reportName: string): ChatThread {
  ensureDataDir();
  
  const thread: ChatThread = {
    id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    reportName,
    title: 'New Conversation',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Save the new thread
  fs.writeFileSync(getThreadPath(thread.id), JSON.stringify(thread, null, 2));
  console.log(`[ChatHistory] Created thread: ${thread.id}`);
  
  return thread;
}

/**
 * Get a thread by ID
 */
export function getThread(threadId: string): ChatThread | null {
  const filePath = getThreadPath(threadId);
  
  if (!fs.existsSync(filePath)) {
    console.log(`[ChatHistory] Thread not found: ${threadId}`);
    return null;
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as ChatThread;
  } catch (error) {
    console.error(`[ChatHistory] Error reading thread: ${threadId}`, error);
    return null;
  }
}

/**
 * Add a message to a thread
 */
export function addMessage(
  threadId: string,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): ChatThread | null {
  const thread = getThread(threadId);
  
  if (!thread) {
    console.error(`[ChatHistory] Cannot add message - thread not found: ${threadId}`);
    return null;
  }
  
  const newMessage: ChatMessage = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  
  thread.messages.push(newMessage);
  thread.updatedAt = new Date().toISOString();
  
  // Update title if this is the first user message
  if (thread.title === 'New Conversation') {
    thread.title = generateTitle(thread.messages);
  }
  
  // Save updated thread
  fs.writeFileSync(getThreadPath(threadId), JSON.stringify(thread, null, 2));
  console.log(`[ChatHistory] Added message to thread: ${threadId}`);
  
  return thread;
}

/**
 * Update the last assistant message (for streaming or corrections)
 */
export function updateLastAssistantMessage(
  threadId: string,
  content: string,
  source?: 'report' | 'custom' | 'contentstack_knowledge'
): ChatThread | null {
  const thread = getThread(threadId);
  
  if (!thread) {
    return null;
  }
  
  // Find the last assistant message
  for (let i = thread.messages.length - 1; i >= 0; i--) {
    if (thread.messages[i].role === 'assistant') {
      thread.messages[i].content = content;
      if (source) {
        thread.messages[i].source = source;
      }
      break;
    }
  }
  
  thread.updatedAt = new Date().toISOString();
  fs.writeFileSync(getThreadPath(threadId), JSON.stringify(thread, null, 2));
  
  return thread;
}

/**
 * List all threads (sorted by most recent)
 */
export function listThreads(): ThreadSummary[] {
  ensureDataDir();
  
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    
    const threads: ThreadSummary[] = files.map(file => {
      const filePath = path.join(DATA_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ChatThread;
      
      return {
        id: data.id,
        title: data.title,
        reportName: data.reportName,
        messageCount: data.messages.length,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
    
    // Sort by most recent first
    threads.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    return threads;
  } catch (error) {
    console.error('[ChatHistory] Error listing threads:', error);
    return [];
  }
}

/**
 * List threads for a specific session
 */
export function listThreadsBySession(sessionId: string): ThreadSummary[] {
  ensureDataDir();
  
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    
    const threads: ThreadSummary[] = [];
    
    for (const file of files) {
      const filePath = path.join(DATA_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ChatThread;
      
      if (data.sessionId === sessionId) {
        threads.push({
          id: data.id,
          title: data.title,
          reportName: data.reportName,
          messageCount: data.messages.length,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      }
    }
    
    threads.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    return threads;
  } catch (error) {
    console.error('[ChatHistory] Error listing threads by session:', error);
    return [];
  }
}

/**
 * Delete a thread
 */
export function deleteThread(threadId: string): boolean {
  const filePath = getThreadPath(threadId);
  
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  try {
    fs.unlinkSync(filePath);
    console.log(`[ChatHistory] Deleted thread: ${threadId}`);
    return true;
  } catch (error) {
    console.error(`[ChatHistory] Error deleting thread: ${threadId}`, error);
    return false;
  }
}

/**
 * Clean up old threads (keep only MAX_THREADS)
 */
export function cleanupOldThreads(): number {
  const threads = listThreads();
  
  if (threads.length <= MAX_THREADS) {
    return 0;
  }
  
  const threadsToDelete = threads.slice(MAX_THREADS);
  let deleted = 0;
  
  for (const thread of threadsToDelete) {
    if (deleteThread(thread.id)) {
      deleted++;
    }
  }
  
  console.log(`[ChatHistory] Cleaned up ${deleted} old threads`);
  return deleted;
}

