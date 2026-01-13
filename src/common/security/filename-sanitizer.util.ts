/**
 * Filename Sanitizer Utility
 * Sanitizes uploaded filenames to prevent path traversal attacks
 * and other security vulnerabilities.
 */

import { extname, basename } from 'path';

/**
 * Dangerous characters and patterns to remove from filenames.
 */
const DANGEROUS_PATTERNS: RegExp[] = [
  /\.\./g, // Directory traversal
  /\.\//g, // Relative path
  /\\/g, // Backslash
  /\//g, // Forward slash
  /\x00/g, // Null byte
  /[\x00-\x1f\x7f]/g, // Control characters
  /[<>:"|?*]/g, // Windows reserved characters
  /^(con|prn|aux|nul|com\d|lpt\d)$/i, // Windows reserved names
];

/**
 * Maximum allowed filename length (excluding extension).
 */
const MAX_FILENAME_LENGTH = 200;

/**
 * Allowed file extensions for images.
 */
const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.tiff',
  '.tif',
  '.heic',
  '.heif',
]);

/**
 * Sanitizes a filename by removing dangerous characters and patterns.
 *
 * @param filename - The original filename to sanitize
 * @returns A safe, sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }

  // Get the extension and basename
  let ext = extname(filename).toLowerCase();
  let name = basename(filename, ext);

  // Apply dangerous pattern removal
  for (const pattern of DANGEROUS_PATTERNS) {
    name = name.replace(pattern, '');
    ext = ext.replace(pattern, '');
  }

  // Remove any remaining non-ASCII characters and normalize
  name = name
    .replace(/[^\w\-. ]/g, '_') // Replace non-word chars with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_+|_+$/g, '') // Trim leading/trailing underscores
    .toLowerCase();

  // Ensure we have a valid name
  if (!name || name.length === 0) {
    name = 'unnamed_file';
  }

  // Truncate if too long
  if (name.length > MAX_FILENAME_LENGTH) {
    name = name.substring(0, MAX_FILENAME_LENGTH);
  }

  // Validate extension
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    ext = '.bin'; // Default to .bin for unknown extensions
  }

  return `${name}${ext}`;
}

/**
 * Validates whether a filename is safe.
 *
 * @param filename - The filename to validate
 * @returns Whether the filename is considered safe
 */
export function isFilenameValid(filename: string): boolean {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  // Check for null bytes
  if (filename.includes('\x00')) {
    return false;
  }

  // Check for directory traversal
  if (filename.includes('..') || filename.includes('./')) {
    return false;
  }

  // Check for absolute paths
  if (filename.startsWith('/') || /^[a-zA-Z]:/.test(filename)) {
    return false;
  }

  // Check extension
  const ext = extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return false;
  }

  return true;
}

/**
 * Extracts and validates the file extension.
 *
 * @param filename - The filename to extract extension from
 * @returns The lowercase extension or null if invalid
 */
export function getSafeExtension(filename: string): string | null {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  const ext = extname(filename).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return null;
  }

  return ext;
}
