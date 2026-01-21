import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsBoolean, 
  IsEnum, 
  IsObject, 
  IsArray, 
  Min, 
  IsNotEmpty, 
  MinLength, 
  MaxLength, 
  Matches 
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from '../../../common/schemas/plan.schema';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty({ message: 'Plan name is required' })
  @MinLength(2, { message: 'Plan name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Plan name must not exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-'&.()]+$/, {
    message: 'Plan name can only contain letters, numbers, spaces, hyphens, apostrophes, ampersands, periods, and parentheses',
  })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  @MinLength(2, { message: 'Slug must be at least 2 characters long' })
  @MaxLength(63, { message: 'Slug must not exceed 63 characters (DNS subdomain limit)' })
  @Matches(/^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only. Must start and end with a letter or number.',
  })
  slug: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description: string;

  @IsNumber({}, { message: 'Price must be a valid number' })
  @Type(() => Number)
  @Min(0, { message: 'Price must be 0 or greater' })
  price: number;

  @IsEnum(BillingCycle, { message: 'Billing cycle must be either monthly or yearly' })
  billingCycle: BillingCycle;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'At least one feature must be selected' })
  @MinLength(1, { message: 'At least one feature must be selected' })
  features: string[]; // Array of FeatureKey values - required, at least one

  @IsOptional()
  @IsObject()
  limits?: {
    rooms?: number;
    residents?: number;
    staff?: number;
    buildings?: number;
  };

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
