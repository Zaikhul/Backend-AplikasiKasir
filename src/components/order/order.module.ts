import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderController } from '@/controllers/order.controller';
import { Order, OrderSchema } from '@/schemas/order.schema';
import { OrderService } from '@/services/order.service';
import { AuthModule } from '@/utils/auth/auth.module';
import { ProductModule } from '@/components/product/product.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Order.name,
        schema: OrderSchema,
      },
    ]),
    AuthModule,
    ProductModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
