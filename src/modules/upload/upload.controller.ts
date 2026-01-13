import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as crypto from 'crypto';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  validateUploadedFile,
  removeInvalidFile,
} from '@/common/security/file-validator.util';
import { sanitizeFilename } from '@/common/security/filename-sanitizer.util';
import {
  UploadLoggerService,
  type UploadEvent,
} from '@/common/security/upload-logger.service';
import type { RequestWithUser } from '@/interface/authenticated';

/**
 * Interface for uploaded file metadata from Multer.
 */
interface UploadedFileType {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

/**
 * Allowed MIME types for image uploads.
 * These are validated at the Multer level (header check)
 * and then verified via magic bytes in post-processing.
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
] as const;

/**
 * Maximum file size in bytes (10MB).
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Upload directory path.
 */
const UPLOAD_DESTINATION = './uploads';

/**
 * Upload Controller
 *
 * Handles secure image uploads with:
 * - JWT authentication
 * - Rate limiting (10 uploads per minute per user)
 * - MIME type validation (header + content)
 * - Magic bytes verification
 * - Malware pattern scanning
 * - Structured security logging
 */
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadLogger: UploadLoggerService) {}

  /**
   * Handle image file upload with comprehensive security validation.
   *
   * Security layers:
   * 1. JWT Authentication (via guard)
   * 2. Rate Limiting (10 requests/minute)
   * 3. MIME Type Header Check (Multer)
   * 4. File Size Limit (10MB)
   * 5. Magic Bytes Validation (post-upload)
   * 6. Malware Pattern Scanning (post-upload)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 uploads per minute
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DESTINATION,
        filename: (req, file, cb) => {
          // Sanitize original filename and extract extension
          const sanitized = sanitizeFilename(file.originalname);
          const ext = extname(sanitized);

          // Generate unique filename with UUID
          const uniqueName = `${crypto.randomUUID()}${ext}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1, // Only allow single file upload
      },
      fileFilter: (req, file, cb) => {
        // First layer: Check MIME type header
        if (ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: UploadedFileType | undefined,
    @Req() req: RequestWithUser,
  ) {
    // Extract user info for logging
    const userId = req.user?.userId || 'unknown';
    const userEmail = req.user?.email || 'unknown';
    const clientIp = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Check if file was received
    if (!file) {
      this.uploadLogger.logUploadFailure({
        userId,
        userEmail,
        filename: '',
        originalFilename: '',
        mimeType: '',
        size: 0,
        ip: clientIp,
        userAgent,
        success: false,
        error: 'No file uploaded',
      });
      throw new BadRequestException('No file uploaded');
    }

    // Build upload event for logging
    const uploadEvent: UploadEvent = {
      userId,
      userEmail,
      filename: file.filename,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      ip: clientIp,
      userAgent,
      success: false,
    };

    try {
      // Second layer: Validate file content with magic bytes
      const validationResult = await validateUploadedFile(
        file.path,
        file.mimetype,
        MAX_FILE_SIZE,
      );

      if (!validationResult.isValid) {
        // Remove the invalid file
        await removeInvalidFile(file.path);

        // Log the security event
        uploadEvent.error = validationResult.error;
        uploadEvent.validationDetails = {
          magicBytesValid: false,
          detectedMimeType: validationResult.detectedType,
          suspiciousPatterns: validationResult.suspiciousPatterns,
        };
        this.uploadLogger.logUploadFailure(uploadEvent);

        // Log security alert for potential attacks
        if (validationResult.suspiciousPatterns?.length) {
          this.uploadLogger.logSecurityAlert(
            uploadEvent,
            'MALWARE_PATTERN_DETECTED',
          );
        } else if (validationResult.error?.includes('MIME type mismatch')) {
          this.uploadLogger.logSecurityAlert(uploadEvent, 'MIME_SPOOFING');
        }

        throw new BadRequestException(
          'File validation failed: ' + validationResult.error,
        );
      }

      // Build response URL
      const baseUrl = this.getBaseUrl(req);
      const relativePath = `/uploads/${file.filename}`;

      // Log successful upload
      uploadEvent.success = true;
      uploadEvent.validationDetails = {
        magicBytesValid: true,
        detectedMimeType: validationResult.detectedType,
      };
      this.uploadLogger.logUploadSuccess(uploadEvent);

      return {
        success: true,
        url: `${baseUrl}${relativePath}`,
        relativePath,
        publicId: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      // Handle unexpected errors
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Clean up file on error
      await removeInvalidFile(file.path);

      uploadEvent.error =
        error instanceof Error ? error.message : 'Unknown error';
      this.uploadLogger.logUploadFailure(uploadEvent);

      throw new BadRequestException('File upload failed: ' + uploadEvent.error);
    }
  }

  /**
   * Extracts client IP address from request,
   * considering reverse proxy headers.
   */
  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0].split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  /**
   * Builds the base URL for uploaded file URLs,
   * considering reverse proxy configuration.
   */
  private getBaseUrl(req: Request): string {
    // Check for environment variable first
    if (process.env.PUBLIC_ASSET_URL) {
      return process.env.PUBLIC_ASSET_URL;
    }
    if (process.env.BASE_URL) {
      return process.env.BASE_URL;
    }

    // Infer from request headers (for reverse proxy)
    const forwardedProto = (req.headers['x-forwarded-proto'] as string)?.split(
      ',',
    )[0];
    const forwardedHost = (req.headers['x-forwarded-host'] as string)?.split(
      ',',
    )[0];

    if (forwardedProto && forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    // Fallback to request info
    return `${req.protocol}://${req.get('host') ?? 'localhost:3000'}`;
  }
}
