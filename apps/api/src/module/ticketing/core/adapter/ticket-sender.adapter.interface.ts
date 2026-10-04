export interface SendTicketsInput {
  email: string;
  eventName: string;
  codes: string[];
}

export interface TicketSender {
  send(input: SendTicketsInput): Promise<void>;
}

export const TicketSender = Symbol('TicketSender');
