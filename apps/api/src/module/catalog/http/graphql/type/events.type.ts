import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { Field, ObjectType } from '@nestjs/graphql';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'class-validator';

@ObjectType()
export class HomeSections {
  @Field(() => [Event], { nullable: true })
  shows: Event[] | null;

  @Field(() => [Event], { nullable: true })
  concerts: Event[] | null;

  @Field(() => [Event], { nullable: true })
  sports: Event[] | null;

  @Field(() => [Event], { nullable: true })
  festivals: Event[] | null;
}

@ObjectType()
export class Event {
  @IsNotEmpty()
  @IsUUID()
  @Field()
  id: string;

  @IsNotEmpty()
  @IsEnum(EventType)
  @Field()
  type: EventType;

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
  doors_open: Date;

  @IsNotEmpty()
  @IsEnum(EventStatus)
  @Field()
  status: EventStatus;

  @IsNotEmpty()
  @IsString()
  @Field()
  category: string;
}
