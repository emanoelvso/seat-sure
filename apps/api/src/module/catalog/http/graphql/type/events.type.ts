import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Event {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  type: EventType;

  @Field()
  coverImage: string;

  @Field()
  venue: string;

  @Field()
  city: string;

  @Field()
  country: string;

  @Field()
  date: Date;

  @Field()
  startAt: Date;

  @Field()
  endsAt: Date;

  @Field()
  doorsOpen: Date;

  @Field()
  status: EventStatus;

  @Field()
  category: string;

  @Field(() => Float)
  price: number;
}
