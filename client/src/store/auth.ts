import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export interface UserPreferences {
  notifications?: {
    tradeExecutions?: boolean;
    priceAlerts?: boolean;
    strategySignals?: boolean;
    portfolioUpdates?: boolean;
    emailDigest?: boolean;
    pushNotifications?: boolean;
  };
  appearance?: {
    theme?: "dark" | "light" | "system";
    density?: "comfortable" | "compact";
  };
  privacy?: {
    showProfile?: boolean;
    showActivity?: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  username: string;
  walletAddress?: string;
  tier: 'free' | 'professional' | 'enterprise' | 'admin';
  role?: 'user' | 'admin';
  status?: 'active' | 'suspended' | 'pending';
  emailVerified?: boolean;
  createdAt: string;
  lastLoginAt?: string;
  preferences?: UserPreferences;
}

// Atom to store the JWT token in localStorage
export const tokenAtom = atomWithStorage<string | null>('aether_token', null);

// Atom to store user info in localStorage
export const userAtom = atomWithStorage<User | null>('aether_user', null);

// Derived atom to check if user is authenticated
export const isAuthenticatedAtom = atom((get) => !!get(tokenAtom));
