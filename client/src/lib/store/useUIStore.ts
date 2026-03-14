import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalType =
  | 'quickAdd'
  | 'upgrade'
  | 'newBrand'
  | 'contentDetail'
  | 'platformConnect'
  | null;

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  level: NotificationLevel;
  title: string;
  message?: string;
  dismissedAt?: string;
}

interface UIState {
  sidebarOpen: boolean;
  activeModal: ModalType;
  modalPayload: Record<string, unknown> | null; // contextual data for the open modal
  notifications: AppNotification[];

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  openModal: (modal: ModalType, payload?: Record<string, unknown>) => void;
  closeModal: () => void;
  addNotification: (notif: Omit<AppNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  activeModal: null,
  modalPayload: null,
  notifications: [],

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  openModal: (modal, payload = {}) =>
    set({ activeModal: modal, modalPayload: payload }),

  closeModal: () =>
    set({ activeModal: null, modalPayload: null }),

  addNotification: (notif) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notif,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
