import { PartialType } from '@nestjs/mapped-types';
import { CreateExtraPaymentDto } from './create-extra-payment.dto';

export class UpdateExtraPaymentDto extends PartialType(CreateExtraPaymentDto) {}
