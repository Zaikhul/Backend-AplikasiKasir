import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserDto } from '@/dto/register-user';
import { User, UserDocument } from '@/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({
      email: email.toLowerCase().trim(),
    });

    if (user && (await user.comparePassword(pass))) {
      return user;
    }
    return null;
  }

  login(user: UserDocument) {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(registerUserDto: RegisterUserDto) {
    const { name, email, password, businessName } = registerUserDto;

    const existingUser = await this.userModel.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    try {
      const user = await this.userModel.create({
        name,
        email: email.toLowerCase().trim(),
        password,
        businessInfo: { businessName: businessName || '' },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user.toObject();
      return result;
    } catch (error) {
      if (error && typeof error === 'object') {
        if ('code' in error && error.code === 11000) {
          throw new ConflictException('User with this email already exists');
        }
        if ('name' in error && error.name === 'ValidationError') {
          throw new BadRequestException((error as { message: string }).message);
        }
      }
      console.error('Unhandled registration error:', error);
      throw new InternalServerErrorException('Registration failed');
    }
  }
}
