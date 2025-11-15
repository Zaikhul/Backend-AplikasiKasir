import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuController } from '@/controllers/menu.controller';
import { Menu, MenuSchema } from '@/schemas/menu.schema';
import { MenuService } from '@/services/menu.service';
import { AuthModule } from '@/utils/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Menu.name,
        schema: MenuSchema,
      },
    ]),
    AuthModule,
  ],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
