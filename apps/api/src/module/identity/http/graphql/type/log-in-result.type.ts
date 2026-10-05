import { Field, ObjectType } from '@nestjs/graphql';
import { LogInStatus } from '@identityModule/http/graphql/type/log-in-status.type';
import { SessionTokens } from '@identityModule/http/graphql/type/session-tokens.type';

@ObjectType()
export class LogInResult {
  @Field(() => LogInStatus)
  status: LogInStatus;

  @Field(() => SessionTokens, { nullable: true })
  session: SessionTokens | null;

  @Field(() => Boolean, { nullable: true })
  codeSent: boolean | null;

  @Field(() => Date, { nullable: true })
  resendAvailableAt: Date | null;
}
