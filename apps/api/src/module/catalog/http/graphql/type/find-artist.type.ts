import { Field, ObjectType } from '@nestjs/graphql';
import { Event } from './events.type';

@ObjectType()
class Artist {
  @Field()
  name: string;
  @Field()
  cover: string;
  @Field()
  bio: string;
}

@ObjectType()
class EventsByCity {
  @Field()
  city: string;
  @Field()
  country: string;
  @Field(() => [Event], { nullable: true })
  events: Event[] | null;
}

@ObjectType()
export class FindArtist {
  @Field(() => Artist, { nullable: true })
  artist?: Artist | null;

  @Field(() => [EventsByCity], { nullable: true })
  eventsByCity?: EventsByCity[] | null;

  @Field(() => [Event], { nullable: true })
  nearbyEvents?: Event[] | null;

  @Field(() => Event, { nullable: true })
  featuredFestival?: Event | null;
}
