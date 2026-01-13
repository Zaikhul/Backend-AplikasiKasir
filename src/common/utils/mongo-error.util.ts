/**
 * MongoDB and Mongoose Error Utilities
 *
 * Centralized type guards and utilities for handling MongoDB errors.
 * This consolidates duplicated error handling logic from auth.service.ts
 * and product.service.ts.
 */

/**
 * MongoDB server error interface for duplicate key errors (code 11000)
 */
export interface MongoServerError extends Error {
  code?: number;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
}

/**
 * Mongoose validation error interface
 */
export interface MongooseValidationError extends Error {
  name: 'ValidationError';
  errors: Record<string, unknown>;
}

/**
 * Type guard for MongoDB server errors (e.g., duplicate key error code 11000)
 * @param error - Unknown error to check
 * @returns True if error is a MongoServerError with a numeric code
 */
export function isMongoServerError(error: unknown): error is MongoServerError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'MongoServerError' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'number'
  );
}

/**
 * Type guard for MongoDB duplicate key errors (code 11000)
 * @param error - Unknown error to check
 * @returns True if error is a MongoDB duplicate key error
 */
export function isDuplicateKeyError(error: unknown): error is MongoServerError {
  return isMongoServerError(error) && error.code === 11000;
}

/**
 * Type guard for Mongoose validation errors
 * @param error - Unknown error to check
 * @returns True if error is a Mongoose ValidationError
 */
export function isMongooseValidationError(
  error: unknown,
): error is MongooseValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'ValidationError'
  );
}

/**
 * Extracts the field name from a MongoDB duplicate key error
 * @param error - MongoDB server error with keyPattern
 * @returns Field name that caused the duplicate key error
 */
export function getDuplicateKeyField(error: MongoServerError): string {
  return Object.keys(error.keyPattern || {})[0] || 'field';
}
