
import { BrandKB, Persona, Pillar, MonthlyStrategy, CalendarPost, MediaType, CompetitorInsight, GroundingSource, Platform, ContentType, SuggestedSector } from "../types";
import { API_URL, getAuthHeaders } from './apiConfig';

// Helper per chiamare l'API backend di generazione AI
const callAI = async (prompt: string, systemInstruction: string = "", isPro: boolean = false) => {
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
  return { text: data.text, sources: data.sources || [] };
};

// Funzione helper per pulire l'output JSON dell'AI (spesso necessario)
const parseJsonFromAI = (text: string) => {
  try {
    let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Errore parsing JSON AI:", text);
    throw new Error("L'AI ha restituito un formato non valido.");
  }
};

export const refineBrandField = async (field: string, value: string, isPro: boolean = false): Promise<string> => {
  const system = "Agisci come un Brand Strategist Senior e Copywriter esperto.";
  const prompt = `Raffina e ottimizza questo campo del brand: "${field}". Contenuto originale: "${value}". Ritorna ESCLUSIVAMENTE il testo raffinato.`;
  const result = await callAI(prompt, system, isPro);
  return result.text;
};

export const suggestRelevantSectors = async (brand: BrandKB, isPro: boolean = false): Promise<SuggestedSector[]> => {
  const system = "Agisci come un esperto di Business Development.";
  const prompt = `Identifica 5 settori per il brand ${brand.name}. Ritorna un array JSON.`;
  const result = await callAI(prompt, system, isPro);
  return parseJsonFromAI(result.text);
};

export const suggestStrategyObjectives = async (brand: BrandKB, platform: Platform, isPro: boolean = false): Promise<string[]> => {
  const prompt = `Suggerisci 3 obiettivi strategici mensili per ${brand.name} su ${platform}. Ritorna un array JSON di stringhe.`;
  const result = await callAI(prompt, "Strategist", isPro);
  return parseJsonFromAI(result.text);
};

export const generateMonthlyStrategy = async (
  brand: BrandKB, personas: Persona[], pillars: Pillar[], platform: Platform, 
  objective: string, counts: Record<string, number>, month: number, year: number,
  previousStrategy?: MonthlyStrategy, isProMode: boolean = false
): Promise<MonthlyStrategy> => {
  const system = "Agisci come un LinkedIn Content Strategist Senior.";
  const prompt = `Genera la strategia del mese ${month+1}/${year} per ${brand.name}. Obiettivo: ${objective}. Ritorna JSON con "posts" e "nextMonthProjection".`;
  const result = await callAI(prompt, system, isProMode);
  const data = parseJsonFromAI(result.text);
  
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
    platform, month, year, objective, posts,
    postsPerWeek: Math.ceil(posts.length / 4),
    nextMonthProjection: data.nextMonthProjection
  };
};

export const analyzeCompetitors = async (competitorLinks: string[], type: 'linkedin' | 'blog' = 'linkedin', brand: BrandKB, pillars: Pillar[], isPro: boolean = false): Promise<CompetitorInsight> => {
  const prompt = `Analizza questi competitor: ${competitorLinks.join(", ")}. Ritorna JSON.`;
  const result = await callAI(prompt, "Analyst", isPro);
  return parseJsonFromAI(result.text);
};

export const suggestPersonas = async (brand: BrandKB, isPro: boolean = false): Promise<Persona[]> => {
  const prompt = `Definisci 3 target persona strategicamente rilevanti per il brand ${brand.name}. 
  Ritorna un array JSON di oggetti. 
  IMPORTANTE: Ogni oggetto deve usare ESATTAMENTE queste chiavi in inglese: "name", "role", "pains", "goals".
  I contenuti devono essere in italiano.`;
  const result = await callAI(prompt, "Marketing Expert & Strategist", isPro);
  const personas = parseJsonFromAI(result.text);
  return (personas || []).map((p: any) => ({ 
    id: Math.random().toString(36).substring(2, 11),
    name: p.name || p.nome || '',
    role: p.role || p.professione || p.ruolo || '',
    pains: p.pains || p.bisogni || p.sfide || '',
    goals: p.goals || p.valori || p.obiettivi || ''
  }));
};

export const generateSinglePersonaDetails = async (brand: BrandKB, name: string, role: string, isPro: boolean = false): Promise<{pains: string, goals: string}> => {
  const prompt = `Definisci PAINS e GOALS per ${name}. Ritorna JSON.`;
  const result = await callAI(prompt, "Expert", isPro);
  return parseJsonFromAI(result.text);
};

export const suggestPillars = async (brand: BrandKB, isPro: boolean = false): Promise<Pillar[]> => {
  const prompt = `Identifica 4 Content Pillars fondamentali per la comunicazione di ${brand.name}. 
  Ritorna un array JSON di oggetti. 
  IMPORTANTE: Ogni oggetto deve usare ESATTAMENTE queste chiavi in inglese: "title", "description".
  I contenuti devono essere in italiano.`;
  const result = await callAI(prompt, "Brand Architect & Content Strategist", isPro);
  const pillars = parseJsonFromAI(result.text);
  return (pillars || []).map((p: any) => ({ 
    id: Math.random().toString(36).substring(2, 11),
    title: p.title || p.titolo || '',
    description: p.description || p.descrizione || ''
  }));
};

export const generateSinglePillarDetails = async (brand: BrandKB, title: string, isPro: boolean = false): Promise<{description: string}> => {
  const prompt = `Definisci una descrizione per il pillar: ${title}. Ritorna JSON.`;
  const result = await callAI(prompt, "Strategist", isPro);
  return parseJsonFromAI(result.text);
};

export const generatePostContent = async (
  brand: BrandKB, post: CalendarPost, persona?: Persona, pillar?: Pillar, isPro: boolean = false
): Promise<{text: string, sources: GroundingSource[]}> => {
  const prompt = `Genera un post di tipo ${post.contentType} per ${brand.name}. Hook: ${post.hook}. Angolo: ${post.angle}.`;
  const result = await callAI(prompt, "Copywriter", isPro);
  return { text: result.text, sources: result.sources };
};

export const refineCustomPost = async (brand: BrandKB, platform: Platform, objective: string, baseText: string, isPro: boolean = false): Promise<{text: string, sources: GroundingSource[]}> => {
  const prompt = `Ottimizza questo post per ${platform}. Obiettivo: ${objective}. Testo base: ${baseText}.`;
  const result = await callAI(prompt, "Expert Copywriter", isPro);
  return { text: result.text, sources: result.sources };
};

export const analyzeImageAndGeneratePost = async (imageBase64: string, mimeType: string, baseText: string, brand: BrandKB, platform: Platform, isPro: boolean = false): Promise<{text: string, sources: GroundingSource[]}> => {
  const prompt = `Analizza questa immagine (base64) e scrivi un post per ${brand.name} su ${platform}. Note: ${baseText}.`;
  // In una implementazione reale, qui invieresti l'immagine al backend.
  const result = await callAI(prompt, "Visual Copywriter", isPro);
  return { text: result.text, sources: result.sources };
};

export const generateDeepVisualPrompt = async (post: CalendarPost, brand: BrandKB, isPro: boolean = false): Promise<string> => {
  const prompt = `Genera un prompt visivo dettagliato per Midjourney basato su questo post: ${post.hook}.`;
  const result = await callAI(prompt, "Visual Artist", isPro);
  return result.text;
};
