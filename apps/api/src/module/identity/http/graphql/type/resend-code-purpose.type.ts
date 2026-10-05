import { registerEnumType } from '@nestjs/graphql';

export enum ResendCodePurpose {
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

registerEnumType(ResendCodePurpose, { name: 'ResendCodePurpose' });
