export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: string; output: string; }
};

export type AccountOrderCounts = {
  __typename: 'AccountOrderCounts';
  all: Scalars['Int']['output'];
  cancelled: Scalars['Int']['output'];
  completed: Scalars['Int']['output'];
  pending: Scalars['Int']['output'];
};

export type AccountOrderDetail = {
  __typename: 'AccountOrderDetail';
  createdAt: Scalars['DateTime']['output'];
  currency: Scalars['String']['output'];
  event: AccountOrderEvent;
  id: Scalars['ID']['output'];
  items: Array<AccountOrderItem>;
  paymentCard: Maybe<AccountOrderPaymentCard>;
  paymentId: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
  serviceFeeCents: Scalars['Int']['output'];
  status: AccountOrderStatus;
  taxCents: Scalars['Int']['output'];
  ticketTypeName: Scalars['String']['output'];
  totalCents: Scalars['Int']['output'];
};

export type AccountOrderEvent = {
  __typename: 'AccountOrderEvent';
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  coverImage: Scalars['String']['output'];
  name: Scalars['String']['output'];
  startAt: Scalars['DateTime']['output'];
  venue: Scalars['String']['output'];
};

export type AccountOrderItem = {
  __typename: 'AccountOrderItem';
  number: Scalars['String']['output'];
  row: Scalars['String']['output'];
};

export type AccountOrderPaymentCard = {
  __typename: 'AccountOrderPaymentCard';
  brand: Scalars['String']['output'];
  last4: Scalars['String']['output'];
};

export type AccountOrderStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'PENDING';

export type AccountOrderSummary = {
  __typename: 'AccountOrderSummary';
  createdAt: Scalars['DateTime']['output'];
  currency: Scalars['String']['output'];
  eventName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
  status: AccountOrderStatus;
  totalCents: Scalars['Int']['output'];
};

export type AccountOrdersPage = {
  __typename: 'AccountOrdersPage';
  counts: AccountOrderCounts;
  items: Array<AccountOrderSummary>;
  page: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type AccountOrdersSort =
  | 'HIGHEST_AMOUNT'
  | 'LOWEST_AMOUNT'
  | 'NEWEST'
  | 'OLDEST';

export type AccountOrdersTab =
  | 'ALL'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'PENDING';

export type AccountSettings = {
  __typename: 'AccountSettings';
  emailNotifications: Scalars['Boolean']['output'];
  eventReminders: Scalars['Boolean']['output'];
  exclusiveOffers: Scalars['Boolean']['output'];
  language: Scalars['String']['output'];
  pushNotifications: Scalars['Boolean']['output'];
  ticketAvailability: Scalars['Boolean']['output'];
};

export type AddPaymentCardInput = {
  cvv: Scalars['String']['input'];
  expiry: Scalars['String']['input'];
  holder: Scalars['String']['input'];
  number: Scalars['String']['input'];
};

export type AddPaymentMethodInput = {
  paymentMethodId: Scalars['String']['input'];
};

export type Artist = {
  __typename: 'Artist';
  bio: Scalars['String']['output'];
  cover: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type CardInput = {
  cvv: Scalars['String']['input'];
  expiry: Scalars['String']['input'];
  holder: Scalars['String']['input'];
  number: Scalars['String']['input'];
};

export type CheckoutEvent = {
  __typename: 'CheckoutEvent';
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  coverImage: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  startAt: Scalars['DateTime']['output'];
  venue: Scalars['String']['output'];
};

export type CheckoutOrder = {
  __typename: 'CheckoutOrder';
  currency: Scalars['String']['output'];
  event: CheckoutEvent;
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  items: Array<CheckoutOrderItem>;
  paymentAction: Maybe<PaymentAction>;
  quantity: Scalars['Int']['output'];
  secondsLeft: Scalars['Int']['output'];
  serviceFeeCents: Scalars['Int']['output'];
  status: CheckoutOrderStatus;
  subtotalCents: Scalars['Int']['output'];
  taxCents: Scalars['Int']['output'];
  ticketType: CheckoutTicketType;
  totalCents: Scalars['Int']['output'];
  unitPriceCents: Scalars['Int']['output'];
  unitServiceFeeCents: Scalars['Int']['output'];
  unitTaxCents: Scalars['Int']['output'];
};

export type CheckoutOrderItem = {
  __typename: 'CheckoutOrderItem';
  number: Scalars['String']['output'];
  row: Scalars['String']['output'];
  seatId: Scalars['String']['output'];
};

export type CheckoutOrderStatus =
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'
  | 'PAID'
  | 'PENDING'
  | 'REQUIRES_ACTION';

export type CheckoutTicketType = {
  __typename: 'CheckoutTicketType';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type CodeDelivery = {
  __typename: 'CodeDelivery';
  codeSent: Scalars['Boolean']['output'];
  resendAvailableAt: Scalars['DateTime']['output'];
};

export type ConfirmOrderPaymentInput = {
  orderId: Scalars['String']['input'];
};

export type ConfirmPasswordResetCodeInput = {
  code: Scalars['String']['input'];
  email: Scalars['String']['input'];
};

export type CurrentUser = {
  __typename: 'CurrentUser';
  avatarUrl: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['String']['output'];
  lastName: Scalars['String']['output'];
};

export type DateRange = {
  from: Scalars['DateTime']['input'];
  to?: InputMaybe<Scalars['DateTime']['input']>;
};

export type DeleteMyAccountInput = {
  confirmation: Scalars['String']['input'];
};

export type Event = {
  __typename: 'Event';
  category: Scalars['String']['output'];
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  coverImage: Scalars['String']['output'];
  date: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  doorsOpen: Scalars['DateTime']['output'];
  endsAt: Scalars['DateTime']['output'];
  headliner: Maybe<EventHeadliner>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  startAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  tags: Maybe<Array<Scalars['String']['output']>>;
  type: Scalars['String']['output'];
  venue: Scalars['String']['output'];
};

export type EventHeadliner = {
  __typename: 'EventHeadliner';
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type EventInput = {
  category: Scalars['String']['input'];
  coverImage: Scalars['String']['input'];
  date: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  doorsOpen: Scalars['String']['input'];
  endsAt: Scalars['String']['input'];
  name: Scalars['String']['input'];
  price: Scalars['Float']['input'];
  seatMapId?: InputMaybe<Scalars['String']['input']>;
  startAt: Scalars['String']['input'];
  status: Scalars['String']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  type: Scalars['String']['input'];
  venueId: Scalars['String']['input'];
};

export type EventSection = {
  __typename: 'EventSection';
  categories: Maybe<Array<Scalars['String']['output']>>;
  events: Maybe<Array<Event>>;
};

export type EventTickets = {
  __typename: 'EventTickets';
  event: Maybe<Event>;
  seatMap: Maybe<SeatMap>;
  ticketTypes: Array<TicketType>;
};

export type EventType =
  | 'CONCERT'
  | 'FESTIVAL'
  | 'SHOW'
  | 'SPORT';

export type EventsByCity = {
  __typename: 'EventsByCity';
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  events: Maybe<Array<Event>>;
};

export type FindAccountOrderInput = {
  orderId: Scalars['String']['input'];
};

export type FindAccountOrdersInput = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
  sort?: AccountOrdersSort;
  tab?: AccountOrdersTab;
};

export type FindArtist = {
  __typename: 'FindArtist';
  artist: Maybe<Artist>;
  eventsByCity: Maybe<Array<EventsByCity>>;
  featuredFestival: Maybe<Event>;
  nearbyEvents: Maybe<Array<Event>>;
};

export type FindArtistInput = {
  slug: Scalars['String']['input'];
};

export type FindCheckoutOrderInput = {
  orderId: Scalars['String']['input'];
};

export type FindEventTicketsInput = {
  eventId: Scalars['String']['input'];
};

export type FindEvents = {
  __typename: 'FindEvents';
  cities: Maybe<Array<Scalars['String']['output']>>;
  events: Maybe<Array<Event>>;
  hasMore: Scalars['Boolean']['output'];
};

export type FindEventsInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  dateRange?: InputMaybe<DateRange>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  offset?: InputMaybe<Scalars['Float']['input']>;
  priceRange?: InputMaybe<PriceRange>;
  type?: InputMaybe<EventType>;
};

export type FindTicketTypeSeatsInput = {
  eventId: Scalars['String']['input'];
  ticketTypeId: Scalars['String']['input'];
};

export type FindUnavailableSeatsInput = {
  eventId: Scalars['String']['input'];
};

export type HomeSections = {
  __typename: 'HomeSections';
  concerts: Maybe<EventSection>;
  festivals: Maybe<EventSection>;
  shows: Maybe<EventSection>;
  sports: Maybe<EventSection>;
};

export type LogInInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  rememberMe: Scalars['Boolean']['input'];
};

export type LogInResult = {
  __typename: 'LogInResult';
  codeSent: Maybe<Scalars['Boolean']['output']>;
  resendAvailableAt: Maybe<Scalars['DateTime']['output']>;
  session: Maybe<SessionTokens>;
  status: LogInStatus;
};

export type LogInStatus =
  | 'SIGNED_IN'
  | 'VERIFICATION_REQUIRED';

export type Mutation = {
  __typename: 'Mutation';
  addPaymentCard: Array<PaymentCard>;
  addPaymentMethod: Array<PaymentCard>;
  confirmOrderPayment: CheckoutOrder;
  confirmPasswordResetCode: PasswordResetGrant;
  createEvent: Event;
  deleteMyAccount: Scalars['Boolean']['output'];
  demoSignIn: SessionTokens;
  logIn: LogInResult;
  markAllNotificationsRead: NotificationCounts;
  markNotificationRead: Notification;
  payOrder: CheckoutOrder;
  refreshSession: SessionTokens;
  removePaymentCard: Array<PaymentCard>;
  requestPasswordReset: CodeDelivery;
  resendCode: CodeDelivery;
  resetPassword: Scalars['Boolean']['output'];
  setDefaultPaymentCard: Array<PaymentCard>;
  signUp: SignUpResult;
  startCheckout: CheckoutOrder;
  updateMyProfile: UserProfile;
  updateMySettings: AccountSettings;
  verifyEmail: SessionTokens;
};


export type MutationAddPaymentCardArgs = {
  input: AddPaymentCardInput;
};


export type MutationAddPaymentMethodArgs = {
  input: AddPaymentMethodInput;
};


export type MutationConfirmOrderPaymentArgs = {
  input: ConfirmOrderPaymentInput;
};


export type MutationConfirmPasswordResetCodeArgs = {
  input: ConfirmPasswordResetCodeInput;
};


export type MutationCreateEventArgs = {
  EventInput: EventInput;
};


export type MutationDeleteMyAccountArgs = {
  input: DeleteMyAccountInput;
};


export type MutationLogInArgs = {
  input: LogInInput;
};


export type MutationMarkNotificationReadArgs = {
  input: NotificationIdInput;
};


export type MutationPayOrderArgs = {
  input: PayOrderInput;
};


export type MutationRefreshSessionArgs = {
  input: RefreshSessionInput;
};


export type MutationRemovePaymentCardArgs = {
  input: PaymentCardIdInput;
};


export type MutationRequestPasswordResetArgs = {
  input: RequestPasswordResetInput;
};


export type MutationResendCodeArgs = {
  input: ResendCodeInput;
};


export type MutationResetPasswordArgs = {
  input: ResetPasswordInput;
};


export type MutationSetDefaultPaymentCardArgs = {
  input: PaymentCardIdInput;
};


export type MutationSignUpArgs = {
  input: SignUpInput;
};


export type MutationStartCheckoutArgs = {
  input: StartCheckoutInput;
};


export type MutationUpdateMyProfileArgs = {
  input: UpdateMyProfileInput;
};


export type MutationUpdateMySettingsArgs = {
  input: UpdateMySettingsInput;
};


export type MutationVerifyEmailArgs = {
  input: VerifyEmailInput;
};

export type MyNotificationsInput = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
  tab?: NotificationsTab;
};

export type Notification = {
  __typename: 'Notification';
  createdAt: Scalars['DateTime']['output'];
  eventName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  readAt: Maybe<Scalars['DateTime']['output']>;
  type: NotificationType;
};

export type NotificationCounts = {
  __typename: 'NotificationCounts';
  all: Scalars['Int']['output'];
  read: Scalars['Int']['output'];
  unread: Scalars['Int']['output'];
};

export type NotificationIdInput = {
  id: Scalars['String']['input'];
};

export type NotificationType =
  | 'PAYMENT_UNSUCCESSFUL'
  | 'PURCHASE_CONFIRMED'
  | 'WELCOME';

export type NotificationsPage = {
  __typename: 'NotificationsPage';
  counts: NotificationCounts;
  items: Array<Notification>;
  page: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type NotificationsTab =
  | 'ALL'
  | 'READ'
  | 'UNREAD';

export type PasswordResetGrant = {
  __typename: 'PasswordResetGrant';
  expiresAt: Scalars['DateTime']['output'];
  resetToken: Scalars['String']['output'];
};

export type PayOrderInput = {
  card?: InputMaybe<CardInput>;
  orderId: Scalars['String']['input'];
  paymentMethodId?: InputMaybe<Scalars['String']['input']>;
  saveCard?: Scalars['Boolean']['input'];
  savedCardId?: InputMaybe<Scalars['ID']['input']>;
};

export type PaymentAction = {
  __typename: 'PaymentAction';
  clientSecret: Scalars['String']['output'];
  provider: Scalars['String']['output'];
};

export type PaymentCard = {
  __typename: 'PaymentCard';
  brand: Scalars['String']['output'];
  expMonth: Scalars['Int']['output'];
  expYear: Scalars['Int']['output'];
  expired: Scalars['Boolean']['output'];
  holder: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isDefault: Scalars['Boolean']['output'];
  last4: Scalars['String']['output'];
};

export type PaymentCardIdInput = {
  id: Scalars['String']['input'];
};

export type PriceRange = {
  max?: InputMaybe<Scalars['Float']['input']>;
  min?: InputMaybe<Scalars['Float']['input']>;
};

export type Query = {
  __typename: 'Query';
  findAccountOrder: Maybe<AccountOrderDetail>;
  findAccountOrders: AccountOrdersPage;
  findArtistBySlug: FindArtist;
  findCheckoutOrder: Maybe<CheckoutOrder>;
  findEventTickets: EventTickets;
  findEvents: FindEvents;
  findTicketTypeSeats: TicketTypeSeats;
  findUnavailableSeats: UnavailableSeats;
  getHomeSections: HomeSections;
  me: CurrentUser;
  myNotifications: NotificationsPage;
  myPaymentCards: Array<PaymentCard>;
  myProfile: UserProfile;
  mySettings: AccountSettings;
};


export type QueryFindAccountOrderArgs = {
  input: FindAccountOrderInput;
};


export type QueryFindAccountOrdersArgs = {
  input: FindAccountOrdersInput;
};


export type QueryFindArtistBySlugArgs = {
  FindArtistInput: FindArtistInput;
};


export type QueryFindCheckoutOrderArgs = {
  input: FindCheckoutOrderInput;
};


export type QueryFindEventTicketsArgs = {
  FindEventTicketsInput: FindEventTicketsInput;
};


export type QueryFindEventsArgs = {
  FindEventsInput?: InputMaybe<FindEventsInput>;
};


export type QueryFindTicketTypeSeatsArgs = {
  FindTicketTypeSeatsInput: FindTicketTypeSeatsInput;
};


export type QueryFindUnavailableSeatsArgs = {
  FindUnavailableSeatsInput: FindUnavailableSeatsInput;
};


export type QueryMyNotificationsArgs = {
  input: MyNotificationsInput;
};

export type RefreshSessionInput = {
  refreshToken: Scalars['String']['input'];
};

export type RequestPasswordResetInput = {
  email: Scalars['String']['input'];
};

export type ResendCodeInput = {
  email: Scalars['String']['input'];
  purpose: ResendCodePurpose;
};

export type ResendCodePurpose =
  | 'RESET_PASSWORD'
  | 'VERIFY_EMAIL';

export type ResetPasswordInput = {
  newPassword: Scalars['String']['input'];
  resetToken: Scalars['String']['input'];
};

export type Seat = {
  __typename: 'Seat';
  id: Scalars['String']['output'];
  number: Scalars['String']['output'];
  perks: Array<SeatPerk>;
  priceCents: Scalars['Int']['output'];
  row: Scalars['String']['output'];
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
};

export type SeatMap = {
  __typename: 'SeatMap';
  id: Scalars['String']['output'];
  labelSize: Scalars['Float']['output'];
  labelWeight: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  sections: Array<SeatMapSection>;
  stage: SeatMapStage;
  viewBoxHeight: Scalars['Float']['output'];
  viewBoxWidth: Scalars['Float']['output'];
};

export type SeatMapSection = {
  __typename: 'SeatMapSection';
  color: Scalars['String']['output'];
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  shapes: Array<SeatMapSectionShape>;
};

export type SeatMapSectionShape = {
  __typename: 'SeatMapSectionShape';
  labelRotation: Scalars['Float']['output'];
  labelX: Scalars['Float']['output'];
  labelY: Scalars['Float']['output'];
  path: Scalars['String']['output'];
};

export type SeatMapStage = {
  __typename: 'SeatMapStage';
  label: Maybe<Scalars['String']['output']>;
  labelX: Maybe<Scalars['Float']['output']>;
  labelY: Maybe<Scalars['Float']['output']>;
  shapes: Array<SeatMapStageShape>;
};

export type SeatMapStageShape = {
  __typename: 'SeatMapStageShape';
  color: Scalars['String']['output'];
  path: Scalars['String']['output'];
};

export type SeatPerk =
  | 'ACCESSIBLE'
  | 'AISLE'
  | 'EXTRA_LEGROOM';

export type SectionView = {
  __typename: 'SectionView';
  label: Scalars['String']['output'];
  score: Scalars['Float']['output'];
};

export type SessionTokens = {
  __typename: 'SessionTokens';
  accessToken: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  persistent: Scalars['Boolean']['output'];
  refreshToken: Maybe<Scalars['String']['output']>;
};

export type SignUpInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type SignUpResult = {
  __typename: 'SignUpResult';
  codeSent: Scalars['Boolean']['output'];
  email: Scalars['String']['output'];
  resendAvailableAt: Scalars['DateTime']['output'];
};

export type StartCheckoutInput = {
  eventId: Scalars['String']['input'];
  seatIds: Array<Scalars['String']['input']>;
  ticketTypeId: Scalars['String']['input'];
};

export type TicketType = {
  __typename: 'TicketType';
  currency: Scalars['String']['output'];
  id: Scalars['String']['output'];
  maxPerOrder: Scalars['Int']['output'];
  maxPriceCents: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  priceCents: Scalars['Int']['output'];
  seatsAvailable: Scalars['Int']['output'];
  sectionKey: Scalars['String']['output'];
  serviceFeeCents: Scalars['Int']['output'];
  tags: Array<Scalars['String']['output']>;
  taxCents: Scalars['Int']['output'];
};

export type TicketTypeSeats = {
  __typename: 'TicketTypeSeats';
  event: Maybe<Event>;
  seatMap: Maybe<SeatMap>;
  seats: Array<Seat>;
  sectionView: Maybe<SectionView>;
  ticketType: Maybe<TicketType>;
};

export type UnavailableSeats = {
  __typename: 'UnavailableSeats';
  seatIds: Array<Scalars['String']['output']>;
};

export type UpdateMyProfileInput = {
  birthDate: Scalars['String']['input'];
  city: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  phoneCountryCode: Scalars['String']['input'];
  phoneNumber: Scalars['String']['input'];
  state: Scalars['String']['input'];
  zipCode: Scalars['String']['input'];
};

export type UpdateMySettingsInput = {
  emailNotifications?: InputMaybe<Scalars['Boolean']['input']>;
  eventReminders?: InputMaybe<Scalars['Boolean']['input']>;
  exclusiveOffers?: InputMaybe<Scalars['Boolean']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  pushNotifications?: InputMaybe<Scalars['Boolean']['input']>;
  ticketAvailability?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UserProfile = {
  __typename: 'UserProfile';
  avatarUrl: Maybe<Scalars['String']['output']>;
  birthDate: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastName: Scalars['String']['output'];
  phoneCountryCode: Maybe<Scalars['String']['output']>;
  phoneNumber: Maybe<Scalars['String']['output']>;
  state: Maybe<Scalars['String']['output']>;
  zipCode: Maybe<Scalars['String']['output']>;
};

export type VerifyEmailInput = {
  code: Scalars['String']['input'];
  email: Scalars['String']['input'];
  rememberMe: Scalars['Boolean']['input'];
};
