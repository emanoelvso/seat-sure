export type SecurityAlertEvent = 'duplicate_sign_up_attempt';

export interface SendSecurityAlertInput {
  email: string;
  event: SecurityAlertEvent;
}

export interface SecurityAlertSender {
  send(input: SendSecurityAlertInput): Promise<void>;
}

export const SecurityAlertSender = Symbol('SecurityAlertSender');
