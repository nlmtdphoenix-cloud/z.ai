import { create } from 'zustand';
import type { Employee } from '@/lib/types';

interface AuthState {
  user: Employee | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: Employee, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (user, token) => {
    set({ user, token, isAuthenticated: true });
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
  },
  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  },
}));

// Hydrate from localStorage on client side
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('auth_user');
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAuthStore.getState().login(user, token);
    } catch {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }
}
