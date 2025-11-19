import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RequestWithUser } from '@/interface/authenticated';
import { OrderService } from '@/services/order.service';
import { JwtAuthGuard } from '@/utils/auth/auth.guard';
import { CreateOrderDto } from '@/dto/create-order';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    return await this.orderService.create(createOrderDto, userId);
  }

  @Get('stats')
  async getStats(
    @Req() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user.userId;
    return await this.orderService.getSalesStats(userId, startDate, endDate);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const order = await this.orderService.findOne(id, userId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    const userId = req.user.userId;
    return await this.orderService.findAll(userId, startDate, endDate, status);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const updatedOrder = await this.orderService.updateStatus(
      id,
      status,
      userId,
    );
    if (!updatedOrder) {
      throw new NotFoundException('Order not found');
    }
    return updatedOrder;
  }
}
