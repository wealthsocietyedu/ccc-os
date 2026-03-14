import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConnectedPlatform {
  name: string;
  label: string;           // Display name
  connected: boolean;
  accessToken: string | null;
  handle: string | null;   // @username or channel name
  connectedAt: string | null;
}

interface PlatformState {
  platforms: ConnectedPlatform[];

  // Actions
  connectPlatform: (name: string, token: string, handle?: string) => void;
  disconnectPlatform: (name: string) => void;
  updateToken: (name: string, token: string) => void;
}

// ─── Initial platform list ────────────────────────────────────────────────────

const DEFAULT_PLATFORMS: ConnectedPlatform[] = [
  { name: 'youtube',   label: 'YouTube',    connected: false, accessToken: null, handle: null, connectedAt: null },
  { name: 'instagram', label: 'Instagram',  connected: false, accessToken: null, handle: null, connectedAt: null },
  { name: 'tiktok',    label: 'TikTok',     connected: false, accessToken: null, handle: null, connectedAt: null },
  { name: 'twitter',   label: 'Twitter / X', connected: false, accessToken: null, handle: null, connectedAt: null },
  { name: 'linkedin',  label: 'LinkedIn',   connected: false, accessToken: null, handle: null, connectedAt: null },
  { name: 'threads',   label: 'Threads',    connected: false, accessToken: null, handle: null, connectedAt: null },
  { name: 'facebook',  label: 'Facebook',   connected: false, accessToken: null, handle: null, connectedAt: null },
  { name: 'pinterest', label: 'Pinterest',  connected: false, accessToken: null, handle: null, connectedAt: null },
];

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set) => ({
      platforms: DEFAULT_PLATFORMS,

      connectPlatform: (name, token, handle) =>
        set((state) => ({
          platforms: state.platforms.map((p) =>
            p.name === name
              ? {
                  ...p,
                  connected: true,
                  accessToken: token,
                  handle: handle ?? p.handle,
                  connectedAt: new Date().toISOString(),
                }
              : p
          ),
        })),

      disconnectPlatform: (name) =>
        set((state) => ({
          platforms: state.platforms.map((p) =>
            p.name === name
              ? { ...p, connected: false, accessToken: null, handle: null, connectedAt: null }
              : p
          ),
        })),

      updateToken: (name, token) =>
        set((state) => ({
          platforms: state.platforms.map((p) =>
            p.name === name ? { ...p, accessToken: token } : p
          ),
        })),
    }),
    {
      name: 'ccc-platforms',
      // Never persist raw tokens to localStorage — only connection status and handles
      partialize: (state) => ({
        platforms: state.platforms.map(({ accessToken, ...rest }) => rest),
      }),
    }
  )
);
