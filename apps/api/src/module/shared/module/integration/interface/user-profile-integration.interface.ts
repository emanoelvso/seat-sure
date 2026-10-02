export interface UserProfileSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface CreateProfileInput {
  userId: string;
  firstName: string;
  lastName: string;
}

export interface UserProfileApi {
  createProfile(input: CreateProfileInput): Promise<void>;
  findProfile(userId: string): Promise<UserProfileSummary | null>;
}

export const UserProfileApi = Symbol('UserProfileApi');
