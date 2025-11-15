import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard ini akan secara otomatis menggunakan JwtStrategy
 * dan memproteksi endpoint.
 *
 * Cara pakai di Controller:
 * @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
