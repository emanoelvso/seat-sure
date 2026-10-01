import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class FindTicketTypeSeatsInput {
  @IsString()
  @Field()
  eventId: string;

  @IsString()
  @Field()
  ticketTypeId: string;
}
