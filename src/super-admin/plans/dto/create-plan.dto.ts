import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsObject, IsArray, Min } from 'class-validator';
import { BillingCycle } from '../../../common/schemas/plan.schema';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[]; // Array of FeatureKey values

  @IsOptional()
  @IsObject()
  limits?: {
    rooms?: number;
    residents?: number;
    staff?: number;
  };

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
