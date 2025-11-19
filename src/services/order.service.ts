import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '@/schemas/order.schema';
import { CreateOrderDto } from '@/dto/create-order';
import { ProductService } from '@/services/product.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly productService: ProductService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string): Promise<Order> {
    // Validate and update inventory
    for (const item of createOrderDto.items) {
      const product = await this.productService.findOne(item.productId, userId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
      if (product.inventory < item.quantity) {
        throw new BadRequestException(
          `Insufficient inventory for ${product.name}. Available: ${product.inventory}, Requested: ${item.quantity}`,
        );
      }
      // Update inventory
      await this.productService.update(
        item.productId,
        { inventory: product.inventory - item.quantity },
        userId,
      );
    }

    const order = new this.orderModel({
      ...createOrderDto,
      userId: new Types.ObjectId(userId),
      cashierId: new Types.ObjectId(userId),
      status: 'completed',
    });

    return order.save();
  }

  async findAll(
    userId: string,
    startDate?: string,
    endDate?: string,
    status?: string,
  ): Promise<Order[]> {
    const query: any = {
      userId: new Types.ObjectId(userId),
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    return this.orderModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async findOne(id: string, userId: string): Promise<Order | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.orderModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .lean();
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string,
  ): Promise<Order | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.orderModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { status },
        { new: true },
      )
      .lean();
  }

  async getSalesStats(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    byPaymentMethod: Record<string, number>;
    byCategory: Record<string, number>;
    dailySales: Array<{ date: string; sales: number; orders: number }>;
  }> {
    const query: any = {
      userId: new Types.ObjectId(userId),
      status: 'completed',
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const orders = await this.orderModel.find(query).lean();

    const stats = {
      totalSales: 0,
      totalOrders: orders.length,
      averageOrderValue: 0,
      byPaymentMethod: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      dailySales: [] as Array<{ date: string; sales: number; orders: number }>,
    };

    const dailyMap = new Map<string, { sales: number; orders: number }>();

    orders.forEach((order: any) => {
      stats.totalSales += order.total;
      stats.byPaymentMethod[order.paymentMethod] =
        (stats.byPaymentMethod[order.paymentMethod] || 0) + order.total;

      const dateKey = new Date(order.createdAt || order._id.getTimestamp())
        .toISOString()
        .split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { sales: 0, orders: 0 });
      }
      const daily = dailyMap.get(dateKey)!;
      daily.sales += order.total;
      daily.orders += 1;
    });

    stats.averageOrderValue =
      stats.totalOrders > 0 ? stats.totalSales / stats.totalOrders : 0;

    stats.dailySales = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  }
}
