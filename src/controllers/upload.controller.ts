import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/utils/auth/auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as crypto from 'crypto';
import type { Request } from 'express';

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

@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',

        filename: (req, file, cb) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          const uniqueName = `${crypto.randomUUID()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/jpg',
          'image/webp',
          'image/heic',
          'image/heif',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
    }),
  )
  uploadFile(
    @UploadedFile() file: UploadedFileType | undefined,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // In production, you would upload to cloud storage (S3, Cloudinary, etc.)
    // For now, return the local file path
    const forwardedProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0];
    const forwardedHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0];
    const inferredOrigin =
      (forwardedProto && forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : `${req.protocol}://${req.get('host') ?? 'localhost:3000'}`);

    const baseUrl =
      process.env.PUBLIC_ASSET_URL ||
      process.env.BASE_URL ||
      inferredOrigin;

    const relativePath = `/uploads/${file.filename}`;
    return {
      url: `${baseUrl}${relativePath}`,
      relativePath,
      publicId: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }
}
