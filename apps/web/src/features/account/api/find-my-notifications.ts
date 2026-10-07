import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  MyNotificationsQuery,
  MyNotificationsQueryVariables,
} from "@/types/__generated__/graphql";

// One page of the signed-in user's notifications in a tab, plus the count of
// every tab (NOTIF-06).
export const MY_NOTIFICATIONS: TypedDocumentNode<
  MyNotificationsQuery,
  MyNotificationsQueryVariables
> = gql`
  query myNotifications($input: MyNotificationsInput!) {
    myNotifications(input: $input) {
      items {
        id
        type
        eventName
        createdAt
        readAt
      }
      counts {
        all
        unread
        read
      }
      page
      totalPages
    }
  }
`;

export type NotificationsPage = MyNotificationsQuery["myNotifications"];
export type NotificationItem = NotificationsPage["items"][number];
export type NotificationCounts = NotificationsPage["counts"];
