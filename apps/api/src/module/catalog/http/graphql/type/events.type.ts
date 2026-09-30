import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import {
  EventHeadlinerModel,
  EventModel,
} from '@catalogModule/core/model/event.model';
import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class EventHeadliner implements EventHeadlinerModel {
  @Field()
  slug: string;

  @Field()
  name: string;
}

@ObjectType()
export class Event implements EventModel {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

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

  @Field(() => [String], { nullable: true })
  tags?: string[] | null;

  @Field(() => EventHeadliner, { nullable: true })
  headliner: EventHeadliner | null;
}
