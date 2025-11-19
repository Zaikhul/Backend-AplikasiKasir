import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { RequestWithUser } from '@/interface/authenticated';
import { ProductService } from '@/services/product.service';
import { JwtAuthGuard } from '@/utils/auth/auth.guard';
import { CreateProductDto } from '@/dto/create-product';
import { UpdateProductDto } from '@/dto/update-product';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      const userId = req.user.userId;
      const product = await this.productService.create(createProductDto, userId);
      console.log('Product created successfully:', (product as any)._id || product);
      return product;
    } catch (error) {
      // Re-throw known exceptions (they're already properly formatted)
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      // Log unexpected errors
      console.error('Unexpected error in ProductController.create:', error);
      throw error;
    }
  }

  @Get('stats')
  async getStats(@Req() req: RequestWithUser) {
    const userId = req.user.userId;
    return await this.productService.getStats(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const product = await this.productService.findOne(id, userId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const userId = req.user.userId;
    return await this.productService.findAll(userId, category, search, status);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const updatedProduct = await this.productService.update(
      id,
      updateProductDto,
      userId,
    );
    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }
    return updatedProduct;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const deletedProduct = await this.productService.remove(id, userId);
    if (!deletedProduct) {
      throw new NotFoundException('Product not found');
    }
    return deletedProduct;
  }
}
