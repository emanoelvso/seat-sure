/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type CardInput = {
  cvv: string;
  expiry: string;
  holder: string;
  number: string;
};

export type CheckoutOrderStatus =
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'
  | 'PAID'
  | 'PENDING';

export type ConfirmPasswordResetCodeInput = {
  code: string;
  email: string;
};

export type DateRange = {
  from: string;
  to?: string | null | undefined;
};

export type EventType =
  | 'CONCERT'
  | 'FESTIVAL'
  | 'SHOW'
  | 'SPORT';

export type FindArtistInput = {
  slug: string;
};

export type FindCheckoutOrderInput = {
  orderId: string;
};

export type FindEventTicketsInput = {
  eventId: string;
};

export type FindEventsInput = {
  city?: string | null | undefined;
  dateRange?: DateRange | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
  priceRange?: PriceRange | null | undefined;
  type?: EventType | null | undefined;
};

export type FindTicketTypeSeatsInput = {
  eventId: string;
  ticketTypeId: string;
};

export type FindUnavailableSeatsInput = {
  eventId: string;
};

export type LogInInput = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type LogInStatus =
  | 'SIGNED_IN'
  | 'VERIFICATION_REQUIRED';

export type PayOrderInput = {
  card: CardInput;
  orderId: string;
};

export type PriceRange = {
  max?: number | null | undefined;
  min?: number | null | undefined;
};

export type RefreshSessionInput = {
  refreshToken: string;
};

export type RequestPasswordResetInput = {
  email: string;
};

export type ResendCodeInput = {
  email: string;
  purpose: ResendCodePurpose;
};

export type ResendCodePurpose =
  | 'RESET_PASSWORD'
  | 'VERIFY_EMAIL';

export type ResetPasswordInput = {
  newPassword: string;
  resetToken: string;
};

export type SignUpInput = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

export type StartCheckoutInput = {
  eventId: string;
  seatIds: Array<string>;
  ticketTypeId: string;
};

export type VerifyEmailInput = {
  code: string;
  email: string;
  rememberMe: boolean;
};

export type FindArtistBySlugQueryVariables = Exact<{
  input: FindArtistInput;
}>;


export type FindArtistBySlugQuery = { findArtistBySlug: { __typename: 'FindArtist', artist: { __typename: 'Artist', name: string, cover: string, bio: string } | null, eventsByCity: Array<{ __typename: 'EventsByCity', city: string, country: string, events: Array<{ __typename: 'Event', id: string, type: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string, tags: Array<string> | null }> | null }> | null, nearbyEvents: Array<{ __typename: 'Event', id: string, type: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string }> | null, featuredFestival: { __typename: 'Event', id: string, type: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string } | null } };

export type ConfirmPasswordResetCodeMutationVariables = Exact<{
  input: ConfirmPasswordResetCodeInput;
}>;


export type ConfirmPasswordResetCodeMutation = { confirmPasswordResetCode: { __typename: 'PasswordResetGrant', resetToken: string, expiresAt: string } };

export type LogInMutationVariables = Exact<{
  input: LogInInput;
}>;


export type LogInMutation = { logIn: { __typename: 'LogInResult', status: LogInStatus, codeSent: boolean | null, resendAvailableAt: string | null, session: { __typename: 'SessionTokens', accessToken: string, refreshToken: string | null, expiresAt: string, persistent: boolean } | null } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { __typename: 'CurrentUser', id: string, email: string, firstName: string, lastName: string, avatarUrl: string | null } };

export type RefreshSessionMutationVariables = Exact<{
  input: RefreshSessionInput;
}>;


export type RefreshSessionMutation = { refreshSession: { __typename: 'SessionTokens', accessToken: string, refreshToken: string | null, expiresAt: string, persistent: boolean } };

export type RequestPasswordResetMutationVariables = Exact<{
  input: RequestPasswordResetInput;
}>;


export type RequestPasswordResetMutation = { requestPasswordReset: { __typename: 'CodeDelivery', codeSent: boolean, resendAvailableAt: string } };

export type ResendCodeMutationVariables = Exact<{
  input: ResendCodeInput;
}>;


export type ResendCodeMutation = { resendCode: { __typename: 'CodeDelivery', codeSent: boolean, resendAvailableAt: string } };

export type ResetPasswordMutationVariables = Exact<{
  input: ResetPasswordInput;
}>;


export type ResetPasswordMutation = { resetPassword: boolean };

export type SignUpMutationVariables = Exact<{
  input: SignUpInput;
}>;


export type SignUpMutation = { signUp: { __typename: 'SignUpResult', email: string, codeSent: boolean, resendAvailableAt: string } };

export type VerifyEmailMutationVariables = Exact<{
  input: VerifyEmailInput;
}>;


export type VerifyEmailMutation = { verifyEmail: { __typename: 'SessionTokens', accessToken: string, refreshToken: string | null, expiresAt: string, persistent: boolean } };

export type FindCheckoutOrderQueryVariables = Exact<{
  input: FindCheckoutOrderInput;
}>;


export type FindCheckoutOrderQuery = { findCheckoutOrder: { __typename: 'CheckoutOrder', id: string, status: CheckoutOrderStatus, expiresAt: string, secondsLeft: number, quantity: number, currency: string, subtotalCents: number, serviceFeeCents: number, taxCents: number, totalCents: number, unitPriceCents: number, unitServiceFeeCents: number, unitTaxCents: number, event: { __typename: 'CheckoutEvent', id: string, name: string, coverImage: string, venue: string, city: string, country: string, startAt: string }, ticketType: { __typename: 'CheckoutTicketType', id: string, name: string }, items: Array<{ __typename: 'CheckoutOrderItem', seatId: string, row: string, number: string }> } | null };

export type PayOrderMutationVariables = Exact<{
  input: PayOrderInput;
}>;


export type PayOrderMutation = { payOrder: { __typename: 'CheckoutOrder', id: string, status: CheckoutOrderStatus, expiresAt: string, secondsLeft: number, quantity: number, currency: string, subtotalCents: number, serviceFeeCents: number, taxCents: number, totalCents: number, unitPriceCents: number, unitServiceFeeCents: number, unitTaxCents: number, event: { __typename: 'CheckoutEvent', id: string, name: string, coverImage: string, venue: string, city: string, country: string, startAt: string }, ticketType: { __typename: 'CheckoutTicketType', id: string, name: string }, items: Array<{ __typename: 'CheckoutOrderItem', seatId: string, row: string, number: string }> } };

export type StartCheckoutMutationVariables = Exact<{
  input: StartCheckoutInput;
}>;


export type StartCheckoutMutation = { startCheckout: { __typename: 'CheckoutOrder', id: string, status: CheckoutOrderStatus, expiresAt: string, secondsLeft: number, quantity: number, currency: string, subtotalCents: number, serviceFeeCents: number, taxCents: number, totalCents: number, unitPriceCents: number, unitServiceFeeCents: number, unitTaxCents: number, event: { __typename: 'CheckoutEvent', id: string, name: string, coverImage: string, venue: string, city: string, country: string, startAt: string }, ticketType: { __typename: 'CheckoutTicketType', id: string, name: string }, items: Array<{ __typename: 'CheckoutOrderItem', seatId: string, row: string, number: string }> } };

export type FindEventsQueryVariables = Exact<{
  input?: FindEventsInput | null | undefined;
}>;


export type FindEventsQuery = { findEvents: { __typename: 'FindEvents', cities: Array<string> | null, hasMore: boolean, events: Array<{ __typename: 'Event', id: string, type: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string }> | null } };

export type GetHomeSectionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetHomeSectionsQuery = { getHomeSections: { __typename: 'HomeSections', concerts: { __typename: 'EventSection', categories: Array<string> | null, events: Array<{ __typename: 'Event', id: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string, headliner: { __typename: 'EventHeadliner', slug: string, name: string } | null }> | null } | null, shows: { __typename: 'EventSection', categories: Array<string> | null, events: Array<{ __typename: 'Event', id: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string }> | null } | null, sports: { __typename: 'EventSection', categories: Array<string> | null, events: Array<{ __typename: 'Event', id: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string }> | null } | null, festivals: { __typename: 'EventSection', categories: Array<string> | null, events: Array<{ __typename: 'Event', id: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string }> | null } | null } };

export type FindEventTicketsQueryVariables = Exact<{
  input: FindEventTicketsInput;
}>;


export type FindEventTicketsQuery = { findEventTickets: { __typename: 'EventTickets', event: { __typename: 'Event', id: string, name: string, type: string, coverImage: string, venue: string, city: string, country: string, startAt: string, endsAt: string, headliner: { __typename: 'EventHeadliner', slug: string, name: string } | null } | null, seatMap: { __typename: 'SeatMap', id: string, name: string, viewBoxWidth: number, viewBoxHeight: number, labelSize: number, labelWeight: number, stage: { __typename: 'SeatMapStage', label: string | null, labelX: number | null, labelY: number | null, shapes: Array<{ __typename: 'SeatMapStageShape', path: string, color: string }> }, sections: Array<{ __typename: 'SeatMapSection', key: string, label: string, color: string, shapes: Array<{ __typename: 'SeatMapSectionShape', path: string, labelX: number, labelY: number, labelRotation: number }> }> } | null, ticketTypes: Array<{ __typename: 'TicketType', id: string, sectionKey: string, name: string, priceCents: number, currency: string, seatsAvailable: number, maxPerOrder: number, tags: Array<string> }> } };

export type FindTicketTypeSeatsQueryVariables = Exact<{
  input: FindTicketTypeSeatsInput;
}>;


export type FindTicketTypeSeatsQuery = { findTicketTypeSeats: { __typename: 'TicketTypeSeats', event: { __typename: 'Event', id: string, name: string, type: string, coverImage: string, venue: string, city: string, country: string, startAt: string, endsAt: string, headliner: { __typename: 'EventHeadliner', slug: string, name: string } | null } | null, ticketType: { __typename: 'TicketType', id: string, sectionKey: string, name: string, priceCents: number, currency: string, seatsAvailable: number, maxPerOrder: number, tags: Array<string> } | null, seatMap: { __typename: 'SeatMap', id: string, name: string, viewBoxWidth: number, viewBoxHeight: number, labelSize: number, labelWeight: number, stage: { __typename: 'SeatMapStage', label: string | null, labelX: number | null, labelY: number | null, shapes: Array<{ __typename: 'SeatMapStageShape', path: string, color: string }> }, sections: Array<{ __typename: 'SeatMapSection', key: string, label: string, color: string, shapes: Array<{ __typename: 'SeatMapSectionShape', path: string, labelX: number, labelY: number, labelRotation: number }> }> } | null, seats: Array<{ __typename: 'Seat', id: string, row: string, number: string, x: number, y: number }> } };

export type FindUnavailableSeatsQueryVariables = Exact<{
  input: FindUnavailableSeatsInput;
}>;


export type FindUnavailableSeatsQuery = { findUnavailableSeats: { __typename: 'UnavailableSeats', seatIds: Array<string> } };
