import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  MarkNotificationReadMutation,
  MarkNotificationReadMutationVariables,
} from "@/types/__generated__/graphql";

// Marks one of the caller's notifications read; a second call keeps the first
// read time (NOTIF-10, NOTIF-11).
export const MARK_NOTIFICATION_READ: TypedDocumentNode<
  MarkNotificationReadMutation,
  MarkNotificationReadMutationVariables
> = gql`
  mutation markNotificationRead($input: NotificationIdInput!) {
    markNotificationRead(input: $input) {
      id
      readAt
    }
  }
`;
