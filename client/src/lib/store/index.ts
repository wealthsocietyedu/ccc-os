// Barrel export — import any store from 'lib/store'
export { useUserStore } from './useUserStore';
export type { UserProfile } from './useUserStore';

export { useContentStore } from './useContentStore';
export type { ContentItem, ContentStatus, Platform, ContentFormat, FunnelStage } from './useContentStore';

export { usePlatformStore } from './usePlatformStore';
export type { ConnectedPlatform } from './usePlatformStore';

export { useUIStore } from './useUIStore';
export type { AppNotification, ModalType, NotificationLevel } from './useUIStore';
