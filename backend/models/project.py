from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class BrandKB(BaseModel):
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
    competitorPostLinks: List[str] = []
    competitorArticleLinks: List[str] = []
    logoUrl: Optional[str] = None
    faviconUrl: Optional[str] = None

class Persona(BaseModel):
    id: str
    name: str
    role: str
    pains: str
    goals: str

class Pillar(BaseModel):
    id: str
    title: str
    description: str

class CalendarPost(BaseModel):
    id: str
    platform: str
    contentType: str
    scheduledDate: str
    pillar: str
    persona: str
    hook: str
    angle: str
    status: str = "planned"
    generatedContent: Optional[str] = None

class MonthlyStrategy(BaseModel):
    id: str
    platform: str
    month: int
    year: int
    objective: str
    posts: List[CalendarPost]
    postsPerWeek: int
    nextMonthProjection: Optional[str] = None

class BrandProject(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str = Field(alias="_id")
    userId: str
    collaborators: List[str] = []
    brand: BrandKB
    personas: List[Persona] = []
    pillars: List[Pillar] = []
    strategies: List[MonthlyStrategy] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
