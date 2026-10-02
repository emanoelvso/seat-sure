import { registerEnumType } from '@nestjs/graphql';

export enum LogInStatus {
  SIGNED_IN = 'SIGNED_IN',
  VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED',
}

registerEnumType(LogInStatus, { name: 'LogInStatus' });
