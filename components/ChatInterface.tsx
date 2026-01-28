'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, RotateCcw, Bot, History, ChevronDown, Square } from 'lucide-react';
import Message from './Message';
import { ChatMessage, ChatResponse } from '@/utils/types';
import { v4 as uuidv4 } from 'uuid';

interface ChatInterfaceProps {
  sessionId: string;
  reportName?: string;
  disabled?: boolean;
}

interface ThreadSummary {
  id: string;
  title: string;
  reportName: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

const SUGGESTED_QUESTIONS = [
  "What content types need attention?",
  "Are there any naming standard issues?",
  "What are the main recommendations?",
  "Which global fields are unused?",
  "What validation rules are missing?",
  "List all rarely used content types",
];

export default function ChatInterface({ sessionId, reportName = 'Report', disabled }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create a new thread when sessionId changes
  useEffect(() => {
    if (sessionId && !threadId) {
      createNewThread();
    }
  }, [sessionId]);

  // Fetch threads list when history panel is opened
  useEffect(() => {
    if (showHistory) {
      fetchThreads();
    }
  }, [showHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  // Create a new thread
  const createNewThread = async () => {
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_thread',
          sessionId,
          reportName,
        }),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setThreadId(data.data.id);
        console.log('[ChatInterface] Created new thread:', data.data.id);
      }
    } catch (err) {
      console.error('[ChatInterface] Failed to create thread:', err);
    }
  };

  // Save message to thread
  const saveMessageToThread = async (
    role: 'user' | 'assistant',
    content: string,
    source?: 'report' | 'custom' | 'contentstack_knowledge' | 'mixed'
  ) => {
    if (!threadId) return;
    
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_message',
          threadId,
          role,
          content,
          source,
        }),
      });
    } catch (err) {
      console.error('[ChatInterface] Failed to save message:', err);
    }
  };

  // Fetch threads list
  const fetchThreads = async () => {
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      if (data.success && data.data) {
        setThreads(data.data);
      }
    } catch (err) {
      console.error('[ChatInterface] Failed to fetch threads:', err);
    }
  };

  // Load a thread
  const loadThread = async (loadThreadId: string) => {
    try {
      const response = await fetch(`/api/history?threadId=${loadThreadId}`);
      const data = await response.json();
      if (data.success && data.data) {
        const thread = data.data;
        setThreadId(thread.id);
        setMessages(
          thread.messages.map((msg: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
          }))
        );
        setShowHistory(false);
        console.log('[ChatInterface] Loaded thread:', thread.id);
      }
    } catch (err) {
      console.error('[ChatInterface] Failed to load thread:', err);
    }
  };

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading || disabled) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Save user message to thread
    saveMessageToThread('user', messageText.trim());

    const assistantPlaceholderId = uuidv4();
    setMessages(prev => [
      ...prev,
      { id: assistantPlaceholderId, role: 'assistant', content: '', timestamp: new Date() },
    ]);

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let wasAborted = false;

    // Listen for abort events
    abortController.signal.addEventListener('abort', () => {
      wasAborted = true;
      console.log('[Chat] Request aborted via signal');
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          query: messageText.trim(),
          conversationHistory: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortController.signal,
      });

      // Check if request was aborted before processing response
      if (wasAborted || abortController.signal.aborted || !abortControllerRef.current) {
        throw new DOMException('Request aborted', 'AbortError');
      }

      const data: ChatResponse = await response.json();

      // Check again after JSON parsing (in case it was aborted during parsing)
      if (wasAborted || abortController.signal.aborted || !abortControllerRef.current) {
        throw new DOMException('Request aborted', 'AbortError');
      }

      if (!response.ok || !data.success) {
        throw new Error(data.answer || 'Failed to get response');
      }

      // Final check before updating UI
      if (wasAborted || abortController.signal.aborted || !abortControllerRef.current) {
        throw new DOMException('Request aborted', 'AbortError');
      }

      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantPlaceholderId
            ? { ...msg, content: data.answer, citations: data.citations }
            : msg
        )
      );

      // Save assistant message to thread
      saveMessageToThread('assistant', data.answer, data.source);

      // Update suggested questions from the response
      if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
        setSuggestedQuestions(data.suggestedQuestions);
      }
    } catch (err) {
      // Don't show error if request was aborted
      const isAborted = wasAborted || 
                       (err instanceof Error && (err.name === 'AbortError' || err.message === 'Request aborted')) ||
                       (abortControllerRef.current === null);
      
      if (isAborted) {
        const cancelledContent = 'Response cancelled by user.';
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantPlaceholderId
              ? { ...msg, content: cancelledContent }
              : msg
          )
        );
        // Save cancelled message to thread
        saveMessageToThread('assistant', cancelledContent);
        setIsLoading(false);
        abortControllerRef.current = null;
        return;
      }

      // Only show error if not aborted
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      const errorContent = `Sorry, I encountered an error: ${errorMessage}`;
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantPlaceholderId
            ? { ...msg, content: errorContent }
            : msg
        )
      );
      // Save error message to thread
      saveMessageToThread('assistant', errorContent);
    } finally {
      // Only clear loading state if not aborted (abort handler already cleared it)
      if (!wasAborted && abortControllerRef.current) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, [sessionId, messages, isLoading, disabled, threadId]);

  const stopGeneration = useCallback(() => {
    console.log('[Chat] Stop button clicked, aborting request...');
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
        console.log('[Chat] Request aborted successfully');
        setIsLoading(false);
        abortControllerRef.current = null;
      } catch (error) {
        console.error('[Chat] Error aborting request:', error);
      }
    } else {
      console.log('[Chat] No active request to abort');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    // Stop any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setError(null);
    setSuggestedQuestions([]);
    setIsLoading(false);
    // Create a new thread for the fresh chat
    setThreadId(null);
    createNewThread();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/20">
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              AI Assistant
            </h3>
            <p className="text-xs text-gray-500">Ask about your report</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors ${
              showHistory ? 'bg-white/5 text-gray-300' : ''
            }`}
            title="Chat history"
          >
            <History className="w-4 h-4" />
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
              title="New chat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* History Panel - Collapsible */}
      {showHistory && (
        <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.02] max-h-48 overflow-y-auto">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">Recent Conversations</p>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded hover:bg-white/5 text-gray-500"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            {threads.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">No previous conversations</p>
            ) : (
              <div className="space-y-1">
                {threads.slice(0, 10).map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => loadThread(thread.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors
                      ${thread.id === threadId 
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                        : 'hover:bg-white/5 text-gray-400 hover:text-gray-300'
                      }`}
                  >
                    <div className="font-medium truncate">{thread.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-gray-600">
                      <span>{thread.messageCount} messages</span>
                      <span>-</span>
                      <span>{new Date(thread.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4 border border-indigo-500/20">
              <Sparkles className="w-7 h-7 text-indigo-400" />
            </div>
            <h4 className="text-base font-semibold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Ready to Help
            </h4>
            <p className="text-gray-400 text-sm max-w-sm mb-5">
              Ask any question about your health check report.
            </p>
            
            <div className="w-full max-w-md">
              <p className="text-xs text-gray-600 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_QUESTIONS.slice(0, 4).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(question)}
                    disabled={disabled || isLoading}
                    className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-gray-300 
                             hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/30
                             transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                             border border-white/10"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages
              .filter((message) => message.role !== 'system') // Filter out system messages
              .map((message, index, filteredMessages) => (
              <Message
                key={message.id}
                role={message.role as 'user' | 'assistant'}
                content={message.content}
                citations={message.citations}
                timestamp={message.timestamp}
                isTyping={
                  message.role === 'assistant' &&
                  index === filteredMessages.length - 1 &&
                  isLoading &&
                  !message.content
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 mx-4 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Input - Fixed */}
      <div className="flex-shrink-0 p-4 border-t border-white/5">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "Upload a report to start..." : "Ask about the report..."}
              disabled={disabled || isLoading}
              rows={1}
              className="input-modern w-full resize-none pr-16 min-h-[44px] max-h-24 text-sm py-3"
            />
            <div className="absolute right-3 bottom-3 text-xs text-gray-600 flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">↵</kbd>
            </div>
          </div>
          {isLoading ? (
            <button
              type="button"
              onClick={stopGeneration}
              className="btn-primary px-4 flex items-center justify-center min-w-[44px] cursor-pointer"
              title="Stop generation"
            >
              <span className="relative z-10">
                <Square className="w-4 h-4 fill-current" />
              </span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !input.trim()}
              className="btn-primary px-4 flex items-center justify-center min-w-[44px]"
            >
              <span className="relative z-10">
                <Send className="w-4 h-4" />
              </span>
            </button>
          )}
        </form>
        
        {messages.length > 0 && suggestedQuestions.length > 0 && !isLoading && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2">Follow-up questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(question)}
                  disabled={disabled || isLoading}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 
                           text-gray-300 hover:from-indigo-500/20 hover:to-purple-500/20 hover:text-indigo-200 
                           transition-all duration-200 disabled:opacity-50 border border-indigo-500/20
                           hover:border-indigo-500/40"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
