import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { RentPayment, RentPaymentSchema } from './schemas/rent-payment.schema';
import { ExtraPayment, ExtraPaymentSchema } from './schemas/extra-payment.schema';
import { SecurityDeposit, SecurityDepositSchema } from './schemas/security-deposit.schema';
import { RentPaymentService } from './rent-payment.service';
import { ExtraPaymentService } from './extra-payment.service';
import { SecurityDepositService } from './security-deposit.service';
import { RentPaymentSchedulerService } from './rent-payment-scheduler.service';
import { RentPaymentController } from './rent-payment.controller';
import { ExtraPaymentController } from './extra-payment.controller';
import { SecurityDepositController } from './security-deposit.controller';
import { BulkActionsController } from './bulk-actions.controller';
import { BulkActionsService } from './bulk-actions.service';
import { ResidentsModule } from '../residents/residents.module';
import { TenantsModule } from '../tenants/tenants.module';
import { BedsModule } from '../beds/beds.module';
import { Resident, ResidentSchema } from '../residents/schemas/resident.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: RentPayment.name, schema: RentPaymentSchema },
      { name: ExtraPayment.name, schema: ExtraPaymentSchema },
      { name: SecurityDeposit.name, schema: SecurityDepositSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    forwardRef(() => ResidentsModule),
    TenantsModule,
    forwardRef(() => BedsModule),
    FeatureFlagModule,
  ],
  controllers: [
    // Register specific controllers first to ensure their routes are matched before generic routes
    RentPaymentController,
    ExtraPaymentController,
    SecurityDepositController,
    BulkActionsController,
    PaymentsController, // Generic payments controller last
  ],
  providers: [
    PaymentsService,
    RentPaymentService,
    ExtraPaymentService,
    SecurityDepositService,
    RentPaymentSchedulerService,
    BulkActionsService,
  ],
  exports: [
    PaymentsService,
    RentPaymentService,
    ExtraPaymentService,
    SecurityDepositService,
    BulkActionsService,
  ],
})
export class PaymentsModule {}
