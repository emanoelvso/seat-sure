import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class FindArtistInput {
  @IsString()
  @Field()
  slug: string;
}
