export type SessionRole = 'vendor' | 'admin';

export type AuthenticatedSession = {
  isAuthenticated: true;
  id: string;
  uid: string;
  role: SessionRole;
  email?: string | null;
  shopName?: string | null;
  ownerName?: string | null;
  storeCategory?: string | null;
  shopImageUrl?: string | null;
  phoneCountryCode?: string | null;
  phoneNumber?: string | null;
  fullPhoneNumber?: string | null;
  city?: string | null;
  weeklyCloseOn?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  shopFullAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActiveOnThru?: boolean | null;
  type?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UnauthenticatedSession = {
  isAuthenticated: false;
};

export type SessionData = AuthenticatedSession | UnauthenticatedSession;

