'use client';

import React from 'react';
import { User, Bot, BookOpen, AlertCircle } from 'lucide-react';
import { Citation } from '@/utils/types';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isGrounded?: boolean;
  timestamp?: Date;
  isTyping?: boolean;
}

export default function Message({
  role,
  content,
  citations = [],
  isGrounded = true,
  timestamp,
  isTyping = false,
}: MessageProps) {
  const isUser = role === 'user';

  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <li key={i} className="ml-4 list-disc text-inherit">
            {formatInline(line.substring(2))}
          </li>
        );
      }
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
      if (numberedMatch) {
        return (
          <li key={i} className="ml-4 list-decimal text-inherit">
            {formatInline(numberedMatch[2])}
          </li>
        );
      }
      return line ? (
        <p key={i} className="mb-2 last:mb-0 text-inherit">
          {formatInline(line)}
        </p>
      ) : (
        <br key={i} />
      );
    });
  };

  const formatInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-xs"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} reveal`}>
      {/* Avatar */}
      <div
        className={`
          w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
          ${isUser 
            ? 'bg-gradient-to-br from-indigo-500 to-purple-500' 
            : 'bg-gradient-to-br from-gray-700 to-gray-800 border border-white/10'
          }
        `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-gray-300" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        <div
          className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${isUser 
              ? 'message-user' 
              : 'message-assistant'
            }
          `}
        >
          {isTyping ? (
            <div className="flex items-center gap-1.5 py-1 px-1">
              <span className="typing-dot w-2 h-2 rounded-full bg-gray-400" />
              <span className="typing-dot w-2 h-2 rounded-full bg-gray-400" />
              <span className="typing-dot w-2 h-2 rounded-full bg-gray-400" />
            </div>
          ) : (
            <div>{formatContent(content)}</div>
          )}
        </div>

        {/* Not Grounded Warning */}
        {!isUser && !isTyping && !isGrounded && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Information not found in report</span>
          </div>
        )}

        {/* Citations */}
        {!isUser && !isTyping && citations.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Sources</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {citations.map((citation, index) => (
                <div key={index} className="group relative">
                  <span className="badge badge-info text-[10px] cursor-help">
                    {citation.section}
                  </span>
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20">
                    <div className="glass-card rounded-lg p-3 max-w-xs shadow-xl border border-white/10">
                      <p className="text-xs text-gray-300 line-clamp-3">
                        "{citation.excerpt}"
                      </p>
                      <p className="text-[10px] text-gray-500 mt-2">
                        Relevance: {(citation.relevanceScore * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        {timestamp && !isTyping && (
          <span className="text-[10px] text-gray-600 mt-1.5">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
