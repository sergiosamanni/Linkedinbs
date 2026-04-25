
export interface ApiKeys {
  gemini?: string;
  openai?: string;
  anthropic?: string;
  openrouter?: string;
  deepseek?: string;
}

export interface UserSettings {
  preferredModel: string;
  useCustomKeys: boolean;
  openrouterModel?: string;
  deepseekModel?: string;
}

export type UserRole = 'admin' | 'user';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  apiKeys: ApiKeys;
  settings: UserSettings;
  linkedinAuth?: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    expiresAt?: string;
    personUrn?: string;
  };
}

export type Platform = 'linkedin' | 'newsletter';
export type ContentType = 'post' | 'article' | 'linkedin_newsletter' | 'email';

export interface BrandFile {
  id: string;
  name: string;
  mimeType: string;
  data?: string;
  size: number;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface CompetitorDetail {
  name: string;
  url: string;
  strengths: string[];
  weaknesses: string[];
  contentStrategy: string;
  estimatedFollowers: string;
  postingFrequency: string;
}

export interface CompetitorGap {
  gap: string;
  opportunity: string;
  priority: string;
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
  strategicNotes: string[];
}

export interface BrandKB {
  name: string;
  websiteUrl: string;
  linkedinUrl?: string;
  description: string;
  mission: string;
  usp: string;
  values: string;
  toneOfVoice: string;
  brandPersonality: string;
  targetSummary: string;
  visualKeywords: string;
  linkedinGuidelines: string;
  linkedinNewsletterGuidelines: string;
  linkedinArticleGuidelines: string;
  newsletterGuidelines: string;
  linkedinPostsPerMonth: number;
  newsletterPostsPerMonth: number;
  competitors: string[];
  competitorPostLinks?: string[];
  competitorArticleLinks?: string[];
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
  customTitle?: string;
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
  collaborators?: string[];
  brand: BrandKB;
  personas: Persona[];
  pillars: Pillar[];
  strategies: MonthlyStrategy[];
  linkedinAuth?: {
    accessToken: string;
    expiresAt: string;
    personUrn: string;
    connectedAs?: string;
  };
}

export interface CustomPost {
  platform: Platform;
  contentType: ContentType;
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
  | 'newsletter_custom'
  | 'settings'
  | 'admin_users';
