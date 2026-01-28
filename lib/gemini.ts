/**
 * Gemini Client
 * Interfaces with Google's Gemini API
 */

export interface GeminiRequest {
  prompt: string;
  maxTokens?: number;
}

export interface GeminiVisionRequest {
  prompt: string;
  imageBase64: string;
  mimeType: string;
  maxTokens?: number;
}

export interface GeminiResponse {
  text: string;
  success: boolean;
  error?: string;
}

// Model to use - defaults to gemini-2.0-flash, can be overridden via env
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gemini Client
 */
export class GeminiClient {
  private apiKey: string;
  private maxRetries: number = 2; // Reduced from 5 - most errors aren't transient

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate response from Gemini with retry logic
   * @param request - The request containing prompt and optional maxTokens
   * @param skipRetry - If true, don't retry on failure (for non-critical operations)
   */
  async generate(request: GeminiRequest, skipRetry: boolean = false): Promise<GeminiResponse> {
    console.log(`[Gemini] Using model: ${GEMINI_MODEL}`);
    console.log(`[Gemini] Prompt length: ${request.prompt.length} characters`);
    
    let lastError: Error | null = null;
    const maxAttempts = skipRetry ? 1 : this.maxRetries;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: request.prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: request.maxTokens || 4000, // Allow detailed responses
              temperature: 0.2,
            },
          }),
        });

        // Handle rate limiting - only retry for rate limits
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData?.error?.message || '';
          
          // Extract wait time from headers or use default (shorter default)
          const retryAfter = response.headers.get('retry-after');
          let waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 10000; // 10s default instead of 60s
          
          // Cap wait time at 30 seconds
          waitTime = Math.min(waitTime, 30000);
          
          console.log(`[Gemini] Rate limited (attempt ${attempt + 1}/${maxAttempts}). Waiting ${Math.round(waitTime/1000)}s...`);
          
          lastError = new Error(`Rate limited. Please wait and try again. ${errorMessage}`);
          
          if (attempt < maxAttempts - 1) {
            await sleep(waitTime);
            continue;
          }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[Gemini] API error:', response.status, errorData);
          // Don't retry on API errors - they're usually not transient
          return {
            text: '',
            success: false,
            error: `Gemini API error: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`,
          };
        }

        const data = await response.json();
        
        // Extract text from Gemini response
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const finishReason = data.candidates?.[0]?.finishReason;
        const promptFeedback = data.promptFeedback?.blockReason;
        
        // Handle MAX_TOKENS - return partial content if available
        if (finishReason === 'MAX_TOKENS' && text) {
          console.log(`[Gemini] Response truncated (MAX_TOKENS), returning partial: ${text.length} chars`);
          return {
            text: text + '\n\n[Response truncated due to length]',
            success: true,
          };
        }
        
        if (!text) {
          console.log(`[Gemini] Empty response. finishReason: ${finishReason}, blockReason: ${promptFeedback}`);
          
          // Don't retry on empty responses - they won't suddenly start working
          return {
            text: '',
            success: false,
            error: finishReason === 'SAFETY' 
              ? 'Response blocked due to safety settings'
              : promptFeedback 
                ? `Prompt blocked: ${promptFeedback}`
                : finishReason === 'MAX_TOKENS'
                  ? 'Response too long - try asking a more specific question'
                  : 'Empty response from Gemini',
          };
        }
        
        console.log(`[Gemini] Response received: ${text.length} characters`);

        return {
          text,
          success: true,
        };
      } catch (error) {
        console.error(`[Gemini] Attempt ${attempt + 1} failed:`, error);
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on non-retryable errors
        if (lastError.message.includes('API key') || 
            lastError.message.includes('Invalid') ||
            lastError.message.includes('authentication') ||
            lastError.message.includes('Empty response') ||
            lastError.message.includes('blocked')) {
          break;
        }
        
        // Short wait before retry for network errors only
        if (attempt < maxAttempts - 1) {
          const delay = 2000; // Fixed 2s delay instead of increasing
          console.log(`[Gemini] Waiting ${delay/1000}s before retry...`);
          await sleep(delay);
        }
      }
    }

    return {
      text: '',
      success: false,
      error: lastError?.message || 'Failed after retries',
    };
  }

  /**
   * Analyze an image using Gemini Vision API
   * @param request - The request containing prompt, image data, and mime type
   */
  async analyzeImage(request: GeminiVisionRequest): Promise<GeminiResponse> {
    // Use gemini-2.0-flash for vision (supports images)
    const visionModel = 'gemini-2.0-flash';
    console.log(`[Gemini Vision] Using model: ${visionModel}`);
    console.log(`[Gemini Vision] Image size: ${Math.round(request.imageBase64.length / 1024)}KB`);
    
    try {
      const url = `${GEMINI_API_URL}/${visionModel}:generateContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: request.prompt,
                },
                {
                  inline_data: {
                    mime_type: request.mimeType,
                    data: request.imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: request.maxTokens || 2000,
            temperature: 0.1, // Lower temperature for more accurate extraction
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Gemini Vision] API error:', response.status, errorData);
        return {
          text: '',
          success: false,
          error: `Gemini Vision API error: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`,
        };
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!text) {
        console.log('[Gemini Vision] Empty response');
        return {
          text: '',
          success: false,
          error: 'Empty response from Gemini Vision',
        };
      }
      
      console.log(`[Gemini Vision] Response received: ${text.length} characters`);
      return {
        text,
        success: true,
      };
    } catch (error) {
      console.error('[Gemini Vision] Error:', error);
      return {
        text: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
let geminiClient: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    geminiClient = new GeminiClient(apiKey);
  }
  return geminiClient;
}

/**
 * Create a new Gemini client with a specific API key
 */
export function createGeminiClient(apiKey: string): GeminiClient {
  return new GeminiClient(apiKey);
}
