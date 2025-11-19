import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './utils/database/database.module';
import { AuthModule } from './utils/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MenuModule } from './components/menu/menu.module';
import { ProductModule } from './components/product/product.module';
import { OrderModule } from './components/order/order.module';
import { AnalyticsModule } from './components/analytics/analytics.module';
import { UploadController } from './controllers/upload.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    MenuModule,
    ProductModule,
    OrderModule,
    AnalyticsModule,
  ],
  controllers: [AppController, UploadController],
  providers: [AppService],
})
export class AppModule {}
