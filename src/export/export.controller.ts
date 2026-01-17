import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('export')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.EXPORT_DATA)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('residents')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=residents.csv')
  async exportResidents(@TenantId() tenantId: string, @Res() res: Response) {
    const data = await this.exportService.exportResidents(tenantId);
    const csv = this.exportService.convertToCSV(data);
    res.send(csv);
  }

  @Get('payments')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=payments.csv')
  async exportPayments(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const data = await this.exportService.exportPayments(tenantId, start, end);
    const csv = this.exportService.convertToCSV(data);
    res.send(csv);
  }

  @Get('beds')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=beds.csv')
  async exportBeds(@TenantId() tenantId: string, @Res() res: Response) {
    const data = await this.exportService.exportBeds(tenantId);
    const csv = this.exportService.convertToCSV(data);
    res.send(csv);
  }

  @Get('rooms')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=rooms.csv')
  async exportRooms(@TenantId() tenantId: string, @Res() res: Response) {
    const data = await this.exportService.exportRooms(tenantId);
    const csv = this.exportService.convertToCSV(data);
    res.send(csv);
  }

  @Get('staff')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=staff.csv')
  async exportStaff(@TenantId() tenantId: string, @Res() res: Response) {
    const data = await this.exportService.exportStaff(tenantId);
    const csv = this.exportService.convertToCSV(data);
    res.send(csv);
  }

  @Get('assets')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=assets.csv')
  async exportAssets(@TenantId() tenantId: string, @Res() res: Response) {
    const data = await this.exportService.exportAssets(tenantId);
    const csv = this.exportService.convertToCSV(data);
    res.send(csv);
  }

  @Get('gate-passes')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=gate-passes.csv')
  async exportGatePasses(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const data = await this.exportService.exportGatePasses(tenantId, start, end);
    const csv = this.exportService.convertToCSV(data);
    res.send(csv);
  }

  @Get('rent-payments')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=rent-payments.csv')
  async exportRentPayments(
    @Query('status') status: string,
    @Query('dueToday') dueToday: string,
    @Query('overdue') overdue: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (dueToday === 'true') filters.dueToday = true;
    if (overdue === 'true') filters.overdue = true;
    const data = await this.exportService.exportRentPayments(tenantId, filters);
    const csv = this.exportService.convertToCSV(data);
    res.send(csv);
  }

  @Get('security-deposits')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=security-deposits.csv')
  async exportSecurityDeposits(@TenantId() tenantId: string, @Res() res: Response) {
    const data = await this.exportService.exportSecurityDeposits(tenantId);
    const csv = this.exportService.convertToCSV(data);
    res.send(csv);
  }
}
