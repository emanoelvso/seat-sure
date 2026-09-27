import { Event } from '@catalogModule/http/graphql/type/events.type';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class EventTickets {
  @Field(() => Event, { nullable: true })
  event: Event | null;
}
