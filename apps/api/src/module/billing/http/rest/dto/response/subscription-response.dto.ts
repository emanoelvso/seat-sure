import { Expose } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { DefaultResponseDto } from './default-response.dto';
import { SubscriptionStatus } from '@billingModule/core/enum/subscription-status.enum';

export class SubscriptionResponseDto extends DefaultResponseDto {
  @IsString()
  @Expose()
  @IsNotEmpty()
  readonly userId: string;

  @IsUUID(4)
  @Expose()
  @IsNotEmpty()
  readonly planId: string;

  @IsEnum(SubscriptionStatus)
  @Expose()
  @IsNotEmpty()
  readonly status: SubscriptionStatus;

  @IsDateString()
  @Expose()
  @IsNotEmpty()
  readonly startDate: Date;

  @IsDateString()
  @Expose()
  @IsOptional()
  readonly endDate: Date | null;

  @IsBoolean()
  @Expose()
  @IsNotEmpty()
  readonly autoRenew: boolean;
}
