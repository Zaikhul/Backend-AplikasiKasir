import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from '@/controllers/analytics.controller';
import { AnalyticsService } from '@/services/analytics.service';
import { Order, OrderSchema } from '@/schemas/order.schema';
import { Product, ProductSchema } from '@/schemas/product.schema';
import { AuthModule } from '@/utils/auth/auth.module';
import { OrderModule } from '@/components/order/order.module';
import { ProductModule } from '@/components/product/product.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    AuthModule,
    OrderModule,
    ProductModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
