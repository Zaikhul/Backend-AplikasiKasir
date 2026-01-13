import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

const phoneRegex = /^[0-9+\-\s()]*$/;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(phoneRegex, {
    message: 'Phone number can only contain numbers and basic symbols',
  })
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;
}
