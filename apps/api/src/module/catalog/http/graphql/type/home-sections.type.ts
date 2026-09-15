import { Field, ObjectType } from '@nestjs/graphql';
import { Event } from '@catalogModule/http/graphql/type/events.type';

@ObjectType()
export class EventSection {
  @Field(() => [String], { nullable: true })
  categories?: string[];

  @Field(() => [Event], { nullable: true })
  events?: Event[] | null;
}

@ObjectType()
export class HomeSections {
  @Field(() => EventSection, { nullable: true })
  shows: EventSection | null;

  @Field(() => EventSection, { nullable: true })
  concerts: EventSection | null;

  @Field(() => EventSection, { nullable: true })
  sports: EventSection | null;

  @Field(() => EventSection, { nullable: true })
  festivals: EventSection | null;
}
