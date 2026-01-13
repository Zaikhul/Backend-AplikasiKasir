import {
  Injectable,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Product, ProductDocument } from '@/schemas/product.schema';
import { CreateProductDto } from '@/dto/create-product';
import { UpdateProductDto } from '@/dto/update-product';
import {
  isDuplicateKeyError,
  isMongooseValidationError,
  getDuplicateKeyField,
} from '@/common/utils/mongo-error.util';
import { PRODUCT_STATUS } from '@/common/constants';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

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
      if (isDuplicateKeyError(error)) {
        const field = getDuplicateKeyField(error);
        throw new ConflictException(
          `Product with this ${field} already exists. Please use a different ${field}.`,
        );
      }

      if (isMongooseValidationError(error)) {
        throw new BadRequestException(error.message);
      }

      this.logger.error('Error creating product', error);
      throw new InternalServerErrorException(
        'Failed to create product. Please try again.',
      );
    }
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
      inStock: products.filter((p) => p.status === PRODUCT_STATUS.IN_STOCK)
        .length,
      lowStock: products.filter((p) => p.status === PRODUCT_STATUS.LOW_STOCK)
        .length,
      outOfStock: products.filter(
        (p) => p.status === PRODUCT_STATUS.OUT_OF_STOCK,
      ).length,
      byCategory: {} as Record<string, number>,
    };

    for (const product of products) {
      stats.byCategory[product.category] =
        (stats.byCategory[product.category] || 0) + 1;
    }

    return stats;
  }
}
