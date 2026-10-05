import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsString } from 'class-validator';

// Shape only: the selection is validated by CheckoutService, so a bad one
// comes back as INVALID_SELECTION, not BAD_REQUEST (AD-018).
@InputType()
export class StartCheckoutInput {
  @IsString()
  @Field()
  eventId: string;

  @IsString()
  @Field()
  ticketTypeId: string;

  @IsArray()
  @IsString({ each: true })
  @Field(() => [String])
  seatIds: string[];
}
