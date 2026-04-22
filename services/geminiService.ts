
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
  const system = "Agisci come un esperto di Business Development e Marketing Strategico.";
  const brandContext = `Brand: ${brand.name}. Descrizione: ${brand.description || 'N/A'}. Mission: ${brand.mission || 'N/A'}. USP: ${brand.usp || 'N/A'}. Target: ${brand.targetSummary || 'N/A'}. Valori: ${brand.values || 'N/A'}.`;
  const prompt = `Analizza il seguente brand e identifica 5 settori o mercati strategici in cui potrebbe espandersi o rafforzarsi:

${brandContext}

Ritorna un array JSON di oggetti.
Ogni oggetto deve usare ESATTAMENTE queste chiavi in inglese: "sector" (stringa), "rationale" (stringa), "targetRoles" (array di oggetti con chiavi "role" e "focus").
I contenuti devono essere in italiano.
Esempio formato:
[{"sector": "Fintech", "rationale": "Perché...", "targetRoles": [{"role": "CEO", "focus": "Innovazione"}]}]`;
  const result = await callAI(prompt, system, isPro);
  const data = parseJsonFromAI(result.text);
  
  // Estrazione flessibile: cerca l'array ovunque nell'oggetto
  let sectors: any[];
  if (Array.isArray(data)) {
    sectors = data;
  } else {
    // Cerca la prima proprietà che è un array
    const arrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
    sectors = arrayKey ? data[arrayKey] : [];
  }
  
  return sectors.map((s: any) => ({
    sector: toStr(s.sector || s.settore || s.name || s.nome),
    rationale: toStr(s.rationale || s.motivo || s.motivazione || s.description || s.descrizione),
    targetRoles: (() => {
      // Cerca l'array dei ruoli in qualsiasi chiave
      const roles = s.targetRoles || s.target_roles || s.ruoli_target || s.roles || s.ruoli || [];
      if (!Array.isArray(roles)) return [];
      return roles.map((r: any) => ({
        role: toStr(r.role || r.ruolo || r.professione || r.name || r.nome),
        focus: toStr(r.focus || r.obiettivo || r.description || r.descrizione)
      }));
    })()
  }));
};

export const suggestStrategyObjectives = async (brand: BrandKB, platform: Platform, isPro: boolean = false): Promise<string[]> => {
  const prompt = `Suggerisci 3 obiettivi strategici mensili per ${brand.name} su ${platform}. 
  Ritorna ESATTAMENTE un array JSON di stringhe, senza nient'altro. Ad esempio: ["Obiettivo 1", "Obiettivo 2"]`;
  const result = await callAI(prompt, "Strategist", isPro);
  const data = parseJsonFromAI(result.text);
  return Array.isArray(data) ? data : (data.objectives || data.items || data.obiettivi || []);
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

// Helper: converte array in stringa se necessario (l'AI a volte ritorna array)
const toStr = (v: any): string => {
  if (Array.isArray(v)) return v.join('. ');
  if (typeof v === 'string') return v;
  return '';
};

// Helper universale: estrae il primo array da un oggetto JSON
const extractArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const arrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
    if (arrayKey) return data[arrayKey];
  }
  console.error('extractArray: nessun array trovato in', JSON.stringify(data).substring(0, 200));
  return [];
};

export const suggestPersonas = async (brand: BrandKB, isPro: boolean = false): Promise<Persona[]> => {
  const prompt = `Definisci 3 target persona strategicamente rilevanti per il brand ${brand.name}. 
  Ritorna un array JSON di oggetti. 
  Ogni oggetto deve usare ESATTAMENTE queste chiavi in inglese: "name" (stringa), "role" (stringa), "pains" (stringa unica, non array), "goals" (stringa unica, non array).
  I contenuti devono essere in italiano.`;
  const result = await callAI(prompt, "Marketing Expert & Strategist", isPro);
  const data = parseJsonFromAI(result.text);
  const personas = extractArray(data);
  
  if (personas.length === 0) {
    console.error('suggestPersonas: array vuoto. Risposta AI:', result.text.substring(0, 300));
  }
  
  return personas.map((p: any) => ({ 
    id: Math.random().toString(36).substring(2, 11),
    name: toStr(p.name || p.nome),
    role: toStr(p.role || p.professione || p.ruolo),
    pains: toStr(p.pains || p.bisogni || p.sfide),
    goals: toStr(p.goals || p.valori || p.obiettivi)
  }));
};

export const generateSinglePersonaDetails = async (brand: BrandKB, name: string, role: string, isPro: boolean = false): Promise<{pains: string, goals: string}> => {
  const prompt = `Definisci PAINS e GOALS per la persona "${name}" (ruolo: ${role}) nel contesto del brand. 
  Ritorna un JSON con chiavi "pains" (stringa unica) e "goals" (stringa unica). NON usare array.`;
  const result = await callAI(prompt, "Expert", isPro);
  const data = parseJsonFromAI(result.text);
  return { pains: toStr(data.pains), goals: toStr(data.goals) };
};

export const suggestPillars = async (brand: BrandKB, isPro: boolean = false): Promise<Pillar[]> => {
  const prompt = `Identifica 4 Content Pillars fondamentali per la comunicazione di ${brand.name}. 
  Ritorna un array JSON di oggetti. 
  Ogni oggetto deve usare ESATTAMENTE queste chiavi in inglese: "title", "description".
  I contenuti devono essere in italiano.`;
  const result = await callAI(prompt, "Brand Architect & Content Strategist", isPro);
  const data = parseJsonFromAI(result.text);
  
  const pillars = extractArray(data);
  
  if (pillars.length === 0) {
    console.error('suggestPillars: array vuoto. Risposta AI:', result.text.substring(0, 300));
  }
  
  return pillars.map((p: any) => ({ 
    id: Math.random().toString(36).substring(2, 11),
    title: p.title || p.titolo || '',
    description: toStr(p.description || p.descrizione)
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
