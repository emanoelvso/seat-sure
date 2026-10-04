// `processing` is internal: it marks a payment attempt in flight and is
// reported as pending to the buyer. Expired is derived from `expiresAt`, never
// stored.
export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
