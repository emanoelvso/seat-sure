import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { Field, InputType } from '@nestjs/graphql';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

@InputType()
class PriceRange {
  @IsNumber()
  @Field()
  min: number;

  @IsOptional()
  @IsNumber()
  @Field({ nullable: true })
  max: number;
}

@InputType()
class DateRange {
  @IsDateString()
  @Field()
  from: Date;

  @IsOptional()
  @IsDateString()
  @Field({ nullable: true })
  to?: Date;
}

@InputType()
export class FindEventsInput {
  @IsOptional()
  @IsEnum(EventType)
  @Field(() => EventType, { nullable: true })
  type?: EventType;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  city?: string;

  @IsOptional()
  @IsObject()
  @Field(() => PriceRange, { nullable: true })
  priceRange?: PriceRange;

  @IsOptional()
  @IsObject()
  @Field(() => DateRange, { nullable: true })
  dateRange?: DateRange;

  @IsOptional()
  @IsNumber()
  @Field({ nullable: true })
  first?: number;

  @IsOptional()
  @IsNumber()
  @Field({ nullable: true })
  after?: number;
}
