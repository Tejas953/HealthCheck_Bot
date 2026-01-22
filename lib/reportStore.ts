/**
 * Simple Report Store
 * Stores parsed PDF report text per session
 */

export interface StoredReport {
  sessionId: string;
  filename: string;
  rawText: string;
  uploadedAt: Date;
}

// Global store to persist across module reloads in development
declare global {
  // eslint-disable-next-line no-var
  var reportStore: ReportStore | undefined;
}

/**
 * In-Memory Report Store
 */
class ReportStore {
  private reports: Map<string, StoredReport> = new Map();
  private maxSessions: number = 10;

  constructor() {
    console.log('[ReportStore] Created new store instance');
  }

  /**
   * Store a report
   */
  store(sessionId: string, filename: string, rawText: string): void {
    console.log(`[ReportStore] Storing report for session: ${sessionId}`);

    // Clean up old sessions if limit reached
    if (this.reports.size >= this.maxSessions) {
      const oldestKey = this.reports.keys().next().value;
      if (oldestKey) {
        console.log(`[ReportStore] Removing oldest session: ${oldestKey}`);
        this.reports.delete(oldestKey);
      }
    }

    this.reports.set(sessionId, {
      sessionId,
      filename,
      rawText,
      uploadedAt: new Date(),
    });

    console.log(`[ReportStore] Report stored. Total sessions: ${this.reports.size}`);
  }

  /**
   * Get a stored report
   */
  get(sessionId: string): StoredReport | undefined {
    const report = this.reports.get(sessionId);
    console.log(`[ReportStore] Getting session ${sessionId}: ${report ? 'FOUND' : 'NOT FOUND'}`);
    return report;
  }

  /**
   * Check if session exists
   */
  has(sessionId: string): boolean {
    return this.reports.has(sessionId);
  }

  /**
   * Delete a session
   */
  delete(sessionId: string): void {
    this.reports.delete(sessionId);
    console.log(`[ReportStore] Deleted session: ${sessionId}`);
  }
}

/**
 * Get the global report store
 */
export function getReportStore(): ReportStore {
  if (!global.reportStore) {
    console.log('[ReportStore] Creating new global ReportStore');
    global.reportStore = new ReportStore();
  }
  return global.reportStore;
}

