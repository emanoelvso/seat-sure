// `processing` is internal: it marks a payment attempt in flight and is
// reported as pending to the buyer. `requires_action` is a payment waiting on
// the buyer's 3-D Secure challenge; listings report it as pending. Expired is derived from `expiresAt`, never
// stored.
export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  REQUIRES_ACTION = 'requires_action',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
