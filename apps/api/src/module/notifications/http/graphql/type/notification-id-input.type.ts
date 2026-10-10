import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

// A plain string, not a validated UUID: a malformed id is
// NOTIFICATION_NOT_FOUND like any other id the caller doesn't own
@InputType()
export class NotificationIdInput {
  @IsString()
  @Field()
  id: string;
}
