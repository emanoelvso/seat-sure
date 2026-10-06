import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  FindAccountOrderQuery,
  FindAccountOrderQueryVariables,
} from "@/types/__generated__/graphql";

// A Completed or Canceled order of the signed-in user, with its event, seats
// and payment card; null otherwise (ORDDETAIL-02, ORDDETAIL-04).
export const FIND_ACCOUNT_ORDER: TypedDocumentNode<
  FindAccountOrderQuery,
  FindAccountOrderQueryVariables
> = gql`
  query findAccountOrder($input: FindAccountOrderInput!) {
    findAccountOrder(input: $input) {
      id
      status
      createdAt
      event {
        name
        coverImage
        venue
        city
        country
        startAt
      }
      ticketTypeName
      items {
        row
        number
      }
      quantity
      currency
      serviceFeeCents
      taxCents
      totalCents
      paymentId
      paymentCard {
        brand
        last4
      }
    }
  }
`;

export type AccountOrderDetail = NonNullable<
  FindAccountOrderQuery["findAccountOrder"]
>;
