from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Any, Dict, Union
from datetime import datetime

class BrandFile(BaseModel):
    id: str
    name: str
    mimeType: str
    data: Optional[str] = None # base64 (only during upload)
    size: int

class StrategicTip(BaseModel):
    action: Optional[str] = ""
    objective: Optional[str] = ""
    channel: Optional[str] = ""
    expectedImpact: Optional[str] = ""

class CompetitorGap(BaseModel):
    gap: Optional[str] = ""
    opportunity: Optional[str] = ""
    priority: Optional[str] = ""

class CompetitorDetail(BaseModel):
    name: Optional[str] = ""
    url: Optional[str] = ""
    strengths: Optional[List[str]] = []
    weaknesses: Optional[List[str]] = []
    contentStrategy: Optional[str] = ""
    estimatedFollowers: Optional[str] = ""
    postingFrequency: Optional[str] = ""

class CompetitorInsight(BaseModel):
    competitors: Optional[List[CompetitorDetail]] = []
    overallMarketGaps: Optional[List[CompetitorGap]] = []
    practicalStrategicTips: Optional[List[StrategicTip]] = []
    strategicNotes: Optional[List[str]] = []

class BrandKB(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: str
    websiteUrl: Optional[str] = ""
    description: Optional[str] = ""
    mission: Optional[str] = ""
    usp: Optional[str] = ""
    values: Optional[str] = ""
    toneOfVoice: Optional[str] = "Professionale"
    brandPersonality: Optional[str] = ""
    targetSummary: Optional[str] = ""
    visualKeywords: Optional[str] = ""
    linkedinGuidelines: Optional[str] = ""
    linkedinNewsletterGuidelines: Optional[str] = ""
    linkedinArticleGuidelines: Optional[str] = ""
    newsletterGuidelines: Optional[str] = ""
    linkedinPostsPerMonth: int = 12
    newsletterPostsPerMonth: int = 4
    competitors: Optional[List[str]] = []
    competitorPostLinks: Optional[List[str]] = []
    competitorArticleLinks: Optional[List[str]] = []
    competitorPostInsights: Optional[CompetitorInsight] = None
    competitorArticleInsights: Optional[CompetitorInsight] = None
    logoUrl: Optional[str] = None
    faviconUrl: Optional[str] = None
    brandPalette: Optional[List[str]] = []
    files: List[BrandFile] = []

class Persona(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    name: str
    role: Optional[str] = ""
    pains: Optional[str] = ""
    goals: Optional[str] = ""
    primaryPillar: Optional[str] = None
    secondaryPillars: Optional[List[str]] = []
    mappingRationale: Optional[str] = None

    @field_validator('pains', 'goals', 'role', 'name', mode='before')
    @classmethod
    def convert_list_to_str(cls, v):
        if isinstance(v, list):
            return '. '.join(str(item) for item in v)
        return v

class Pillar(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    title: str
    description: Optional[str] = ""

    @field_validator('description', 'title', mode='before')
    @classmethod
    def convert_list_to_str(cls, v):
        if isinstance(v, list):
            return '. '.join(str(item) for item in v)
        return v

class CalendarPost(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    platform: str
    contentType: str
    scheduledDate: str
    pillar: Optional[str] = ""
    persona: Optional[str] = ""
    hook: Optional[str] = ""
    angle: Optional[str] = ""
    status: str = "planned"
    generatedContent: Optional[str] = None

class MonthlyStrategy(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    platform: str
    month: int
    year: int
    objective: str
    posts: List[CalendarPost] = []
    postsPerWeek: Optional[int] = 0
    nextMonthProjection: Optional[str] = None

class BrandProject(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    id: str = Field(alias="_id")
    userId: str
    collaborators: List[str] = []
    brand: BrandKB
    personas: List[Persona] = []
    pillars: List[Pillar] = []
    strategies: List[MonthlyStrategy] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
