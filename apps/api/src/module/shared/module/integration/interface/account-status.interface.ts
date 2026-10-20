export interface AccountStatusApi {
  // True while an account deletion is pending or once it completed
  isDeleted(userId: string): Promise<boolean>;
}

export const AccountStatusApi = Symbol('AccountStatusApi');
