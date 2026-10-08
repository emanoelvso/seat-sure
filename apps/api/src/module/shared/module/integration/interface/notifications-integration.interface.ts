// The only way other modules create notifications (AD-027). Each method is one
// fact, may throw, and is idempotent on its source id. Callers isolate the
// call so a notification failure never fails them.
export interface NotifyWelcomeInput {
  userId: string;
  now: Date;
}

export interface NotifyPurchaseConfirmedInput {
  userId: string;
  orderId: string;
  eventName: string;
  now: Date;
}

export interface NotifyPaymentUnsuccessfulInput {
  userId: string;
  paymentId: string;
  eventName: string;
  now: Date;
}

export interface NotificationsApi {
  notifyWelcome(input: NotifyWelcomeInput): Promise<void>;
  notifyPurchaseConfirmed(input: NotifyPurchaseConfirmedInput): Promise<void>;
  notifyPaymentUnsuccessful(
    input: NotifyPaymentUnsuccessfulInput,
  ): Promise<void>;
}

export const NotificationsApi = Symbol('NotificationsApi');
