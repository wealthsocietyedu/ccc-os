import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  timezone: string;
  tier?: string;
}

interface UserState {
  profile: UserProfile | null;
  isAuthenticated: boolean;

  // Actions
  login: (user: UserProfile) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: null,
      isAuthenticated: false,

      login: (user) =>
        set({ profile: user, isAuthenticated: true }),

      logout: () =>
        set({ profile: null, isAuthenticated: false }),

      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        })),
    }),
    {
      name: 'ccc-user',
      // Only persist the profile; derive isAuthenticated from it on rehydrate
      partialize: (state) => ({ profile: state.profile }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = state.profile !== null;
        }
      },
    }
  )
);
