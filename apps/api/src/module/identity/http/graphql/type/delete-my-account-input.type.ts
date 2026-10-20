import { Field, InputType } from '@nestjs/graphql';
import { IsString, MaxLength } from 'class-validator';

@InputType()
export class DeleteMyAccountInput {
  // The use case checks the typed phrase; the cap only bounds the request
  @Field()
  @IsString()
  @MaxLength(50)
  confirmation: string;
}
