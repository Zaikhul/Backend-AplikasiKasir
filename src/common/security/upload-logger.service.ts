/**
 * Upload Logger Service
 * Provides structured logging for file upload events
 * to support security auditing and monitoring.
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Upload event data for logging.
 */
export interface UploadEvent {
  userId: string;
  userEmail?: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  ip?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  validationDetails?: {
    magicBytesValid?: boolean;
    detectedMimeType?: string;
    suspiciousPatterns?: string[];
  };
}

/**
 * Rate tracking per user.
 */
interface RateTracker {
  count: number;
  windowStart: number;
  lastUpload: number;
}

@Injectable()
export class UploadLoggerService {
  private readonly logger = new Logger('UploadSecurity');

  /**
   * Track upload rates per user to detect abuse.
   * Key: userId, Value: rate tracking info
   */
  private uploadRates: Map<string, RateTracker> = new Map();

  /**
   * Rate limit window in milliseconds (1 minute).
   */
  private readonly RATE_WINDOW_MS = 60000;

  /**
   * Threshold for flagging rapid uploads.
   */
  private readonly RAPID_UPLOAD_THRESHOLD = 5;

  /**
   * Logs a successful upload event.
   */
  logUploadSuccess(event: UploadEvent): void {
    const logData = this.buildLogData(event);

    this.logger.log(
      `UPLOAD_SUCCESS | User: ${event.userId} | File: ${event.filename} | Size: ${this.formatBytes(event.size)}`,
    );

    // Check for suspicious patterns in upload behavior
    const anomalies = this.detectAnomalies(event);
    if (anomalies.length > 0) {
      this.logger.warn(
        `UPLOAD_ANOMALY | User: ${event.userId} | Anomalies: ${anomalies.join(', ')}`,
      );
    }

    // Track upload rate
    this.trackUploadRate(event.userId);
  }

  /**
   * Logs a failed upload event.
   */
  logUploadFailure(event: UploadEvent): void {
    const logData = this.buildLogData(event);

    this.logger.warn(
      `UPLOAD_FAILURE | User: ${event.userId} | File: ${event.originalFilename} | Error: ${event.error}`,
    );

    // Log additional details for security analysis
    if (event.validationDetails) {
      this.logger.warn(
        `UPLOAD_VALIDATION | User: ${event.userId} | ` +
          `MagicBytesValid: ${event.validationDetails.magicBytesValid} | ` +
          `DetectedType: ${event.validationDetails.detectedMimeType || 'unknown'} | ` +
          `SuspiciousPatterns: ${event.validationDetails.suspiciousPatterns?.join(', ') || 'none'}`,
      );
    }

    // Check for attack patterns
    if (this.isLikelyAttack(event)) {
      this.logger.error(
        `UPLOAD_ATTACK_DETECTED | User: ${event.userId} | ` +
          `IP: ${event.ip || 'unknown'} | ` +
          `Filename: ${event.originalFilename} | ` +
          `Reason: ${event.error}`,
      );
    }

    // Track upload rate even for failures
    this.trackUploadRate(event.userId);
  }

  /**
   * Logs a suspicious upload attempt that may indicate an attack.
   */
  logSecurityAlert(event: UploadEvent, alertType: string): void {
    this.logger.error(
      `SECURITY_ALERT | Type: ${alertType} | ` +
        `User: ${event.userId} | ` +
        `IP: ${event.ip || 'unknown'} | ` +
        `File: ${event.originalFilename} | ` +
        `Size: ${event.size}`,
    );
  }

  /**
   * Checks if upload rate is within acceptable limits.
   * Returns false if rate is exceeded, indicating potential abuse.
   */
  checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const tracker = this.uploadRates.get(userId);

    if (!tracker) {
      return { allowed: true, remaining: this.RAPID_UPLOAD_THRESHOLD };
    }

    // Reset window if expired
    if (now - tracker.windowStart > this.RATE_WINDOW_MS) {
      this.uploadRates.set(userId, {
        count: 0,
        windowStart: now,
        lastUpload: tracker.lastUpload,
      });
      return { allowed: true, remaining: this.RAPID_UPLOAD_THRESHOLD };
    }

    const remaining = Math.max(0, this.RAPID_UPLOAD_THRESHOLD - tracker.count);
    return { allowed: remaining > 0, remaining };
  }

  /**
   * Builds structured log data from upload event.
   */
  private buildLogData(event: UploadEvent): Record<string, unknown> {
    return {
      timestamp: new Date().toISOString(),
      event: event.success ? 'upload_success' : 'upload_failure',
      userId: event.userId,
      userEmail: event.userEmail,
      filename: event.filename,
      originalFilename: event.originalFilename,
      mimeType: event.mimeType,
      size: event.size,
      sizeFormatted: this.formatBytes(event.size),
      ip: event.ip,
      userAgent: event.userAgent,
      success: event.success,
      error: event.error,
      validation: event.validationDetails,
    };
  }

  /**
   * Tracks upload rate for a user.
   */
  private trackUploadRate(userId: string): void {
    const now = Date.now();
    const tracker = this.uploadRates.get(userId);

    if (!tracker || now - tracker.windowStart > this.RATE_WINDOW_MS) {
      this.uploadRates.set(userId, {
        count: 1,
        windowStart: now,
        lastUpload: now,
      });
    } else {
      tracker.count++;
      tracker.lastUpload = now;
    }
  }

  /**
   * Detects anomalies in upload behavior.
   */
  private detectAnomalies(event: UploadEvent): string[] {
    const anomalies: string[] = [];
    const tracker = this.uploadRates.get(event.userId);

    if (tracker) {
      // Check for rapid sequential uploads
      const timeSinceLastUpload = Date.now() - tracker.lastUpload;
      if (timeSinceLastUpload < 1000) {
        anomalies.push('rapid_sequential_uploads');
      }

      // Check for high volume in window
      if (tracker.count >= this.RAPID_UPLOAD_THRESHOLD) {
        anomalies.push('high_upload_volume');
      }
    }

    // Check for unusual file sizes
    if (event.size > 5 * 1024 * 1024) {
      anomalies.push('large_file_size');
    }

    // Check for suspicious filename patterns
    if (this.hasSuspiciousFilename(event.originalFilename)) {
      anomalies.push('suspicious_filename');
    }

    return anomalies;
  }

  /**
   * Checks if an upload failure appears to be an attack attempt.
   */
  private isLikelyAttack(event: UploadEvent): boolean {
    // MIME type mismatch indicates possible malware disguise
    if (event.error?.includes('MIME type mismatch')) {
      return true;
    }

    // Suspicious patterns detected
    if (
      event.validationDetails?.suspiciousPatterns &&
      event.validationDetails.suspiciousPatterns.length > 0
    ) {
      return true;
    }

    // Suspicious filename
    if (this.hasSuspiciousFilename(event.originalFilename)) {
      return true;
    }

    return false;
  }

  /**
   * Checks if filename contains suspicious patterns.
   */
  private hasSuspiciousFilename(filename: string): boolean {
    const suspiciousPatterns = [
      /\.(php|asp|aspx|jsp|exe|sh|bash|cmd|bat|ps1)$/i,
      /\.(js|html|htm|svg)$/i,
      /\.\./, // Directory traversal
      /[<>:"|?*]/, // Special characters
      /\x00/, // Null byte
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(filename));
  }

  /**
   * Formats bytes to human-readable string.
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
