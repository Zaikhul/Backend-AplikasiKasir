import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  //   ValidateIf,
} from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsString()
  @IsOptional()
  businessName?: string;
}
