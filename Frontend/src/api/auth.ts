import { api } from './client';
import type { AuthSession, User } from './types';

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  currency?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface ProfileUpdateInput {
  name?: string;
  currency?: string;
  /** Minimum 8 characters. Changing it invalidates nothing server-side, but keep the token. */
  password?: string;
}

export const authApi = {
  signUp: (input: SignUpInput) => api.post<AuthSession>('/auth/register', input),
  signIn: (input: SignInInput) => api.post<AuthSession>('/auth/login', input),
  me: () => api.get<User>('/auth/me'),
  signOut: () => api.post<{ message: string }>('/auth/logout'),
  updateProfile: (input: ProfileUpdateInput) => api.put<User>('/auth/profile', input),
};
