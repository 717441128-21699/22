import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../../shared/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  permissions: UserRole[];
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  hasPermission: (requiredRole: UserRole[]) => boolean;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  national: 4,
  provincial: 3,
  municipal: 2,
  regional: 1,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      permissions: [],

      login: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
          permissions: [user.role],
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          permissions: [],
        });
      },

      setUser: (user) => {
        set({
          user,
          permissions: [user.role],
        });
      },

      hasPermission: (requiredRoles) => {
        const { user } = get();
        if (!user) return false;
        if (requiredRoles.length === 0) return true;

        const userLevel = ROLE_HIERARCHY[user.role];
        return requiredRoles.some(
          (role) => ROLE_HIERARCHY[role] <= userLevel
        );
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token ? state.token.replace(/^Bearer\s+/i, '') : state.token,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          state.token = state.token.replace(/^Bearer\s+/i, '');
        }
      },
    }
  )
);
