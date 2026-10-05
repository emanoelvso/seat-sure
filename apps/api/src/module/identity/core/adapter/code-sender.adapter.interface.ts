export type CodeSenderPurpose = 'verify_email' | 'reset_password';

export interface SendCodeInput {
  email: string;
  purpose: CodeSenderPurpose;
  code: string;
}

export interface CodeSender {
  send(input: SendCodeInput): Promise<void>;
}

export const CodeSender = Symbol('CodeSender');
