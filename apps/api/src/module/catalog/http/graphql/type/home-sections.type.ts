import { Field, ObjectType } from '@nestjs/graphql';
import { Event } from '@catalogModule/http/graphql/type/events.type';

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
