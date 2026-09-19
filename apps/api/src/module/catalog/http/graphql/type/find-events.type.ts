import { Event } from '@catalogModule/http/graphql/type/events.type';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FindEvents {
  @Field(() => [String], { nullable: true })
  cities: string[];
  @Field(() => [Event], { nullable: true })
  events?: Event[] | null;

  @Field()
  hasMore: boolean;
}
