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

export type Artist = {
  __typename: 'Artist';
  bio: Scalars['String']['output'];
  cover: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type CodeDelivery = {
  __typename: 'CodeDelivery';
  codeSent: Scalars['Boolean']['output'];
  resendAvailableAt: Scalars['DateTime']['output'];
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
  confirmPasswordResetCode: PasswordResetGrant;
  createEvent: Event;
  logIn: LogInResult;
  refreshSession: SessionTokens;
  requestPasswordReset: CodeDelivery;
  resendCode: CodeDelivery;
  resetPassword: Scalars['Boolean']['output'];
  signUp: SignUpResult;
  verifyEmail: SessionTokens;
};


export type MutationConfirmPasswordResetCodeArgs = {
  input: ConfirmPasswordResetCodeInput;
};


export type MutationCreateEventArgs = {
  EventInput: EventInput;
};


export type MutationLogInArgs = {
  input: LogInInput;
};


export type MutationRefreshSessionArgs = {
  input: RefreshSessionInput;
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


export type MutationSignUpArgs = {
  input: SignUpInput;
};


export type MutationVerifyEmailArgs = {
  input: VerifyEmailInput;
};

export type PasswordResetGrant = {
  __typename: 'PasswordResetGrant';
  expiresAt: Scalars['DateTime']['output'];
  resetToken: Scalars['String']['output'];
};

export type PriceRange = {
  max?: InputMaybe<Scalars['Float']['input']>;
  min?: InputMaybe<Scalars['Float']['input']>;
};

export type Query = {
  __typename: 'Query';
  findArtistBySlug: FindArtist;
  findEventTickets: EventTickets;
  findEvents: FindEvents;
  findTicketTypeSeats: TicketTypeSeats;
  findUnavailableSeats: UnavailableSeats;
  getHomeSections: HomeSections;
  me: CurrentUser;
};


export type QueryFindArtistBySlugArgs = {
  FindArtistInput: FindArtistInput;
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

export type TicketType = {
  __typename: 'TicketType';
  currency: Scalars['String']['output'];
  id: Scalars['String']['output'];
  maxPerOrder: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  priceCents: Scalars['Int']['output'];
  seatsAvailable: Scalars['Int']['output'];
  sectionKey: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
};

export type TicketTypeSeats = {
  __typename: 'TicketTypeSeats';
  event: Maybe<Event>;
  seatMap: Maybe<SeatMap>;
  seats: Array<Seat>;
  ticketType: Maybe<TicketType>;
};

export type UnavailableSeats = {
  __typename: 'UnavailableSeats';
  seatIds: Array<Scalars['String']['output']>;
};

export type VerifyEmailInput = {
  code: Scalars['String']['input'];
  email: Scalars['String']['input'];
  rememberMe: Scalars['Boolean']['input'];
};
