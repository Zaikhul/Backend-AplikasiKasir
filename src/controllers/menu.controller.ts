import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import type { UpdateMenuDto } from '@/dto/update-menu';
import type { CreateMenuDto } from '@/dto/validate-menu';
import type { RequestWithUser } from '@/interface/authenticated';
import { MenuService } from '@/services/menu.service';
import { JwtAuthGuard } from '@/utils/auth/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  async create(
    @Body() createMenuDto: CreateMenuDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    return await this.menuService.create(createMenuDto, userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const item = await this.menuService.findOne(id, userId);
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    return item;
  }

  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const userId = req.user.userId;
    return await this.menuService.findAll(userId, category, search);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateMenuDto: UpdateMenuDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const updateItem = await this.menuService.update(id, updateMenuDto, userId);
    if (!updateItem) {
      throw new NotFoundException('Menu item not found');
    }
    return updateItem;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const deletedItem = await this.menuService.remove(id, userId);
    if (!deletedItem) {
      throw new NotFoundException('Menu item not found');
    }
    return deletedItem;
  }
}
