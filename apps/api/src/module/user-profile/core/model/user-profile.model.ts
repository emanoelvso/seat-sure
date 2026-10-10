export interface UserProfileModel {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  state: string | null;
  city: string | null;
  birthDate: string | null; // 'YYYY-MM-DD'
  phoneCountryCode: string | null; // '+1' | '+49' | '+34' | '+33'
  phoneNumber: string | null; // digits only, 4-14
  zipCode: string | null;
}
