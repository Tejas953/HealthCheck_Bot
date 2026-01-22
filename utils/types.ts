/**
 * Type definitions for the Contentstack Health Check Bot
 */

// Represents a chunk of the parsed document
export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    section: string;
    pageNumber?: number;
    chunkIndex: number;
    startChar: number;
    endChar: number;
  };
}

// Represents the parsed document with all its chunks
export interface ParsedDocument {
  id: string;
  filename: string;
  fileType: string;
  rawText: string;
  chunks: DocumentChunk[];
  uploadedAt: Date;
}

// Chat message structure
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  citations?: Citation[];
}

// Citation for grounded responses
export interface Citation {
  chunkId: string;
  section: string;
  excerpt: string;
  relevanceScore: number;
}

// API response types
export interface UploadResponse {
  success: boolean;
  sessionId: string;
  filename: string;
  chunksCreated: number;
  message: string;
}

export interface SummarizeResponse {
  success: boolean;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  riskAreas: string[];
}

// Answer source type
export type AnswerSource = 'report' | 'contentstack_knowledge' | 'custom' | 'mixed';

export interface ChatResponse {
  success: boolean;
  answer: string;
  citations: Citation[];
  isGrounded: boolean;
  suggestedQuestions?: string[];
  source?: AnswerSource;
}

// Health check report sections (common structure)
export interface HealthCheckSections {
  overview?: string;
  stackConfiguration?: string;
  contentTypes?: string;
  entries?: string;
  assets?: string;
  workflows?: string;
  extensions?: string;
  webhooks?: string;
  releases?: string;
  users?: string;
  security?: string;
  performance?: string;
  recommendations?: string;
}
