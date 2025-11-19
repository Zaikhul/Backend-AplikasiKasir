import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '@/services/auth.service';
import { RegisterUserDto } from '@/dto/register-user';
import { LoginUserDto } from '@/dto/login-user';
import { JwtAuthGuard } from '@/utils/auth/auth.guard';
import type { RequestWithUser } from '@/interface/authenticated';
import { UpdateProfileDto } from '@/dto/update-profile';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginUserDto: LoginUserDto) {
    const user = await this.authService.validateUser(
      loginUserDto.email,
      loginUserDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: RequestWithUser) {
    return this.authService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() req: RequestWithUser,
  ) {
    return this.authService.updateProfile(req.user.userId, updateProfileDto);
  }
}
