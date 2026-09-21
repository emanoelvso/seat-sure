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
export class FindArtist {
  @Field(() => Artist, { nullable: true })
  artist?: Artist | null;

  @Field(() => [Event], { nullable: true })
  events?: Event[] | null;

  @Field(() => [Event], { nullable: true })
  nearbyEvents?: Event[] | null;
}
