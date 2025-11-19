import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserDto } from '@/dto/register-user';
import { User, UserDocument } from '@/schemas/user.schema';
import { UpdateProfileDto } from '@/dto/update-profile';

// Type for MongoDB duplicate key error

interface MongoError extends Error {
  code?: number;
}

// Type for Mongoose validation error
interface ValidationError extends Error {
  name: string;
}

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

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const updateFields: Record<string, unknown> = {};

    if (updateProfileDto.name !== undefined) {
      updateFields.name = updateProfileDto.name.trim();
    }
    if (updateProfileDto.businessName !== undefined) {
      updateFields['businessInfo.businessName'] =
        updateProfileDto.businessName.trim();
    }
    if (updateProfileDto.address !== undefined) {
      updateFields['businessInfo.address'] = updateProfileDto.address.trim();
    }
    if (updateProfileDto.phone !== undefined) {
      updateFields['businessInfo.phone'] = updateProfileDto.phone.trim();
    }
    if (updateProfileDto.taxId !== undefined) {
      updateFields['businessInfo.taxId'] = updateProfileDto.taxId.trim();
    }

    if (Object.keys(updateFields).length === 0) {
      return this.getProfile(userId);
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: updateFields },
        {
          new: true,
          runValidators: true,
        },
      )
      .select('-password')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async register(registerUserDto: RegisterUserDto) {
    const { name, email, password, businessName } = registerUserDto;

    const existingUser = await this.userModel.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
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
      // Type guard for MongoDB errors
      if (this.isMongoError(error) && error.code === 11000) {
        throw new ConflictException(
          'Registration failed. Please try a different email.',
        );
      }

      // Type guard for Mongoose validation errors
      if (this.isValidationError(error)) {
        throw new BadRequestException(error.message);
      }
      console.error('Unhandled registration error:', error);
      throw new InternalServerErrorException('Registration failed');
    }
  }

  // Type guard for MongoDB errors
  private isMongoError(error: unknown): error is MongoError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as MongoError).code === 'number'
    );
  }

  // Type guard for Mongoose validation errors
  private isValidationError(error: unknown): error is ValidationError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as ValidationError).name === 'ValidationError'
    );
  }
}
