import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '@/schemas/order.schema';
import { Product, ProductDocument } from '@/schemas/product.schema';
import { OrderService } from '@/services/order.service';
import { ProductService } from '@/services/product.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly orderService: OrderService,
    private readonly productService: ProductService,
  ) {}

  async getDashboardStats(userId: string): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    averageOrderValue: number;
    topProducts: Array<{
      productId: string;
      name: string;
      sales: number;
      quantity: number;
    }>;
    recentOrders: any[];
    lowStockProducts: any[];
    salesByCategory: Record<string, number>;
    salesByDay: Array<{ date: string; sales: number; orders: number }>;
    paymentSummary: Record<string, number>;
  }> {
    const [productStats, salesStats, recentOrders, products] =
      await Promise.all([
        this.productService.getStats(userId),
        this.orderService.getSalesStats(userId),
        this.orderModel
          .find({ userId: new Types.ObjectId(userId) })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        this.productModel
          .find({
            userId: new Types.ObjectId(userId),
            status: { $in: ['Low Stock', 'Out of Stock'] },
          })
          .sort({ inventory: 1 })
          .limit(10)
          .lean(),
      ]);

    // Calculate top products
    const productSalesMap = new Map<
      string,
      { name: string; sales: number; quantity: number }
    >();

    const completedOrders = await this.orderModel
      .find({
        userId: new Types.ObjectId(userId),
        status: 'completed',
      })
      .lean();

    const productCategoryDocs = await this.productModel
      .find({ userId: new Types.ObjectId(userId) })
      .select(['category'])
      .lean();
    const productCategoryMap = new Map<string, string>();
    productCategoryDocs.forEach((product) => {
      productCategoryMap.set(product._id.toString(), product.category || 'Unknown');
    });

    completedOrders.forEach((order) => {
      order.items.forEach((item: any) => {
        const productId = item.productId?.toString() || 'unknown';
        if (!productSalesMap.has(productId)) {
          productSalesMap.set(productId, {
            name: item.productName,
            sales: 0,
            quantity: 0,
          });
        }
        const product = productSalesMap.get(productId)!;
        product.sales += item.price * item.quantity;
        product.quantity += item.quantity;
      });
    });

    const topProducts = Array.from(productSalesMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // Calculate sales by category
    const salesByCategory: Record<string, number> = {};
    completedOrders.forEach((order) => {
      order.items.forEach((item: any) => {
        const productId = item.productId?.toString();
        const category = (productId && productCategoryMap.get(productId)) || 'Unknown';
        salesByCategory[category] =
          (salesByCategory[category] || 0) + item.price * item.quantity;
      });
    });

    return {
      totalRevenue: salesStats.totalSales,
      totalOrders: salesStats.totalOrders,
      totalProducts: productStats.total,
      averageOrderValue: salesStats.averageOrderValue,
      topProducts,
      recentOrders,
      lowStockProducts: products,
      salesByCategory,
      salesByDay: salesStats.dailySales,
      paymentSummary: salesStats.byPaymentMethod,
    };
  }

  async getCategorySales(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Record<string, number>> {
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
    const categorySales: Record<string, number> = {};

    // Get all products to map productId to category
    const products = await this.productModel
      .find({ userId: new Types.ObjectId(userId) })
      .lean();
    const productCategoryMap = new Map<string, string>();
    products.forEach((p) => {
      productCategoryMap.set(p._id.toString(), p.category);
    });

    orders.forEach((order) => {
      order.items.forEach((item: any) => {
        const productId = item.productId?.toString();
        const category = productCategoryMap.get(productId) || 'Unknown';
        categorySales[category] =
          (categorySales[category] || 0) + item.price * item.quantity;
      });
    });

    return categorySales;
  }

  async getDetailedSalesReport(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    orders: any[];
    totalOrders: number;
    totalRevenue: number;
    revenueByCategory: Record<string, number>;
    productSales: Array<{
      productId: string;
      productName: string;
      category: string;
      totalQuantitySold: number;
      totalRevenue: number;
      averagePrice: number;
    }>;
    dailySales: Array<{ date: string; sales: number; orders: number }>;
    paymentMethodSummary: Record<string, { count: number; revenue: number }>;
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
        // Set end date to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const orders = await this.orderModel.find(query).sort({ createdAt: -1 }).lean();

    // Get all products to map productId to category
    const products = await this.productModel
      .find({ userId: new Types.ObjectId(userId) })
      .lean();
    const productCategoryMap = new Map<string, string>();
    products.forEach((p) => {
      productCategoryMap.set(p._id.toString(), p.category || 'Unknown');
    });

    // Calculate product sales
    const productSalesMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        category: string;
        totalQuantitySold: number;
        totalRevenue: number;
        prices: number[];
      }
    >();

    // Calculate revenue by category
    const revenueByCategory: Record<string, number> = {};
    const paymentMethodSummary: Record<string, { count: number; revenue: number }> = {};
    const dailySalesMap = new Map<string, { sales: number; orders: number }>();

    let totalRevenue = 0;
    let totalOrders = orders.length;

    orders.forEach((order: any) => {
      const orderTotal = order.total || 0;
      totalRevenue += orderTotal;

      // Payment method summary
      const paymentMethod = order.paymentMethod || 'unknown';
      if (!paymentMethodSummary[paymentMethod]) {
        paymentMethodSummary[paymentMethod] = { count: 0, revenue: 0 };
      }
      paymentMethodSummary[paymentMethod].count += 1;
      paymentMethodSummary[paymentMethod].revenue += orderTotal;

      // Daily sales
      const dateKey = new Date(order.createdAt || order._id.getTimestamp())
        .toISOString()
        .split('T')[0];
      if (!dailySalesMap.has(dateKey)) {
        dailySalesMap.set(dateKey, { sales: 0, orders: 0 });
      }
      const daily = dailySalesMap.get(dateKey)!;
      daily.sales += orderTotal;
      daily.orders += 1;

      // Product sales and category revenue
      order.items.forEach((item: any) => {
        const productId = item.productId?.toString() || 'unknown';
        const productName = item.productName || 'Unknown Product';
        const category = productCategoryMap.get(productId) || 'Unknown';
        const itemRevenue = item.price * item.quantity;

        // Update revenue by category
        revenueByCategory[category] = (revenueByCategory[category] || 0) + itemRevenue;

        // Update product sales
        if (!productSalesMap.has(productId)) {
          productSalesMap.set(productId, {
            productId,
            productName,
            category,
            totalQuantitySold: 0,
            totalRevenue: 0,
            prices: [],
          });
        }
        const product = productSalesMap.get(productId)!;
        product.totalQuantitySold += item.quantity;
        product.totalRevenue += itemRevenue;
        product.prices.push(item.price);
      });
    });

    // Convert product sales map to array and calculate average price
    const productSales = Array.from(productSalesMap.values()).map((product) => ({
      productId: product.productId,
      productName: product.productName,
      category: product.category,
      totalQuantitySold: product.totalQuantitySold,
      totalRevenue: product.totalRevenue,
      averagePrice:
        product.prices.length > 0
          ? product.prices.reduce((sum, price) => sum + price, 0) / product.prices.length
          : 0,
    }));

    // Sort product sales by revenue (descending)
    productSales.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Convert daily sales map to array and sort
    const dailySales = Array.from(dailySalesMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      orders,
      totalOrders,
      totalRevenue,
      revenueByCategory,
      productSales,
      dailySales,
      paymentMethodSummary,
    };
  }
}
