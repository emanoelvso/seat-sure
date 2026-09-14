import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { Field, InputType } from '@nestjs/graphql';
import {
  IsCurrency,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUrl,
} from 'class-validator';

@InputType()
export class EventInput {
  @IsNotEmpty()
  @IsEnum(EventType)
  @Field()
  type: EventType;

  @IsNotEmpty()
  @IsString()
  @Field()
  name: string;

  @IsString()
  @Field()
  description?: string;

  @IsNotEmpty()
  @IsUrl()
  @Field()
  coverImage: string;

  @IsNotEmpty()
  @IsString()
  @Field()
  venue: string;

  @IsNotEmpty()
  @IsString()
  @Field()
  city: string;

  @IsNotEmpty()
  @IsString()
  @Field()
  country: string;

  @IsNotEmpty()
  @IsDateString()
  @Field()
  date: Date;

  @IsNotEmpty()
  @IsDateString()
  @Field()
  startAt: Date;

  @IsNotEmpty()
  @IsDateString()
  @Field()
  endsAt: Date;

  @IsNotEmpty()
  @IsDateString()
  @Field()
  doorsOpen: Date;

  @IsNotEmpty()
  @IsEnum(EventStatus)
  @Field()
  status: EventStatus;

  @IsNotEmpty()
  @IsString()
  @Field()
  category: string;

  @IsNotEmpty()
  @IsCurrency()
  @Field()
  price: number;
}
