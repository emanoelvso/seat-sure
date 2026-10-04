import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

// Shape only: the card rules run in OrderPaymentService, so a bad card comes
// back as INVALID_CARD with its fields, not BAD_REQUEST (AD-018).
@InputType()
export class CardInput {
  @IsString()
  @Field()
  number: string;

  @IsString()
  @Field()
  holder: string;

  @IsString()
  @Field()
  expiry: string;

  @IsString()
  @Field()
  cvv: string;
}

@InputType()
export class PayOrderInput {
  @IsString()
  @Field()
  orderId: string;

  @ValidateNested()
  @Type(() => CardInput)
  @Field(() => CardInput)
  card: CardInput;
}
