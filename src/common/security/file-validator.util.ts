/**
 * File Validator Utility
 * Validates file content using magic bytes (file signatures) to prevent
 * malicious files disguised with fake MIME types.
 */

import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Magic byte signatures for common image formats.
 * These are the first bytes of valid image files.
 */
const MAGIC_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [
    [0xff, 0xd8, 0xff, 0xe0], // JFIF
    [0xff, 0xd8, 0xff, 0xe1], // EXIF
    [0xff, 0xd8, 0xff, 0xe2], // ICC
    [0xff, 0xd8, 0xff, 0xe8], // SPIFF
    [0xff, 0xd8, 0xff, 0xdb], // Raw JPEG
    [0xff, 0xd8, 0xff, 0xee], // Adobe
  ],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP starts with RIFF)
  'image/bmp': [[0x42, 0x4d]], // BM
  'image/tiff': [
    [0x49, 0x49, 0x2a, 0x00], // Little-endian
    [0x4d, 0x4d, 0x00, 0x2a], // Big-endian
  ],
  'image/heic': [[0x00, 0x00, 0x00]], // HEIC/HEIF (ftyp box)
  'image/heif': [[0x00, 0x00, 0x00]], // HEIC/HEIF (ftyp box)
};

/**
 * Suspicious patterns that may indicate embedded malicious code.
 * These patterns are commonly found in crypto miners and malware.
 * NOTE: These are only checked on text-like content, not raw binary.
 */
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /<script[\s>]/i,
  /javascript:/i,
  /eval\s*\(/i,
  /document\.(cookie|write|location)/i,
  /window\.(location|open)/i,
  /\.createElement\s*\(\s*['"]script['"]\s*\)/i,
  /coinhive/i,
  /cryptonight/i,
  /minero|coinimp|cryptoloot/i,
  /WebAssembly\.instantiate/i,
  /wasm.*crypto/i,
  /miner\.start/i,
  /__proto__|constructor\s*\[/i,
];

/**
 * Patterns that indicate server-side code injection.
 * Only checked if the file appears to contain text content.
 */
const SERVER_CODE_PATTERNS: RegExp[] = [
  /<\?php/i, // Full PHP opening tag, not just "php"
  /<%[\s=@]/i, // ASP/JSP with valid syntax, not just <%
  /\.aspx?\s/i, // ASP extension with context
];

/**
 * Checks if content appears to be primarily text (not binary).
 * Binary content has high ratio of non-printable characters.
 */
function isTextLikeContent(buffer: Buffer, sampleSize: number = 1024): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, sampleSize));
  let nonPrintable = 0;

  for (const byte of sample) {
    // Count bytes outside printable ASCII range (excluding common whitespace)
    if ((byte < 0x20 || byte > 0x7e) && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) {
      nonPrintable++;
    }
  }

  // If more than 30% non-printable, it's likely binary
  return nonPrintable / sample.length < 0.3;
}

/**
 * Result of file validation
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  detectedType?: string;
  suspiciousPatterns?: string[];
}

/**
 * Validates a file's content by checking magic bytes.
 * @param buffer - The file buffer to validate
 * @param declaredMimeType - The MIME type declared by the client
 * @returns Whether the file content matches the declared type
 */
export function validateMagicBytes(
  buffer: Buffer,
  declaredMimeType: string,
): boolean {
  const signatures = MAGIC_SIGNATURES[declaredMimeType];

  if (!signatures) {
    // Unknown MIME type - reject by default
    return false;
  }

  return signatures.some((signature) => {
    if (buffer.length < signature.length) {
      return false;
    }

    return signature.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * Detects the actual file type based on magic bytes.
 * @param buffer - The file buffer to analyze
 * @returns The detected MIME type or null if unknown
 */
export function detectFileType(buffer: Buffer): string | null {
  for (const [mimeType, signatures] of Object.entries(MAGIC_SIGNATURES)) {
    for (const signature of signatures) {
      if (buffer.length >= signature.length) {
        const matches = signature.every(
          (byte, index) => buffer[index] === byte,
        );
        if (matches) {
          return mimeType;
        }
      }
    }
  }
  return null;
}

/**
 * Scans file content for suspicious patterns that may indicate malware.
 * For validated image files, this returns empty array to avoid false positives.
 * @param buffer - The file buffer to scan
 * @param isValidatedImage - If true, skip scanning (magic bytes already validated)
 * @returns Array of detected suspicious pattern descriptions
 */
export function scanForSuspiciousPatterns(
  buffer: Buffer,
  isValidatedImage: boolean = false,
): string[] {
  // For files that passed magic byte validation, skip pattern scanning
  // This prevents false positives from binary data being interpreted as text
  if (isValidatedImage) {
    return [];
  }

  const detected: string[] = [];

  // Check general suspicious patterns (JavaScript/crypto miners)
  // Convert only first 1MB to text for scanning
  const textContent = buffer.toString('utf8', 0, Math.min(buffer.length, 1048576));

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(textContent)) {
      detected.push(pattern.source);
    }
  }

  // Only check server-side code patterns if content looks like text
  // This avoids false positives from binary data containing byte sequences
  // that happen to look like "php" or "<%" when decoded as UTF-8
  if (isTextLikeContent(buffer)) {
    for (const pattern of SERVER_CODE_PATTERNS) {
      if (pattern.test(textContent)) {
        detected.push(pattern.source);
      }
    }
  }

  return detected;
}

/**
 * Comprehensive file validation that checks:
 * 1. Magic bytes match declared MIME type
 * 2. No suspicious patterns detected
 * 3. File size is reasonable
 *
 * @param filePath - Path to the uploaded file
 * @param declaredMimeType - The MIME type declared by the client
 * @param maxSizeBytes - Maximum allowed file size (default 10MB)
 * @returns Validation result with details
 */
export async function validateUploadedFile(
  filePath: string,
  declaredMimeType: string,
  maxSizeBytes: number = 5 * 1024 * 1024,
): Promise<FileValidationResult> {
  try {
    // Check if file exists
    if (!existsSync(filePath)) {
      return {
        isValid: false,
        error: 'File does not exist',
      };
    }

    // Read file content
    const buffer = await readFile(filePath);

    // Check file size
    if (buffer.length > maxSizeBytes) {
      return {
        isValid: false,
        error: `File size ${buffer.length} exceeds maximum allowed ${maxSizeBytes}`,
      };
    }

    // Validate magic bytes
    const detectedType = detectFileType(buffer);
    if (!detectedType) {
      return {
        isValid: false,
        error: 'Unable to detect file type from content',
      };
    }

    // Check if declared type matches detected type
    const declaredBase = declaredMimeType.split('/')[1]?.toLowerCase();
    const detectedBase = detectedType.split('/')[1]?.toLowerCase();

    // Allow some flexibility for JPEG variants
    const jpegVariants = ['jpeg', 'jpg'];
    const declaredIsJpeg = jpegVariants.includes(declaredBase || '');
    const detectedIsJpeg = jpegVariants.includes(detectedBase || '');

    if (
      declaredMimeType !== detectedType &&
      !(declaredIsJpeg && detectedIsJpeg)
    ) {
      return {
        isValid: false,
        error: `MIME type mismatch: declared ${declaredMimeType}, detected ${detectedType}`,
        detectedType,
      };
    }

    // Scan for suspicious patterns - skip for validated images to avoid false positives
    // from binary data being interpreted as text
    const isValidImage = detectedType?.startsWith('image/');
    const suspiciousPatterns = scanForSuspiciousPatterns(buffer, isValidImage);
    if (suspiciousPatterns.length > 0) {
      return {
        isValid: false,
        error: 'File contains suspicious patterns that may indicate malware',
        detectedType,
        suspiciousPatterns,
      };
    }

    return {
      isValid: true,
      detectedType,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Safely removes a file that failed validation.
 * @param filePath - Path to the file to remove
 */
export async function removeInvalidFile(filePath: string): Promise<void> {
  try {
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  } catch (error) {
    console.error(`Failed to remove invalid file ${filePath}:`, error);
  }
}
