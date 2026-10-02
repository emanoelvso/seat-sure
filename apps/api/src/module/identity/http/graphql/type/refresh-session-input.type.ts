import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RefreshSessionInput {
  @Field()
  refreshToken: string;
}
