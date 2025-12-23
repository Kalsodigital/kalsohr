import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, LoginCredentials, User } from '@/lib/types/auth';
import * as authApi from '@/lib/api/auth';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true, // Start as true until hydration completes
      _hasHydrated: false, // Track hydration state
      impersonatedOrg: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        try {
          const data = await authApi.login(credentials);

          // Store tokens in localStorage
          localStorage.setItem('accessToken', data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.tokens.refreshToken);

          set({
            user: data.user,
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear state and localStorage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');

          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            impersonatedOrg: null,
          });
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          const newAccessToken = await authApi.refreshToken(refreshToken);
          localStorage.setItem('accessToken', newAccessToken);

          set({ accessToken: newAccessToken });
        } catch (error) {
          // If refresh fails, logout user
          get().logout();
          throw error;
        }
      },

      setUser: (user: User | null) => {
        set({ user });
      },

      refreshUserData: async () => {
        const { user } = get();
        if (!user) return;

        try {
          // Re-fetch user data with updated permissions
          const response = await authApi.getCurrentUser();
          set({ user: response.user });
        } catch (error) {
          console.error('Failed to refresh user data:', error);
          throw error;
        }
      },

      startImpersonation: (org) => {
        console.log('🎭 Starting impersonation', {
          org,
          user: get().user?.email,
          platformRole: get().user?.role?.name
        });
        set({ impersonatedOrg: org });
        console.log('🎭 Impersonation state set - using platform role permissions', {
          impersonatedOrg: org,
          isSuperAdmin: get().user?.isSuperAdmin,
          platformRole: get().user?.role?.name
        });
      },

      stopImpersonation: () => {
        console.log('🎭 Stopping impersonation');
        set({ impersonatedOrg: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        impersonatedOrg: state.impersonatedOrg,
      }),
      onRehydrateStorage: () => {
        // Return a function that will be called after rehydration completes
        return (state) => {
          // This runs after rehydration, whether state exists or not
          if (state) {
            state._hasHydrated = true;
            state.isLoading = false;
          } else {
            // If no state was rehydrated, still need to set loading to false
            useAuthStore.setState({ _hasHydrated: true, isLoading: false });
          }
        };
      },
    }
  )
);
