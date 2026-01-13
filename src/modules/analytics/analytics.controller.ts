import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { RequestWithUser } from '@/interface/authenticated';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboardStats(@Req() req: RequestWithUser) {
    const userId = req.user.userId;
    return await this.analyticsService.getDashboardStats(userId);
  }

  @Get('category-sales')
  async getCategorySales(
    @Req() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user.userId;
    return await this.analyticsService.getCategorySales(
      userId,
      startDate,
      endDate,
    );
  }

  @Get('detailed-report')
  async getDetailedSalesReport(
    @Req() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user.userId;
    return await this.analyticsService.getDetailedSalesReport(
      userId,
      startDate,
      endDate,
    );
  }
}
