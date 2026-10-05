export interface IdentityApi {
  findAccountEmail(userId: string): Promise<string | null>;
}

export const IdentityApi = Symbol('IdentityApi');
