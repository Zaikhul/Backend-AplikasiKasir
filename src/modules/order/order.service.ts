import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Order, OrderDocument } from '@/schemas/order.schema';
import { CreateOrderDto } from '@/dto/create-order';
import { ProductService } from '@/modules/product/product.service';
import { ORDER_STATUS } from '@/common/constants';

@Injectable()
export class OrderService {
    constructor(
        @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
        private readonly productService: ProductService,
    ) { }

    async create(createOrderDto: CreateOrderDto, userId: string): Promise<Order> {
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
            status: ORDER_STATUS.COMPLETED,
        });

        return order.save();
    }

    async findAll(
        userId: string,
        startDate?: string,
        endDate?: string,
        status?: string,
    ): Promise<Order[]> {
        const query: FilterQuery<OrderDocument> = {
            userId: new Types.ObjectId(userId),
        };

        if (status && status !== 'all') {
            query.status = status;
        }

        if (startDate || endDate) {
            const dateFilter: { $gte?: Date; $lte?: Date } = {};
            if (startDate) {
                dateFilter.$gte = new Date(startDate);
            }
            if (endDate) {
                dateFilter.$lte = new Date(endDate);
            }
            query.createdAt = dateFilter;
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
        const query: FilterQuery<OrderDocument> = {
            userId: new Types.ObjectId(userId),
            status: ORDER_STATUS.COMPLETED,
        };

        if (startDate || endDate) {
            const dateFilter: { $gte?: Date; $lte?: Date } = {};
            if (startDate) {
                dateFilter.$gte = new Date(startDate);
            }
            if (endDate) {
                dateFilter.$lte = new Date(endDate);
            }
            query.createdAt = dateFilter;
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

        for (const order of orders) {
            stats.totalSales += order.total;
            stats.byPaymentMethod[order.paymentMethod] =
                (stats.byPaymentMethod[order.paymentMethod] || 0) + order.total;

            // Use _id timestamp as fallback since createdAt comes from timestamps: true
            const orderDate =
                (order as unknown as { createdAt?: Date }).createdAt ||
                order._id.getTimestamp();
            const dateKey = new Date(orderDate).toISOString().split('T')[0];
            if (!dailyMap.has(dateKey)) {
                dailyMap.set(dateKey, { sales: 0, orders: 0 });
            }
            const daily = dailyMap.get(dateKey)!;
            daily.sales += order.total;
            daily.orders += 1;
        }

        stats.averageOrderValue =
            stats.totalOrders > 0 ? stats.totalSales / stats.totalOrders : 0;

        stats.dailySales = Array.from(dailyMap.entries())
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return stats;
    }
}
