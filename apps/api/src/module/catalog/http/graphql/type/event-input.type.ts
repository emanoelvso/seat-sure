import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { Field, InputType } from '@nestjs/graphql';
import {
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

  @IsNotEmpty()
  @IsUrl()
  @Field()
  coverImage: string;

  @IsNotEmpty()
  @IsString()
  @Field()
  venue: string;

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
}
