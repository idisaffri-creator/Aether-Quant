import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export interface User {
  id: string;
  email: string;
  username: string;
  walletAddress?: string;
  tier: 'free' | 'professional' | 'enterprise' | 'admin';
  role?: 'user' | 'admin';
  createdAt: string;
}

// Atom to store the JWT token in localStorage
export const tokenAtom = atomWithStorage<string | null>('aether_token', null);

// Atom to store user info in localStorage
export const userAtom = atomWithStorage<User | null>('aether_user', null);

// Derived atom to check if user is authenticated
export const isAuthenticatedAtom = atom((get) => !!get(tokenAtom));
