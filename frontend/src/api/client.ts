import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface FormData {
  // Common fields
  companyName?: string;
  targetCompany?: string;
  website?: string;
  companyWebsite?: string;
  industry?: string;
  additionalContext?: string;

  // Net New fields
  linkedIn?: string;
  businessChallenge?: string;

  // Closed Lost fields
  opportunityName?: string;
  champion?: string;
  championTitle?: string;
  championEmail?: string;
  lossReason?: string;
  lossDate?: string;
  newContext?: string;

  // Expansion fields
  previousProject?: string;
  projectType?: string;
  newTrigger?: string;
  healthScore?: string;
  contactName?: string;

  // Follow-up Sequence fields
  lastTouchpointType?: string;
  lastTouchpointContext?: string;
  touchpointNumber?: string;
  prospectName?: string;
  outputType?: string;
  followUpWebsite?: string;  // Optional website for context enrichment

  // Generation options
  includeLoom?: boolean;
  tone?: string; // 'professional_curious' | 'consultative' | 'direct' | 'executive' | 'warm'

  // Client Engagement fields
  engagementType?: string; // 'ff' or 'eb'
  clientName?: string;
  projectPhase?: string;
  lastTouchpointDate?: string;
  channelType?: string; // 'email' | 'slack' | 'inperson'
  clientTier?: string; // 'strategic' | 'target' | 'growth'
  recentWins?: string;
  upcomingConcerns?: string;
}

export interface GenerateRequest {
  formData: FormData;
  workflowType: 'netnew' | 'closedlost' | 'expansion' | 'followup' | 'engagement';
}

export interface EmailOutput {
  subject: string;
  subjectAlt?: string;
  body: string;
  loomTitle: string;
  tone?: string;
}

export interface LoomScript {
  title: string;
  totalDuration: string;
  script: {
    phase1: { timestamp: string; visual: string; content: string };
    phase2: { timestamp: string; visual: string; content: string };
    phase3: { timestamp: string; visual: string; content: string };
    phase4: { timestamp: string; visual: string; content: string };
  };
  keyMessages: string[];
}

export interface SlideContent {
  slideTitle: string;
  problem: {
    headline: string;
    subheadline?: string;
  };
  reality: {
    bullets: string[];
  };
  shift: {
    from: string;
    to: string;
    visualConcept: string;
    oneLiner: string;
  };
  speakerNotes?: string;
}

export interface IntelligenceBrief {
  companySummary: string | null;
  businessModel: string | null;
  servicesProducts: string[];
  industry?: string;
  pagesScraped: {
    homepage: boolean;
    about: boolean;
    products: boolean;
  };
}

export interface FollowUpOutput {
  outputType: 'email' | 'phone' | 'linkedin';
  emailDraft?: {
    subject: string;
    subjectNote?: string;
    body: string;
  };
  phoneScript?: {
    opening: string;
    mainPoints: string[];
    closing: string;
    duration: string;
  };
  linkedInMessage?: {
    message: string;
    characterCount: number;
  };
}

export interface EngagementOutput {
  engagementType: 'ff' | 'eb';
  channelType: 'email' | 'slack' | 'inperson';
  outreachMessage: {
    subject?: string; // For email
    body: string;
  };
  meetingAgenda: {
    purpose: string;
    duration: string;
    sections: Array<{
      title: string;
      bullets: string[];
      timeAllocation: string;
    }>;
  };
  industryInsights: Array<{
    headline: string;
    bullets: string[];
    sourceUrl?: string;
    sourceName?: string;
    insightType: 'industry_specific' | 'salesforce' | 'ai_automation' | 'general';
    verificationNote?: string; // Search term to verify the source
  }>;
}

export interface ScrapePreviewResponse {
  success: boolean;
  companyName: string;
  industry: string | null;
  companySummary: string | null;
  scrapedAt: string;
  error: string | null;
}

export interface GenerateResponse {
  success: boolean;
  generatedAt: string;
  processingTime: string;
  workflowType: string;
  companyName: string;
  email?: EmailOutput;
  loomScript?: LoomScript;
  slideContent?: SlideContent;
  intelligenceBrief?: IntelligenceBrief;
  followUpOutput?: FollowUpOutput;
  engagementOutput?: EngagementOutput;
  metadata?: {
    confidenceLevel: string;
    dataQuality: any;
    recommendations: string[];
    highConfidenceClaims: number;
    mediumConfidenceClaims: number;
    lowConfidenceClaims: number;
  };
}

export const apiClient = {
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await axios.post<GenerateResponse>(
      `${API_BASE_URL}/api/generate`,
      request,
      {
        timeout: 120000 // 2 minutes timeout
      }
    );
    return response.data;
  },

  async healthCheck(): Promise<{ status: string; message: string }> {
    const response = await axios.get(`${API_BASE_URL}/api/health`);
    return response.data;
  },

  async scrapePreview(url: string): Promise<ScrapePreviewResponse> {
    const response = await axios.post<ScrapePreviewResponse>(
      `${API_BASE_URL}/api/scrape-preview`,
      { url },
      { timeout: 15000 }  // 15 second timeout for scraping
    );
    return response.data;
  }
};
