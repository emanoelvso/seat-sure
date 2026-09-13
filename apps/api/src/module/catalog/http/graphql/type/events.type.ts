import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { Field, ObjectType } from '@nestjs/graphql';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

@ObjectType()
export class Event {
  @IsNotEmpty()
  @IsUUID()
  @Field()
  id: string;

  @IsNotEmpty()
  @IsString()
  @Field()
  name: string;

  @IsNotEmpty()
  @IsEnum(EventType)
  @Field()
  type: EventType;

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
