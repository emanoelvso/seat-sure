// What the buyer sees of an order in the account area. `processing` reads as
// PENDING. Expired and failed orders are never listed (ORDLIST-01).
export enum AccountOrderStatus {
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum AccountOrdersTab {
  ALL = 'ALL',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum AccountOrdersSort {
  NEWEST = 'NEWEST',
  OLDEST = 'OLDEST',
  HIGHEST_AMOUNT = 'HIGHEST_AMOUNT',
  LOWEST_AMOUNT = 'LOWEST_AMOUNT',
}

export interface AccountOrderSummaryModel {
  id: string;
  status: AccountOrderStatus;
  createdAt: Date;
  eventName: string;
  quantity: number;
  currency: string;
  totalCents: number;
}

export interface AccountOrderCountsModel {
  all: number;
  pending: number;
  cancelled: number;
  completed: number;
}

export interface AccountOrdersPageModel {
  items: AccountOrderSummaryModel[];
  counts: AccountOrderCountsModel;
  // The effective page: 1 when the requested one was past the end
  page: number;
  // Of the requested tab; 0 when the tab is empty
  totalPages: number;
}

export interface AccountOrderEventModel {
  name: string;
  coverImage: string;
  venue: string;
  city: string;
  country: string;
  startAt: Date;
}

export interface AccountOrderItemModel {
  row: string;
  number: string;
}

export interface AccountOrderPaymentCardModel {
  brand: string;
  last4: string;
}

export interface AccountOrderDetailModel {
  id: string;
  status: AccountOrderStatus.COMPLETED | AccountOrderStatus.CANCELLED;
  createdAt: Date;
  event: AccountOrderEventModel;
  ticketTypeName: string;
  items: AccountOrderItemModel[];
  quantity: number;
  currency: string;
  serviceFeeCents: number;
  taxCents: number;
  totalCents: number;
  paymentId: string | null;
  paymentCard: AccountOrderPaymentCardModel | null;
}
