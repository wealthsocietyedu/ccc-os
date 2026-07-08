import AIStudio from './components/AIStudio.jsx';
import ContentAdvisor from './components/ContentAdvisor.jsx';
import XPublisher from './components/XPublisher.jsx';
import VisualEngine from './components/VisualEngine.jsx';
import SmartClipper from './components/SmartClipper.jsx';
import CarouselPromptGenerator from './components/CarouselPromptGenerator.jsx';
import ContentFlow from './components/ContentFlow';
import VideoDownloader from './components/VideoDownloader';
import ChannelDownloader from './components/ChannelDownloader.jsx';

export const MODULES = [
  { id: 'video-downloader', label: 'Video Downloader', icon: 'download', badge: 'NEW', component: VideoDownloader, props: () => ({}) },
  { id: 'ai-studio', label: 'AI Studio', icon: 'studio', badge: 'NEW', component: AIStudio, props: (activeBrand, user) => ({ activeBrand }) },
  { id: 'content-advisor', label: 'Content Advisor', icon: 'advisor', badge: 'NEW', component: ContentAdvisor, props: (activeBrand, user) => ({ activeBrand }) },
  { id: 'x-publisher', label: 'X Publisher', icon: 'xpublisher', badge: 'NEW', component: XPublisher, props: (activeBrand, user) => ({ activeBrand }) },
  { id: 'visual-engine', label: 'Visual Engine', icon: 'image', badge: 'NEW', component: VisualEngine, props: (activeBrand, user) => ({ activeBrand }) },
  { id: 'smart-clipper', label: 'Smart Clipper', icon: 'scissors', badge: 'NEW', component: SmartClipper, props: (activeBrand, user) => ({ activeBrand }) },
  { id: 'carousel-prompts', label: 'Carousel Prompts', icon: 'studio', badge: 'NEW', component: CarouselPromptGenerator, props: () => ({}) },
  { id: 'content-flow', label: 'Content Flow', icon: 'zap', badge: 'NEW', component: ContentFlow, props: () => ({}) },
  { id: 'channel-downloader', label: 'Channel Downloader', icon: 'download', badge: 'NEW', component: ChannelDownloader, props: () => ({}) },
];
