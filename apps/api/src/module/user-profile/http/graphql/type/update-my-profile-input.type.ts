import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

// Every field is required so a save is always a full replacement; an empty
// string clears an optional field.
@InputType()
export class UpdateMyProfileInput {
  @IsString()
  @Field()
  firstName: string;

  @IsString()
  @Field()
  lastName: string;

  @IsString()
  @Field()
  state: string;

  @IsString()
  @Field()
  city: string;

  @IsString()
  @Field()
  birthDate: string;

  @IsString()
  @Field()
  phoneCountryCode: string;

  @IsString()
  @Field()
  phoneNumber: string;

  @IsString()
  @Field()
  zipCode: string;
}
