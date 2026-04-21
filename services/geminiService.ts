
import { BrandKB, Persona, Pillar, MonthlyStrategy, CalendarPost, MediaType, CompetitorInsight, GroundingSource, Platform, ContentType, SuggestedSector } from "../types";
import { API_URL, getAuthHeaders } from './apiConfig';

// Helper per chiamare l'API backend di generazione AI
const callAI = async (prompt: str, systemInstruction: string = "", isPro: boolean = false) => {
  const response = await fetch(`${API_URL}/api/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      prompt,
      system_instruction: systemInstruction,
      is_pro: isPro
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Errore durante la generazione AI");
  }

  const data = await response.json();
  return data.text;
};

// Funzione helper per pulire l'output JSON dell'AI (spesso necessario)
const parseJsonFromAI = (text: string) => {
  try {
    // Rimuove markdown code blocks se presenti
    let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Errore parsing JSON AI:", text);
    throw new Error("L'AI ha restituito un formato non valido.");
  }
};

export const suggestRelevantSectors = async (brand: BrandKB, isPro: boolean = false): Promise<SuggestedSector[]> => {
  const system = "Agisci come un esperto di Business Development e Market Intelligence Senior.";
  const prompt = `Identifica 5 settori industriali o mercati verticali per il brand ${brand.name}. Ritorna un array JSON di oggetti con "sector", "rationale" e "targetRoles" (array di {role, focus}).`;
  
  const text = await callAI(prompt, system, isPro);
  return parseJsonFromAI(text);
};

export const generateMonthlyStrategy = async (
  brand: BrandKB, 
  personas: Persona[], 
  pillars: Pillar[], 
  platform: Platform, 
  objective: string, 
  counts: Record<string, number>, 
  month: number, 
  year: number,
  previousStrategy?: MonthlyStrategy,
  isProMode: boolean = false
): Promise<MonthlyStrategy> => {
  const system = "Agisci come un LinkedIn Content Strategist Senior.";
  const prompt = `Genera la strategia del mese ${month+1}/${year} per il brand ${brand.name}. Obiettivo: ${objective}. Ritorna JSON con "posts" (array) e "nextMonthProjection".`;

  const text = await callAI(prompt, system, isProMode);
  const data = parseJsonFromAI(text);
  
  // Mappatura sui tipi del frontend
  const posts: CalendarPost[] = (data.posts || []).map((p: any) => ({
    id: Math.random().toString(36).substring(2, 11),
    platform,
    contentType: p.contentType || (platform === 'linkedin' ? 'post' : 'email'),
    scheduledDate: new Date(year, month, p.dayOfMonth || 1).toISOString(),
    pillar: p.pillar || 'Generale',
    persona: p.persona || 'Audience',
    hook: p.hook || '',
    angle: p.angle || '',
    status: 'planned'
  }));

  return {
    id: Math.random().toString(36).substring(2, 11),
    platform,
    month,
    year,
    objective,
    posts,
    postsPerWeek: Math.ceil(posts.length / 4),
    nextMonthProjection: data.nextMonthProjection
  };
};

export const analyzeCompetitors = async (competitorLinks: string[], type: 'linkedin' | 'blog' = 'linkedin', brand: BrandKB, pillars: Pillar[], isPro: boolean = false): Promise<CompetitorInsight> => {
  const system = "Agisci come un Competitive Intelligence Analyst.";
  const prompt = `Analizza questi competitor: ${competitorLinks.join(", ")}. Ritorna JSON con "competitors", "overallMarketGaps" e "practicalStrategicTips".`;
  
  const text = await callAI(prompt, system, isPro);
  return parseJsonFromAI(text);
};

export const suggestPersonas = async (brand: BrandKB, isPro: boolean = false): Promise<Persona[]> => {
  const system = "Agisci come un esperto di Marketing Psicografico.";
  const prompt = `Definisci 3 target persona ideali per il brand ${brand.name}. Ritorna un array JSON con "name", "role", "pains", "goals".`;
  
  const text = await callAI(prompt, system, isPro);
  const personas = parseJsonFromAI(text);
  return personas.map((p: any) => ({ ...p, id: Math.random().toString(36).substring(2, 11) }));
};

export const generateSinglePersonaDetails = async (brand: BrandKB, name: string, role: string, isPro: boolean = false): Promise<{pains: string, goals: string}> => {
  const prompt = `Definisci PAINS e GOALS per la persona ${name} (ruolo: ${role}). Ritorna JSON con "pains" e "goals".`;
  const text = await callAI(prompt, "Marketing Expert", isPro);
  return parseJsonFromAI(text);
};

export const suggestPillars = async (brand: BrandKB, isPro: boolean = false): Promise<Pillar[]> => {
  const prompt = `Identifica 4 Content Pillars strategici per il brand ${brand.name}. Ritorna un array JSON con "title" e "description".`;
  const text = await callAI(prompt, "Brand Architect", isPro);
  const pillars = parseJsonFromAI(text);
  return pillars.map((p: any) => ({ ...p, id: Math.random().toString(36).substring(2, 11) }));
};

export const generateSinglePillarDetails = async (brand: BrandKB, title: string, isPro: boolean = false): Promise<{description: string}> => {
  const prompt = `Definisci una descrizione strategica per il Content Pillar: ${title}. Ritorna JSON con "description".`;
  const text = await callAI(prompt, "Content Strategist", isPro);
  return parseJsonFromAI(text);
};

export const generatePostContent = async (
  brand: BrandKB, 
  post: CalendarPost, 
  persona?: Persona, 
  pillar?: Pillar, 
  isPro: boolean = false
): Promise<{text: string, sources: GroundingSource[]}> => {
  const prompt = `Genera un contenuto di tipo ${post.contentType} per il brand ${brand.name}. Hook: ${post.hook}. Angolo: ${post.angle}.`;
  
  // Nota: Il backend ora gestisce la logica di fallback e le API key
  const text = await callAI(prompt, "Copywriter Senior", isPro);
  
  return {
    text,
    sources: [] // Il backend potrebbe restituire anche i chunk di grounding se configurato
  };
};
