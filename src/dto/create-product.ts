import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  Max,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductImageDto {
  @IsString()
  url: string;

  @IsString()
  @IsOptional()
  publicId?: string;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(['Mains', 'Desserts', 'Drinks', 'Appetizers'])
  category: string;

  @IsNumber()
  @Min(0)
  inventory: number;

  @IsString()
  sku: string;

  @IsString()
  imageUrl: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  detailedImages?: ProductImageDto[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
