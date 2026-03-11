
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

export type Platform = 'linkedin' | 'newsletter';
export type ContentType = 'post' | 'article' | 'linkedin_newsletter' | 'email';

export interface BrandFile {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64
  size: number;
}

export interface CompetitorDetail {
  name: string;
  url: string;
  editorialPositioning: string;
  strengths: string[];
  weaknesses: string[];
  contentPatterns: string;
  analysisQuality?: string;
  analysisNotes?: string;
}

export interface CompetitorGap {
  gap: string;
  whyItMatters: string;
  brandAdvantage: string;
  priority?: string;
  scores?: {
    reality: number;
    defensibility: number;
    targetRelevance: number;
    editorialLeverage: number;
  };
}

export interface StrategicTip {
  action: string;
  objective: string;
  channel: string;
  expectedImpact: string;
}

export interface CompetitorInsight {
  competitors: CompetitorDetail[];
  overallMarketGaps: CompetitorGap[];
  practicalStrategicTips: StrategicTip[];
  strategicNotes?: string[];
  sources?: GroundingSource[];
}

export interface BrandKB {
  name: string;
  websiteUrl: string;
  description: string;
  mission: string;
  usp: string;
  values: string;
  toneOfVoice: string;
  brandPersonality: string;
  targetSummary: string;
  visualKeywords: string;
  linkedinGuidelines: string;
  newsletterGuidelines: string;
  linkedinNewsletterGuidelines: string;
  linkedinArticleGuidelines: string;
  linkedinPostsPerMonth: number;
  newsletterPostsPerMonth: number;
  competitors: string[]; // Keep for legacy
  competitorPostLinks?: string[]; // New
  competitorArticleLinks?: string[]; // New
  competitorPostInsights?: CompetitorInsight;
  competitorArticleInsights?: CompetitorInsight;
  logoUrl?: string;
  faviconUrl?: string;
  brandPalette?: string[];
  files?: BrandFile[];
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  pains: string;
  goals: string;
  primaryPillar?: string;
  secondaryPillars?: string[];
  mappingRationale?: string;
}

export interface Pillar {
  id: string;
  title: string;
  description: string;
}

export interface SuggestedSector {
  sector: string;
  rationale: string;
  targetRoles: { role: string; focus: string }[];
}

export type MediaType = 'image' | 'video' | 'carousel' | 'infographic' | 'none';

export interface CalendarPost {
  id: string;
  platform: Platform;
  contentType: ContentType;
  scheduledDate: string;
  pillar: string;
  persona: string;
  hook: string;
  angle: string;
  status: 'planned' | 'drafted' | 'published';
  fullContent?: string;
  sources?: GroundingSource[];
  mediaType?: MediaType;
  suggestedMediaType?: MediaType;
  mediaUrl?: string;
  mediaPrompt?: string;
  strategyId?: string;
}

export interface MonthlyStrategy {
  id: string;
  platform: Platform;
  month: number;
  year: number;
  objective: string;
  posts: CalendarPost[];
  postsPerWeek: number;
  nextMonthProjection?: string;
}

export interface BrandProject {
  id: string;
  userId: string;
  brand: BrandKB;
  personas: Persona[];
  pillars: Pillar[];
  strategies: MonthlyStrategy[];
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface CustomPost {
  platform: Platform;
  objective: string;
  baseText: string;
  fullContent?: string;
  sources?: GroundingSource[];
}

export type View = 
  | 'knowledge' 
  | 'personas' 
  | 'pillars' 
  | 'suite_guidelines'
  | 'linkedin_benchmarking' 
  | 'calendar' 
  | 'linkedin_strategy' 
  | 'linkedin_custom'
  | 'newsletter_strategy' 
  | 'newsletter_custom';
