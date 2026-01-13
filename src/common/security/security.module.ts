/**
 * Security Module
 * Centralizes all security-related services and utilities
 * for the application.
 */

import { Module, Global } from '@nestjs/common';
import { UploadLoggerService } from './upload-logger.service';

@Global()
@Module({
  providers: [UploadLoggerService],
  exports: [UploadLoggerService],
})
export class SecurityModule {}
