import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  MarkAllNotificationsReadMutation,
  MarkAllNotificationsReadMutationVariables,
} from "@/types/__generated__/graphql";

// Marks every notification the caller had at request time read and returns
// the new tab counts (NOTIF-12).
export const MARK_ALL_NOTIFICATIONS_READ: TypedDocumentNode<
  MarkAllNotificationsReadMutation,
  MarkAllNotificationsReadMutationVariables
> = gql`
  mutation markAllNotificationsRead {
    markAllNotificationsRead {
      all
      unread
      read
    }
  }
`;
