import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

@InputType()
export class EventInput {
  @IsNotEmpty()
  @IsString()
  @Field()
  name: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  description?: string;

  @IsNotEmpty()
  @IsEnum(EventType)
  @Field()
  type: EventType;

  @IsNotEmpty()
  @IsUrl()
  @Field()
  coverImage: string;

  @IsNotEmpty()
  @IsUUID()
  @Field()
  venueId: string;

  @IsOptional()
  @IsUUID()
  @Field({ nullable: true })
  seatMapId?: string;

  @IsNotEmpty()
  @IsDateString()
  @Field()
  date: string;

  @IsNotEmpty()
  @IsDateString()
  @Field()
  startAt: string;

  @IsNotEmpty()
  @IsDateString()
  @Field()
  endsAt: string;

  @IsNotEmpty()
  @IsDateString()
  @Field()
  doorsOpen: string;

  @IsNotEmpty()
  @IsEnum(EventStatus)
  @Field()
  status: EventStatus;

  @IsNotEmpty()
  @IsString()
  @Field()
  category: string;

  @IsNotEmpty()
  @IsNumber()
  @Field(() => Float)
  price: number;

  @IsOptional()
  @IsArray()
  @Field(() => [String], { nullable: true })
  tags?: string[];
}
