/**
 * Report Parser Utility
 * Handles parsing of Contentstack Health Check Report PDF/DOC/TXT files
 * Optimized for the specific format of Contentstack reports
 */

import { ParsedDocument, DocumentChunk } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Parse uploaded file based on its type
 */
export async function parseReport(
  fileBuffer: Buffer,
  filename: string,
  fileType: string
): Promise<ParsedDocument> {
  let rawText = '';

  console.log(`[Parser] Starting to parse file: ${filename}, type: ${fileType}, size: ${fileBuffer.length} bytes`);

  try {
    switch (fileType) {
      case 'application/pdf':
        rawText = await parsePDF(fileBuffer);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        rawText = await parseDOC(fileBuffer);
        break;
      case 'text/plain':
        rawText = fileBuffer.toString('utf-8');
        break;
      default:
        // Try to parse as text if MIME type is not recognized
        console.log(`[Parser] Unknown MIME type, attempting text parse`);
        rawText = fileBuffer.toString('utf-8');
    }
  } catch (parseError) {
    console.error('[Parser] Parse error:', parseError);
    throw parseError;
  }

  console.log(`[Parser] Raw text extracted, length: ${rawText.length} characters`);

  // Check if we got any content
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('No text content could be extracted from the file');
  }

  // Clean and normalize the text
  rawText = normalizeText(rawText);
  console.log(`[Parser] Normalized text length: ${rawText.length} characters`);

  // Create chunks from the raw text - optimized for Contentstack health check format
  const chunks = createHealthCheckChunks(rawText);
  console.log(`[Parser] Created ${chunks.length} chunks`);

  return {
    id: uuidv4(),
    filename,
    fileType,
    rawText,
    chunks,
    uploadedAt: new Date(),
  };
}

/**
 * Parse PDF file to text
 * Uses pdf-parse with workaround for Next.js compatibility
 */
async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import with Next.js compatible path
    // @ts-ignore - pdf-parse module resolution
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    
    const data = await pdfParse(buffer, {
      max: 0, // No limit on pages
    });
    
    console.log(`[PDF Parser] Successfully parsed PDF with ${data.numpages} pages`);
    return data.text || '';
  } catch (error) {
    console.error('[PDF Parser] Primary method error:', error);
    
    // Fallback method
    try {
      console.log('[PDF Parser] Trying fallback method...');
      const pdfParseFallback = await import('pdf-parse');
      const data = await pdfParseFallback.default(buffer);
      return data.text || '';
    } catch (fallbackError) {
      console.error('[PDF Parser] Fallback also failed:', fallbackError);
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Parse DOC/DOCX file to text
 */
async function parseDOC(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    console.log(`[DOC Parser] Successfully extracted ${result.value.length} characters`);
    return result.value;
  } catch (error) {
    console.error('[DOC Parser] Error:', error);
    throw new Error(`Failed to parse DOC file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Normalize text by cleaning whitespace and special characters
 */
function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    // Replace various unicode spaces with regular space
    .replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace multiple newlines with double newline (preserve paragraph structure)
    .replace(/\n{3,}/g, '\n\n')
    // Replace multiple spaces with single space (but preserve newlines)
    .replace(/[^\S\n]+/g, ' ')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}

/**
 * Identify section for Contentstack Health Check Report
 */
function identifyHealthCheckSection(text: string): string {
  const textLower = text.toLowerCase().substring(0, 300);
  
  // Contentstack Health Check specific sections
  const sectionPatterns: Record<string, RegExp[]> = {
    'Content Modelling': [
      /content\s*modelling/i,
      /content\s*modeling/i,
      /content\s*model/i,
    ],
    'Actions Required': [
      /actions?\s*required/i,
      /action\s*items/i,
    ],
    'Content Types': [
      /content\s*types?\s*title/i,
      /rarely\s*used\s*content\s*types/i,
      /unused\s*content\s*types/i,
    ],
    'Global Fields': [
      /global\s*fields/i,
      /unused\s*global\s*fields/i,
    ],
    'Areas of Opportunities': [
      /areas?\s*of\s*opportunit/i,
    ],
    'Naming Standards': [
      /naming\s*standards/i,
      /naming\s*convention/i,
      /recommendation\s*message/i,
      /recommended\s*title/i,
    ],
    'Validation Rules': [
      /validation\s*rules/i,
      /field\s*name/i,
    ],
    'Descriptions': [
      /descriptions?:/i,
      /content\s*types.*description/i,
    ],
    'Entries': [
      /entries/i,
      /entry\s*count/i,
    ],
    'Assets': [
      /assets?/i,
      /media/i,
    ],
    'Workflows': [
      /workflows?/i,
      /publishing/i,
    ],
    'Webhooks': [
      /webhooks?/i,
    ],
    'Extensions': [
      /extensions?/i,
      /custom\s*fields?/i,
    ],
    'Users & Roles': [
      /users?\s*(&|and)\s*roles?/i,
      /permissions?/i,
    ],
    'Security': [
      /security/i,
      /api\s*keys?/i,
      /tokens?/i,
    ],
    'Performance': [
      /performance/i,
      /optimization/i,
    ],
    'Recommendations': [
      /recommendations?/i,
      /suggestions?/i,
    ],
    'Stack Overview': [
      /stack\s*overview/i,
      /stack\s*info/i,
      /stack\s*details/i,
    ],
    'Locales': [
      /locales?/i,
      /languages?/i,
    ],
    'Environments': [
      /environments?/i,
      /branches?/i,
    ],
  };

  for (const [section, patterns] of Object.entries(sectionPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(textLower)) {
        return section;
      }
    }
  }

  return 'General';
}

/**
 * Check if text contains a table
 */
function containsTable(text: string): boolean {
  // Check for "Displaying X of Y records" pattern
  if (/displaying\s+\d+\s+(of\s+)?\d+\s*records?/i.test(text)) {
    return true;
  }
  // Check for column headers typical in health check reports
  if (/content\s*types?\s*title|created\s*on|field\s*name|recommendation/i.test(text)) {
    return true;
  }
  return false;
}

/**
 * Create chunks optimized for Contentstack Health Check Report format
 */
function createHealthCheckChunks(text: string, maxChunkSize = 1500, overlap = 200): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  
  if (!text || text.trim().length === 0) {
    return chunks;
  }

  // Contentstack Health Check Report section patterns
  const sectionSplitPatterns = [
    // Main section headers
    /\n(?=Content\s*Modelling)/gi,
    /\n(?=Actions\s*Required)/gi,
    /\n(?=Areas\s*of\s*Opportunities)/gi,
    /\n(?=Global\s*Fields)/gi,
    /\n(?=Naming\s*Standards)/gi,
    /\n(?=Validation\s*Rules)/gi,
    /\n(?=Stack\s*Overview)/gi,
    /\n(?=Security)/gi,
    /\n(?=Performance)/gi,
    /\n(?=Recommendations)/gi,
    // Subsection patterns
    /\n(?=•\s*[A-Z])/g,  // Bullet points
    /\n(?=Displaying\s+\d+)/gi, // Table headers
    /\n(?=Page\s+\d+\s+of\s+\d+)/gi, // Page breaks
  ];

  // Try to split by main sections first
  let sections: string[] = [text];
  
  // Split by main sections
  const mainSectionPattern = /\n(?=(Content\s*Modelling|Actions\s*Required|Areas\s*of\s*Opportunities|Global\s*Fields|Naming\s*Standards|Validation\s*Rules|Stack\s*Overview|Security|Performance|Recommendations|Entries|Assets|Workflows|Webhooks|Extensions|Users|Locales|Environments))/gi;
  
  const mainSections = text.split(mainSectionPattern).filter(s => s && s.trim().length > 0);
  
  if (mainSections.length > 1) {
    sections = mainSections;
    console.log(`[Parser] Split into ${sections.length} main sections`);
  } else {
    // Try splitting by bullet points and subsections
    const bulletPattern = /\n(?=•\s+[A-Z][a-z])/g;
    const bulletSections = text.split(bulletPattern).filter(s => s && s.trim().length > 0);
    
    if (bulletSections.length > 1) {
      sections = bulletSections;
      console.log(`[Parser] Split into ${sections.length} bullet sections`);
    } else {
      // Fall back to paragraph splitting
      sections = text.split(/\n\n+/).filter(s => s && s.trim().length > 0);
      console.log(`[Parser] Split into ${sections.length} paragraphs`);
    }
  }

  let globalCharIndex = 0;
  let chunkIndex = 0;

  for (const section of sections) {
    const trimmedSection = section.trim();
    if (!trimmedSection || trimmedSection.length < 20) continue; // Skip very short sections

    // If section is small enough, keep it as one chunk
    if (trimmedSection.length <= maxChunkSize) {
      const sectionName = identifyHealthCheckSection(trimmedSection);
      chunks.push({
        id: uuidv4(),
        content: trimmedSection,
        metadata: {
          section: sectionName,
          chunkIndex: chunkIndex++,
          startChar: globalCharIndex,
          endChar: globalCharIndex + trimmedSection.length,
        },
      });
      globalCharIndex += section.length;
    } else {
      // Split large sections - try to keep tables together
      const sectionName = identifyHealthCheckSection(trimmedSection);
      
      // Check if this section contains a table
      if (containsTable(trimmedSection)) {
        // Try to split before/after table
        const tableStartMatch = trimmedSection.match(/Displaying\s+\d+/i);
        if (tableStartMatch && tableStartMatch.index) {
          // Content before table
          const beforeTable = trimmedSection.substring(0, tableStartMatch.index).trim();
          if (beforeTable.length > 50) {
            chunks.push({
              id: uuidv4(),
              content: beforeTable,
              metadata: {
                section: sectionName,
                chunkIndex: chunkIndex++,
                startChar: globalCharIndex,
                endChar: globalCharIndex + beforeTable.length,
              },
            });
          }
          
          // Table content (may be large, but keep together for context)
          const tableContent = trimmedSection.substring(tableStartMatch.index).trim();
          if (tableContent.length > 0) {
            // If table is too large, split it
            if (tableContent.length > maxChunkSize * 2) {
              const tableChunks = splitTableContent(tableContent, maxChunkSize, sectionName, chunkIndex, globalCharIndex + (tableStartMatch.index || 0));
              chunks.push(...tableChunks);
              chunkIndex += tableChunks.length;
            } else {
              chunks.push({
                id: uuidv4(),
                content: tableContent,
                metadata: {
                  section: sectionName + ' - Table Data',
                  chunkIndex: chunkIndex++,
                  startChar: globalCharIndex + (tableStartMatch.index || 0),
                  endChar: globalCharIndex + trimmedSection.length,
                },
              });
            }
          }
        } else {
          // No clear table start, split normally
          splitLargeSection(trimmedSection, sectionName, maxChunkSize, overlap, chunks, chunkIndex, globalCharIndex);
        }
      } else {
        // No table, split normally
        const newChunks = splitLargeSection(trimmedSection, sectionName, maxChunkSize, overlap, chunks, chunkIndex, globalCharIndex);
        chunkIndex += newChunks;
      }
      
      globalCharIndex += section.length;
    }
  }

  // If still no chunks, create one from entire text
  if (chunks.length === 0 && text.trim().length > 0) {
    const content = text.trim().substring(0, maxChunkSize * 2);
    chunks.push({
      id: uuidv4(),
      content,
      metadata: {
        section: 'General',
        chunkIndex: 0,
        startChar: 0,
        endChar: content.length,
      },
    });
  }

  console.log(`[Parser] Final chunk count: ${chunks.length}`);
  return chunks;
}

/**
 * Split table content intelligently
 */
function splitTableContent(
  tableContent: string,
  maxSize: number,
  sectionName: string,
  startIndex: number,
  startChar: number
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const lines = tableContent.split('\n');
  
  let currentChunk = '';
  let chunkIndex = startIndex;
  let currentStartChar = startChar;
  
  // Try to keep header with first few rows
  const headerMatch = tableContent.match(/Displaying\s+\d+.*?records?\s*/i);
  const header = headerMatch ? headerMatch[0] : '';
  
  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxSize && currentChunk.length > 0) {
      chunks.push({
        id: uuidv4(),
        content: currentChunk.trim(),
        metadata: {
          section: sectionName + ' - Table Data',
          chunkIndex: chunkIndex++,
          startChar: currentStartChar,
          endChar: currentStartChar + currentChunk.length,
        },
      });
      currentStartChar += currentChunk.length;
      currentChunk = header; // Include header in subsequent chunks for context
    }
    currentChunk += (currentChunk ? '\n' : '') + line;
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: uuidv4(),
      content: currentChunk.trim(),
      metadata: {
        section: sectionName + ' - Table Data',
        chunkIndex: chunkIndex,
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length,
      },
    });
  }
  
  return chunks;
}

/**
 * Split large section into chunks with overlap
 */
function splitLargeSection(
  text: string,
  sectionName: string,
  maxSize: number,
  overlap: number,
  chunks: DocumentChunk[],
  startChunkIndex: number,
  globalCharIndex: number
): number {
  let start = 0;
  let chunksCreated = 0;

  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);
    
    if (end < text.length) {
      // Look for good break points
      const searchArea = text.substring(start, end);
      const breakPoints = [
        searchArea.lastIndexOf('\n\n'),  // Paragraph break
        searchArea.lastIndexOf('. '),     // Sentence end
        searchArea.lastIndexOf('\n'),     // Line break
        searchArea.lastIndexOf(', '),     // Comma
      ];
      
      const bestBreak = Math.max(...breakPoints.filter(b => b > maxSize / 3));
      if (bestBreak > 0) {
        end = start + bestBreak + 1;
      }
    }

    const chunkText = text.substring(start, end).trim();
    
    if (chunkText && chunkText.length > 20) {
      chunks.push({
        id: uuidv4(),
        content: chunkText,
        metadata: {
          section: sectionName,
          chunkIndex: startChunkIndex + chunksCreated,
          startChar: globalCharIndex + start,
          endChar: globalCharIndex + end,
        },
      });
      chunksCreated++;
    }

    // Move start with overlap
    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end;
  }

  return chunksCreated;
}

/**
 * Extract key metadata from Contentstack Health Check Report
 */
export function extractMetadata(text: string): Record<string, string> {
  const metadata: Record<string, string> = {};

  // Patterns specific to Contentstack Health Check Reports
  const patterns: Record<string, RegExp> = {
    stackName: /stack\s*(?:name)?[:\s]+([^\n,]+)/i,
    stackUid: /stack\s*uid[:\s]+([^\n,\s]+)/i,
    apiKey: /api\s*key[:\s]+([^\n,\s]+)/i,
    reportDate: /(?:generated|created|date)[:\s]+([^\n]+)/i,
    environment: /environment[:\s]+([^\n,]+)/i,
    region: /region[:\s]+([^\n,]+)/i,
    organization: /organization[:\s]+([^\n,]+)/i,
    totalContentTypes: /(?:total\s+)?content\s*types?[:\s]+(\d+)/i,
    totalEntries: /(?:total\s+)?entries[:\s]+(\d+)/i,
    totalAssets: /(?:total\s+)?assets[:\s]+(\d+)/i,
    totalGlobalFields: /(?:total\s+)?global\s*fields[:\s]+(\d+)/i,
    pageCount: /page\s+\d+\s+of\s+(\d+)/i,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match && match[1]) {
      metadata[key] = match[1].trim();
    }
  }

  return metadata;
}
