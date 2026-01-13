import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { AuthModule } from '@/modules/auth/auth.module';
import { SecurityModule } from '@/common/security/security.module';

@Module({
  imports: [AuthModule, SecurityModule],
  controllers: [UploadController],
})
export class UploadModule {}
