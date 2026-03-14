import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Platform = 'TikTok' | 'Instagram' | 'YouTube' | 'Twitter' | 'LinkedIn' | 'Threads';
export type ContentStatus = 'Idea' | 'Scripted' | 'Filming' | 'Scheduled' | 'Published' | 'Repurposed';
export type ContentFormat = 'Short Form Video' | 'Long Form' | 'Carousel' | 'Thread' | 'Story' | 'Email';
export type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';

export interface ContentItem {
  id: string;
  title: string;
  platform: Platform;
  status: ContentStatus;
  scheduledDate: string | null;
  pillar: string;
  format: ContentFormat;
  funnel_stage: FunnelStage;
  hook: string;
  cta: string;
  brand_id?: string;
  created_at?: string;
}

interface ContentState {
  items: ContentItem[];

  // Actions
  setItems: (items: ContentItem[]) => void;
  addContent: (item: Omit<ContentItem, 'id' | 'created_at'>) => void;
  updateContent: (id: string, updates: Partial<ContentItem>) => void;
  deleteContent: (id: string) => void;
  moveContentStatus: (id: string, status: ContentStatus) => void;
}

// ─── Mock initial data ────────────────────────────────────────────────────────
// Spread across all 6 pipeline columns so the board looks populated from day 1.

const MOCK_ITEMS: ContentItem[] = [
  // ── Idea ──────────────────────────────────────────────────────────────────
  {
    id: 'mock-1',
    title: '10 things I wish I knew before starting my channel',
    platform: 'YouTube',
    status: 'Idea',
    scheduledDate: null,
    pillar: 'Education',
    format: 'Long Form',
    funnel_stage: 'TOFU',
    hook: 'Nobody tells you this when you first start',
    cta: 'Subscribe',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    title: 'POV: Day in my life as a full-time creator',
    platform: 'TikTok',
    status: 'Idea',
    scheduledDate: null,
    pillar: 'Behind the Scenes',
    format: 'Short Form Video',
    funnel_stage: 'TOFU',
    hook: 'This is what 8 hours actually looks like',
    cta: 'Follow',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    title: 'Why 90% of creators burn out (and how to avoid it)',
    platform: 'Instagram',
    status: 'Idea',
    scheduledDate: null,
    pillar: 'Mindset',
    format: 'Carousel',
    funnel_stage: 'TOFU',
    hook: 'It\'s not the workload — it\'s this',
    cta: 'Save this',
    created_at: new Date().toISOString(),
  },

  // ── Scripted ──────────────────────────────────────────────────────────────
  {
    id: 'mock-4',
    title: 'How I went from 0 to 100K followers in 90 days',
    platform: 'Instagram',
    status: 'Scripted',
    scheduledDate: null,
    pillar: 'Case Study',
    format: 'Carousel',
    funnel_stage: 'MOFU',
    hook: 'I almost quit 3 times before this clicked',
    cta: 'DM me "100K"',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-5',
    title: 'The exact system I use to batch 30 pieces of content in a day',
    platform: 'TikTok',
    status: 'Scripted',
    scheduledDate: null,
    pillar: 'Process',
    format: 'Short Form Video',
    funnel_stage: 'MOFU',
    hook: 'Stop posting every day. Do this instead',
    cta: 'Follow for part 2',
    created_at: new Date().toISOString(),
  },

  // ── Filming ───────────────────────────────────────────────────────────────
  {
    id: 'mock-6',
    title: 'The #1 mistake new creators make (and how to fix it)',
    platform: 'YouTube',
    status: 'Filming',
    scheduledDate: null,
    pillar: 'Education',
    format: 'Long Form',
    funnel_stage: 'MOFU',
    hook: 'I made this mistake for 8 months straight',
    cta: 'Subscribe',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-7',
    title: 'Full brand kit breakdown — logo, colors, fonts, voice',
    platform: 'Instagram',
    status: 'Filming',
    scheduledDate: null,
    pillar: 'Education',
    format: 'Carousel',
    funnel_stage: 'TOFU',
    hook: 'Your brand isn\'t your logo',
    cta: 'Save this',
    created_at: new Date().toISOString(),
  },

  // ── Scheduled ─────────────────────────────────────────────────────────────
  {
    id: 'mock-8',
    title: 'My content creation workflow — revealed',
    platform: 'TikTok',
    status: 'Scheduled',
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    pillar: 'Process',
    format: 'Short Form Video',
    funnel_stage: 'MOFU',
    hook: 'I batch 30 videos in one day using this',
    cta: 'Follow',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-9',
    title: '5 monetization models every creator should know',
    platform: 'YouTube',
    status: 'Scheduled',
    scheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    pillar: 'Monetization',
    format: 'Long Form',
    funnel_stage: 'BOFU',
    hook: 'AdSense is the worst one — here\'s what actually pays',
    cta: 'Join my newsletter',
    created_at: new Date().toISOString(),
  },

  // ── Published ─────────────────────────────────────────────────────────────
  {
    id: 'mock-10',
    title: 'Why I deleted 50% of my content',
    platform: 'Instagram',
    status: 'Published',
    scheduledDate: null,
    pillar: 'Storytelling',
    format: 'Carousel',
    funnel_stage: 'TOFU',
    hook: 'It tanked my reach. Then something unexpected happened',
    cta: 'Save this',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-11',
    title: 'How to turn one YouTube video into 30 pieces of content',
    platform: 'TikTok',
    status: 'Published',
    scheduledDate: null,
    pillar: 'Process',
    format: 'Short Form Video',
    funnel_stage: 'MOFU',
    hook: 'One video = one month of content',
    cta: 'Follow for more',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // ── Repurposed ────────────────────────────────────────────────────────────
  {
    id: 'mock-12',
    title: 'Thread: 12 lessons from 1M video views',
    platform: 'Twitter',
    status: 'Repurposed',
    scheduledDate: null,
    pillar: 'Education',
    format: 'Thread',
    funnel_stage: 'TOFU',
    hook: 'I\'ve had 3 videos hit 1M views. Here\'s what they had in common',
    cta: 'Retweet',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-13',
    title: 'LinkedIn: The creator economy is broken. Here\'s the fix',
    platform: 'LinkedIn',
    status: 'Repurposed',
    scheduledDate: null,
    pillar: 'Thought Leadership',
    format: 'Thread',
    funnel_stage: 'TOFU',
    hook: 'Most creators are building someone else\'s audience',
    cta: 'Follow',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────

export const useContentStore = create<ContentState>()((set) => ({
  items: MOCK_ITEMS,

  setItems: (items) => set({ items }),

  addContent: (item) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          ...item,
          id: `content-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: new Date().toISOString(),
        },
      ],
    })),

  updateContent: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),

  deleteContent: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  moveContentStatus: (id, status) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, status } : item
      ),
    })),
}));
