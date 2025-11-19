import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import type { Error as MongoError } from 'mongoose';
import { Product, ProductDocument } from '@/schemas/product.schema';
import { CreateProductDto } from '@/dto/create-product';
import { UpdateProductDto } from '@/dto/update-product';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    userId: string,
  ): Promise<Product> {
    try {
      const product = new this.productModel({
        ...createProductDto,
        userId: new Types.ObjectId(userId),
      });
      return await product.save();
    } catch (error) {
      // Handle duplicate SKU error
      if (this.isMongoError(error) && error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        throw new ConflictException(
          `Product with this ${field} already exists. Please use a different ${field}.`,
        );
      }

      // Handle Mongoose validation errors
      if (this.isValidationError(error)) {
        throw new BadRequestException(error.message);
      }

      // Log unexpected errors
      console.error('Error creating product:', error);
      throw new InternalServerErrorException('Failed to create product. Please try again.');
    }
  }

  // Type guard for MongoDB duplicate key errors
  private isMongoError(error: unknown): error is MongoError & { code: number; keyPattern?: Record<string, unknown> } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name: string }).name === 'MongoServerError' &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'number'
    );
  }

  // Type guard for Mongoose validation errors
  private isValidationError(error: unknown): error is Error & { message: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name: string }).name === 'ValidationError'
    );
  }

  async findAll(
    userId: string,
    category?: string,
    search?: string,
    status?: string,
  ): Promise<Product[]> {
    const query: FilterQuery<ProductDocument> = {
      userId: new Types.ObjectId(userId),
    };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { sku: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    return this.productModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async findOne(id: string, userId: string): Promise<Product | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.productModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .lean();
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId: string,
  ): Promise<Product | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.productModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        updateProductDto,
        { new: true },
      )
      .lean();
  }

  async remove(id: string, userId: string): Promise<Product | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.productModel
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .lean();
  }

  async getStats(userId: string): Promise<{
    total: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    byCategory: Record<string, number>;
  }> {
    const products = await this.productModel
      .find({ userId: new Types.ObjectId(userId) })
      .lean();

    const stats = {
      total: products.length,
      inStock: products.filter((p) => p.status === 'In Stock').length,
      lowStock: products.filter((p) => p.status === 'Low Stock').length,
      outOfStock: products.filter((p) => p.status === 'Out of Stock').length,
      byCategory: {} as Record<string, number>,
    };

    products.forEach((product) => {
      stats.byCategory[product.category] =
        (stats.byCategory[product.category] || 0) + 1;
    });

    return stats;
  }
}
