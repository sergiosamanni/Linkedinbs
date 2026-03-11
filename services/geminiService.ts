
import { GoogleGenAI, Type } from "@google/genai";
import { BrandKB, Persona, Pillar, MonthlyStrategy, CalendarPost, MediaType, CompetitorInsight, GroundingSource, Platform, ContentType, SuggestedSector } from "../types";

// Helper function to generate unique IDs
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
};

// Generic fetch wrapper with exponential backoff retry logic
const fetchWithRetry = async <T>(fn: () => Promise<T>, retries = 1, delay = 2000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message || "";
    console.error("Gemini Service Error:", error);
    
    const isRateLimit = errorMsg.includes("429") || error?.status === 429 || errorMsg.includes("RESOURCE_EXHAUSTED");
    if (isRateLimit) throw new Error("QUOTA_EXCEEDED");
    if (errorMsg.includes("Requested entity was not found")) throw new Error("API_KEY_NOT_FOUND");
    
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

// Clean JSON output from Gemini to ensure valid parsing
const cleanJson = (text: string): string => {
  if (!text) return "";
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = -1;
  if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
  else if (firstBrace !== -1) start = firstBrace;
  else if (firstBracket !== -1) start = firstBracket;
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);
  if (start !== -1 && end !== -1 && end > start) return cleaned.substring(start, end + 1);
  return cleaned;
};

// Helper to determine model name based on requested tier
const getModel = (isPro: boolean = false) => isPro ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

// Helper to format brand information for inclusion in prompts
const getBrandContext = (brand: BrandKB) => {
  return `
CONTEXT BRAND:
- Nome: ${brand.name}
- Descrizione: ${brand.description}
- Mission: ${brand.mission}
- USP: ${brand.usp}
- Valori: ${brand.values}
- Tono: ${brand.toneOfVoice}
- Personalità: ${brand.brandPersonality}
`;
};

// Suggerisce settori e ruoli rilevanti
export const suggestRelevantSectors = async (brand: BrandKB, isPro: boolean = false): Promise<SuggestedSector[]> => {
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = getBrandContext(brand);
    const prompt = `
RUOLO:
Agisci come un esperto di Business Development e Market Intelligence Senior.

OBIETTIVO:
Identifica 5 settori industriali o mercati verticali che trarrebbero il massimo valore dall'offerta del brand. Per ogni settore, individua i ruoli chiave (Decision Makers) da targettizzare.

CONTESTO BRAND:
${context}

OUTPUT RICHIESTO (FORMATO VINCOLANTE):
Ritorna ESCLUSIVAMENTE un array JSON di oggetti:
[
  {
    "sector": "Nome del Settore",
    "rationale": "Breve spiegazione del perché questo settore è interessato",
    "targetRoles": [
      { "role": "Titolo del Ruolo (es. CTO)", "focus": "Cosa preme a questo ruolo in relazione al brand" }
    ]
  }
]
    `;
    const response = await ai.models.generateContent({
      model: getModel(isPro),
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || "[]"));
  });
};

// Generate a monthly strategy with projections and post skeletons
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
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = getBrandContext(brand);
    const pillarsStr = pillars.map(p => p.title).join(", ");
    const personasStr = personas.map(p => p.name).join(", ");
    
    const prevContext = previousStrategy ? 
      `Mese Precedente (${previousStrategy.month + 1}/${previousStrategy.year}): Obiettivo era "${previousStrategy.objective}". Considera la continuità.` : 
      "Nessun mese precedente trovato. Questo è l'inizio della timeline.";

    const countInstructions = Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => `- ${count} contenuti di tipo ${type.toUpperCase()}`)
      .join("\n");

    const promptText = `
    ${context}
    ${prevContext}
    
    PILASTRI: ${pillarsStr}
    TARGET: ${personasStr}
    OBIETTIVO ATTUALE: ${objective}
    CALENDARIO PER: ${month+1}/${year}
    
    FORMATI RICHIESTI:
    ${countInstructions}
    
    Genera la strategia del mese e una proiezione per il mese successivo.
    IMPORTANTE: Assicurati di assegnare correttamente il "contentType" scelto tra: post, article, linkedin_newsletter, email.
    
    Ritorna JSON: 
    { 
      "posts": [{ "dayOfMonth": number, "contentType": "post" | "article" | "linkedin_newsletter" | "email", "pillar": "string", "persona": "string", "hook": "string", "angle": "string" }],
      "nextMonthProjection": "Breve sintesi strategica di cosa faremo il mese prossimo per capitalizzare su questo obiettivo"
    }
    `;
    
    const response = await ai.models.generateContent({ 
      model: getModel(isProMode), 
      contents: promptText, 
      config: { responseMimeType: "application/json" } 
    });
    
    const data = JSON.parse(cleanJson(response.text || "{}"));
    const posts: CalendarPost[] = (Array.isArray(data.posts) ? data.posts : []).map((p: any) => ({
      id: generateId(),
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
      id: generateId(), 
      platform, 
      month, 
      year, 
      objective, 
      posts, 
      postsPerWeek: Math.ceil(posts.length / 4),
      nextMonthProjection: data.nextMonthProjection 
    };
  });
};

// Analyze competitors using Google Search grounding with 2-stage workflow
export const analyzeCompetitors = async (competitorLinks: string[], type: 'linkedin' | 'blog' = 'linkedin', brand: BrandKB, pillars: Pillar[], isPro: boolean = false): Promise<CompetitorInsight> => {
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const brandContext = getBrandContext(brand);
    const pillarsJson = JSON.stringify(pillars);
    
    // --- STAGE 1: DEFINITION (Analisi Qualitativa Profonda) ---
    const sectionName = type === 'linkedin' ? "LINKEDIN" : "BLOG";
    const prompt1 = `
RUOLO:
Agisci come un Competitive Intelligence Analyst & Senior Content Strategist.
Analizza i competitor dal punto di vista editoriale e di posizionamento.

---

CONTESTO DISPONIBILE:
${brandContext}
Sezione di riferimento: ${sectionName}
Elenco Competitor: ${competitorLinks.join(", ")}

---

OBIETTIVO STRATEGICO:
Capire come si posizionano, cosa comunicano, dove sono deboli e come il brand può superarli valorizzando il proprio know-how.

---

## FASE A — ANALISI QUALITATIVA PROFONDA (DISCURSIVA)
Esegui analisi su posizionamento editoriale, analisi specifica per canale (${sectionName}), identificazione gap e opportunità.

---

## FASE B — STRUTTURAZIONE DATI (JSON MASTER)
Ritorna ESCLUSIVAMENTE un JSON:
{
  "competitors": [
    {
      "name": "Nome Competitor",
      "url": "URL",
      "editorialPositioning": "Sintesi del posizionamento comunicativo",
      "strengths": ["Punto di forza 1", "Punto di forza 2"],
      "weaknesses": ["Debolezza 1", "Debolezza 2"],
      "contentPatterns": "Pattern ricorrenti nei contenuti"
    }
  ],
  "overallMarketGaps": [
    {
      "gap": "Descrizione del gap",
      "whyItMatters": "Perché è un’opportunità reale",
      "brandAdvantage": "Come il brand può sfruttarlo grazie alla Knowledge Base"
    }
  ],
  "practicalStrategicTips": [
    {
      "action": "Azione concreta",
      "objective": "Obiettivo strategico",
      "channel": "${sectionName}",
      "expectedImpact": "Tipo di impatto atteso"
    }
  ]
}
    `;

    const res1 = await ai.models.generateContent({
      model: getModel(isPro),
      contents: prompt1,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    const stage1Data = JSON.parse(cleanJson(res1.text || "{}"));
    const sources: GroundingSource[] = [];
    res1.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
      if (chunk.web) sources.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
    });

    // --- STAGE 2: VALIDATION (Validazione e Potenziamento) ---
    const prompt2 = `
RUOLO:
Agisci come un Head of Strategy & Content Intelligence Lead.
Valida e potenzia l’analisi competitor eseguita.

---

INPUT DISPONIBILI:
Analisi Competitor strutturata: ${JSON.stringify(stage1Data)}
Content Pillars del brand: ${pillarsJson}
${brandContext}

---

OBIETTIVO PRINCIPALE:
Garantire che i GAP individuati siano reali, difendibili e collegabili ai Content Pillars.

---

## OUTPUT FINALE (OBBLIGATORIO)
Ritorna ESCLUSIVAMENTE un JSON:
{
  "competitorAnalysisValidation": [
    {
      "competitor": "Nome Competitor",
      "analysisQuality": "STRONG | ADEQUATE | WEAK",
      "notes": "Breve motivazione"
    }
  ],
  "validatedMarketGaps": [
    {
      "gap": "Descrizione del gap",
      "scores": { "reality": 1-5, "defensibility": 1-5, "targetRelevance": 1-5, "editorialLeverage": 1-5 },
      "averageScore": 0.0,
      "priority": "HIGH | MEDIUM | LOW",
      "linkedContentPillars": [
        { "pillarTitle": "Titolo Pilastro", "whyItFits": "Razionale", "contentAngles": ["Angolo 1"] }
      ]
    }
  ],
  "strategicNotes": ["Osservazione"]
}
    `;

    const res2 = await ai.models.generateContent({
      model: getModel(false),
      contents: prompt2,
      config: { responseMimeType: "application/json" }
    });
    
    const stage2Data = JSON.parse(cleanJson(res2.text || "{}"));

    // Merge logic for CompetitorInsight
    const insight: CompetitorInsight = {
      competitors: stage1Data.competitors.map((c: any) => {
        const val = stage2Data.competitorAnalysisValidation.find((v: any) => v.competitor === c.name);
        return {
          ...c,
          analysisQuality: val?.analysisQuality,
          analysisNotes: val?.notes
        };
      }),
      overallMarketGaps: stage2Data.validatedMarketGaps.map((g: any) => ({
        gap: g.gap,
        whyItMatters: g.whyItMatters || stage1Data.overallMarketGaps.find((orig: any) => orig.gap === g.gap)?.whyItMatters,
        brandAdvantage: g.brandAdvantage || stage1Data.overallMarketGaps.find((orig: any) => orig.gap === g.gap)?.brandAdvantage,
        priority: g.priority,
        scores: g.scores
      })),
      practicalStrategicTips: stage1Data.practicalStrategicTips,
      strategicNotes: stage2Data.strategicNotes,
      sources: sources
    };

    return insight;
  });
};

/**
 * SUGGEST PERSONAS USING A 3-STAGE WORKFLOW (Gen -> Validate -> Map)
 */
export const suggestPersonas = async (brand: BrandKB, isPro: boolean = false): Promise<Persona[]> => {
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = getBrandContext(brand);

    // --- STAGE 1: GENERAZIONE ---
    const prompt1 = `
RUOLO:
Agisci come un esperto di Marketing Psicografico, User Research e Buyer Persona Modeling.
Stai lavorando per una piattaforma professionale di content strategy basata su Knowledge Base strutturata.

---

OBIETTIVO:
Identificare e definire 3 TARGET PERSONA IDEALI per il brand, utilizzando:
- il contesto del brand fornito
- i documenti presenti nella Knowledge Base
- inferenze strategiche realistiche basate sul mercato

Le persona devono essere UTILIZZABILI operativamente per:
- content marketing
- posizionamento
- comunicazione strategica
- scelta di angoli editoriali

---

FONTI DISPONIBILI:
${context}

---

## CRITERI OBBLIGATORI PER OGNI PERSONA
Ogni Target Persona deve:
1. Essere un ARCHETIPO SPECIFICO (non generico)
2. Avere un RUOLO CHIARO E REALISTICO
3. Avere un LEGAME DIRETTO con il valore che il brand offre
4. Essere distinta dalle altre per: bisogni, livello di consapevolezza, priorità decisionali.

---

## PROFONDITÀ RICHIESTA
Per ogni persona, definisci:
- Nome identificativo realistico (non ironico)
- Ruolo professionale o sociale dettagliato
- Contesto decisionale (implicitamente: perché conta per il brand)
- Pains: problemi concreti, frustrazioni operative, rischi percepiti, inefficienze ricorrenti
- Goals: obiettivi funzionali, aspirazioni professionali, risultati desiderati.

---

## OUTPUT (FORMAT VINCOLANTE)
Ritorna ESCLUSIVAMENTE un array JSON con questa struttura:
[
  {
    "name": "Nome Identificativo della Persona",
    "role": "Ruolo o professione specifica",
    "pains": "Descrizione dettagliata, concreta e realistica dei problemi principali",
    "goals": "Descrizione dettagliata, concreta e realistica degli obiettivi e desideri"
  }
]
    `;

    const res1 = await ai.models.generateContent({
      model: getModel(isPro),
      contents: prompt1,
      config: { responseMimeType: "application/json" }
    });
    
    const personasRaw: any[] = JSON.parse(cleanJson(res1.text || "[]"));

    // --- STAGE 2: VALIDAZIONE ---
    const prompt2 = `
RUOLO:
Agisci come Senior Marketing Strategist, User Research Lead e Buyer Persona Reviewer.

---

TASK:
Valuta criticamente i Buyer Persona forniti, verificando che siano: realistici, distinti, coerenti con il brand e utilizzabili operativamente.

---

## CONTESTO BRAND
- Nome Brand: ${brand.name}
- Mission: ${brand.mission}
- USP: ${brand.usp}
- Posizionamento: ${brand.description}

---

## BUYER PERSONA DA VALUTARE
${JSON.stringify(personasRaw)}

---

## OUTPUT RICHIESTO (FORMAT VINCOLANTE)
Restituisci ESCLUSIVAMENTE un array JSON con questa struttura:
[
  {
    "name": "Nome Persona",
    "scores": { "specificity": 0, "realism": 0, "brand_fit": 0, "pains_quality": 0, "goals_quality": 0, "differentiation": 0, "content_usability": 0, "positioning_usability": 0 },
    "average_score": 0,
    "verdict": "APPROVATO | DA MIGLIORARE | DA RIGENERARE",
    "critical_notes": "Breve sintesi dei problemi principali"
  }
]
    `;

    const res2 = await ai.models.generateContent({
      model: getModel(false),
      contents: prompt2,
      config: { responseMimeType: "application/json" }
    });

    // --- STAGE 3: CONTENT PILLARS MAPPING ---
    const prompt3 = `
RUOLO:
Agisci come Content Strategist Senior e Editorial Planner.

---

TASK:
Collega ciascun Buyer Persona ai Content Pillars più efficaci per intercettare i suoi pains, supportare i suoi goals e rafforzare il posizionamento.

---

## CONTESTO BRAND
- Nome Brand: ${brand.name}
- Mission: ${brand.mission}
- USP: ${brand.usp}

---

## CONTENT PILLARS DISPONIBILI
I pilastri editoriali disponibili sono ESCLUSIVAMENTE:
1. Expertise & Value
2. Authority Building
3. Autenticità & Storie Reali
4. Growth & Aspirazione
5. Industry Insights
6. Brand & Valori
7. Community & Engagement

---

## BUYER PERSONA
${JSON.stringify(personasRaw)}

---

## OUTPUT RICHIESTO (FORMAT VINCOLANTE)
Restituisci ESCLUSIVAMENTE un array JSON con questa struttura:
[
  {
    "persona_name": "Nome Persona",
    "primary_pillar": "Nome Pilastro Principale",
    "secondary_pillars": ["Pilastro Secondario 1", "Pilastro Secondario 2"],
    "rationale": "Spiegazione sintetica del perché questi pilastri sono ideali"
  }
]
    `;

    const res3 = await ai.models.generateContent({
      model: getModel(isPro),
      contents: prompt3,
      config: { responseMimeType: "application/json" }
    });

    const mappingRaw: any[] = JSON.parse(cleanJson(res3.text || "[]"));

    // Final merge
    return personasRaw.map(p => {
      const mapping = mappingRaw.find(m => m.persona_name === p.name);
      return {
        id: generateId(),
        ...p,
        primaryPillar: mapping?.primary_pillar,
        secondaryPillars: mapping?.secondary_pillars,
        mappingRationale: mapping?.rationale
      };
    });
  });
};

/**
 * GENERA DETTAGLI PER UNA SINGOLA PERSONA AGGIUNTA MANUALMENTE
 */
export const generateSinglePersonaDetails = async (brand: BrandKB, name: string, role: string, isPro: boolean = false): Promise<{pains: string, goals: string}> => {
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = getBrandContext(brand);
    const prompt = `
RUOLO:
Agisci come un esperto di Marketing Psicografico e User Research.

OBIETTIVO:
Definisci PAINS e GOALS realistici e concreti per questa Target Persona nel contesto del brand fornito.

DATI PERSONA:
- Nome: ${name}
- Ruolo: ${role}

CONTESTO BRAND:
${context}

OUTPUT RICHIESTO:
Ritorna ESCLUSIVAMENTE un JSON:
{
  "pains": "Descrizione dettagliata dei problemi, frustrazioni e rischi percepiti (almeno 3-4 frasi)",
  "goals": "Descrizione dettagliata degli obiettivi, aspirazioni e desideri (almeno 3-4 frasi)"
}
    `;
    const response = await ai.models.generateContent({
      model: getModel(isPro),
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || "{}"));
  });
};

/**
 * SUGGEST PILLARS USING A 2-STAGE WORKFLOW (Define -> Validate)
 */
export const suggestPillars = async (brand: BrandKB, isPro: boolean = false): Promise<Pillar[]> => {
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = getBrandContext(brand);

    // --- STAGE 1: DEFINITION ---
    const prompt1 = `
RUOLO:
Agisci come un Content Strategist Senior e Brand Architect.
Stai lavorando per una piattaforma professionale di content generation basata on Knowledge Base strutturata.

---

OBIETTIVO:
Identificare e definire 4 CONTENT PILLARS (Pilastri Editoriali) strategici per il brand.

---

FONTI DISPONIBILI:
${context}

---

## CRITERI STRATEGICI OBBLIGATORI
Ogni Content Pillar deve:
1. Avere uno SCOPO CHIARO nel funnel (Awareness, Authority, Trust, Conversion)
2. Rappresentare un’AREA TEMATICA DISTINTA
3. Riflettere un punto di vista del brand
4. Essere traducibile facilmente in post, articoli, newsletter.

---

## OUTPUT (FORMAT VINCOLANTE)
Ritorna ESCLUSIVAMENTE un array JSON con questa struttura:
[
  {
    "title": "Titolo del Pilastro",
    "description": "Descrizione strategica del pilastro, del suo ruolo nel funnel e dei temi che deve coprire."
  }
]
    `;

    const res1 = await ai.models.generateContent({
      model: getModel(isPro),
      contents: prompt1,
      config: { responseMimeType: "application/json" }
    });

    const pillarsRaw: any[] = JSON.parse(cleanJson(res1.text || "[]"));

    // --- STAGE 2: VALIDAZIONE ---
    const prompt2 = `
RUOLO:
Agisci come un Head of Content Strategy & Brand Governance.
Valuta la solidità strategica dei Content Pillars forniti.

---

INPUT DISPONIBILI:
${context}

---

## CONTENT PILLARS DA VALUTARE
${JSON.stringify(pillarsRaw)}

---

## OUTPUT (FORMAT VINCOLANTE)
Ritorna ESCLUSIVAMENTE un JSON con questa struttura:
{
  "overall_evaluation": { "status": "approved | revision_needed | rejected", "summary": "Valutazione sintetica" },
  "pillar_analysis": [ { "title": "Titolo", "coherence_score": 1-5, "differentiation_score": 1-5, "scalability_score": 1-5, "clarity_score": 1-5, "critical_issues": "...", "improvement_direction": "..." } ],
  "system_recommendation": { "action": "proceed | partial_revision | full_regeneration", "rationale": "..." }
}
    `;

    const res2 = await ai.models.generateContent({
      model: getModel(false),
      contents: prompt2,
      config: { responseMimeType: "application/json" }
    });

    // We proceed with the generated pillars for the UI
    return pillarsRaw.map(p => ({
      id: generateId(),
      ...p
    }));
  });
};

/**
 * GENERA DETTAGLI PER UN SINGOLO PILLAR AGGIUNTU MANUALMENTE
 */
export const generateSinglePillarDetails = async (brand: BrandKB, title: string, isPro: boolean = false): Promise<{description: string}> => {
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = getBrandContext(brand);
    const prompt = `
RUOLO:
Agisci come un Brand Architect e Content Strategist Senior.

OBIETTIVO:
Definisci una descrizione strategica per il Content Pillar indicato, contestualizzandola all'identità del brand.

DATI PILASTRO:
- Titolo: ${title}

CONTESTO BRAND:
${context}

OUTPUT RICHIESTO:
Ritorna ESCLUSIVAMENTE un JSON:
{
  "description": "Descrizione strategica che spieghi lo scopo del pilastro, il ruolo nel funnel e i temi da trattare (almeno 4-5 frasi)."
}
    `;
    const response = await ai.models.generateContent({
      model: getModel(isPro),
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || "{}"));
  });
};

/**
 * GENERAZIONE CONTENUTI A 3 STADI (Generate -> Evaluate -> Regenerate)
 */
export const generatePostContent = async (
  brand: BrandKB, 
  post: CalendarPost, 
  persona?: Persona, 
  pillar?: Pillar, 
  isPro: boolean = false
): Promise<{text: string, sources: GroundingSource[]}> => {
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Determinazione linee guida specifiche
    let guidelines = brand.linkedinGuidelines;
    if (post.contentType === 'article') guidelines = brand.linkedinArticleGuidelines;
    if (post.contentType === 'linkedin_newsletter') guidelines = brand.linkedinNewsletterGuidelines;
    if (post.platform === 'newsletter') guidelines = brand.newsletterGuidelines;

    // --- STAGE 1: GENERATION ---
    const prompt1 = `
RUOLO:
Agisci come un Content Strategist Senior e Copywriter Esperto del settore del brand.
Stai lavorando all’interno di una piattaforma professionale di content generation.
Il tuo output deve essere immediatamente pubblicabile e privo di ambiguità.

---

TASK PRINCIPALE:
Genera un contenuto di tipo: ${post.contentType.toUpperCase()}
Lingua: ITALIANO
Livello di scrittura: PROFESSIONALE / SENIOR
Contesto: ${brand.description.toLowerCase().includes('b2b') ? 'B2B' : 'B2C'} secondo il brand

---

## CONTESTO BRAND (VINCOLANTE)
- Nome Brand: ${brand.name}
- Descrizione Brand: ${brand.description}
- Mission: ${brand.mission}
- USP: ${brand.usp}
- Tone of Voice & Brand Personality: ${brand.toneOfVoice}

---

## CONTESTO STRATEGICO
TARGET PERSONA:
- Profilo: ${post.persona}
- Pain principali: ${persona?.pains || 'Non specificato'}
- Obiettivi: ${persona?.goals || 'Non specificato'}

PILASTRO EDITORIALE:
- Titolo: ${post.pillar}
- Scopo: ${pillar?.description || 'Non specificato'}

HOOK PRINCIPALE (GANCIO):
${post.hook}

ANGOLO STRATEGICO (PROSPETTIVA):
${post.angle || 'Diretto e informativo'}

---

## OBIETTIVO DEL CONTENUTO (VINCOLO STRATEGICO)
Il contenuto deve:
- rispondere ad almeno UN pain concreto del target
- posizionare il brand come competente e affidabile
- accompagnare l’utente verso una riflessione o micro-azione coerente con la mission

---

## LINEE GUIDA SPECIFICHE (MASTER RULES)
${guidelines}

---

## REGOLE DI FORMATTAZIONE (OBBLIGATORIE)
- Se il contenuto è per LinkedIn:
  - NON usare Markdown
  - NON usare #, *, titoli markdown
  - Usa SOLO UNICODE BOLD per enfasi (𝗲𝘀𝗲𝗺𝗽𝗶𝗼)

- Usa Google Search Grounding SOLO per: dati, statistiche, trend, eventi reali verificabili.

OUTPUT:
Fornisci ESCLUSIVAMENTE il contenuto finale.
    `;

    const res1 = await ai.models.generateContent({
      model: getModel(isPro),
      contents: prompt1,
      config: { tools: [{ googleSearch: {} }] }
    });

    const text1 = res1.text || "";
    const sources1: GroundingSource[] = [];
    res1.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
      if (chunk.web) sources1.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
    });

    // --- STAGE 2: EVALUATION ---
    const prompt2 = `
RUOLO:
Agisci come Content Reviewer Senior e Quality Assurance Editor.

---

TASK:
Valuta il contenuto fornito sulla base del contesto strategico e brand.

---

## INPUT DI CONTESTO
Brand: ${brand.name}
Target Persona: ${post.persona}
Tipo di contenuto: ${post.contentType}

---

## CONTENUTO DA VALUTARE
${text1}

---

## CRITERI DI VALUTAZIONE
Valuta da 1 a 10: Coerenza brand, utilità target, aderenza pilastro, efficacia hook, valore informativo, naturalezza, tone of voice, assenza filler, prontezza pubblicazione, impatto.

---

## OUTPUT RICHIESTO
Restituisci:
- Punteggio medio finale (1–10)
- Giudizio sintetico: APPROVATO, DA MIGLIORARE o DA RIGENERARE
- Criticità (massimo 5 bullet point)
    `;

    const res2 = await ai.models.generateContent({
      model: getModel(false), // Flash is sufficient for evaluation
      contents: prompt2
    });

    const evalText = res2.text || "";
    const isApproved = evalText.toUpperCase().includes("APPROVATO") && !evalText.toUpperCase().includes("DA MIGLIORARE") && !evalText.toUpperCase().includes("DA RIGENERARE");

    if (isApproved) {
      return { text: text1, sources: sources1 };
    }

    // --- STAGE 3: REGENERATION ---
    const prompt3 = `
RUOLO:
Agisci come Senior Content Editor e Content Strategist.
Migliora in modo mirato e strategico il contenuto basandoti sul feedback.

---

## CONTESTO BRAND
- Nome: ${brand.name}
- Tone of Voice: ${brand.toneOfVoice}

## CONTESTO STRATEGICO
- Target: ${post.persona}
- Tipo: ${post.contentType}

---

## CONTENUTO ORIGINALE
${text1}

---

## FEEDBACK DI VALUTAZIONE
${evalText}

---

## VINCOLI DI INTERVENTO
- NON riscrivere da zero
- Correggi esclusivamente le criticità segnalate
- Mantieni lo stile del brand
- Se LinkedIn: NO Markdown, USA UNICODE BOLD.

OUTPUT:
Fornisci SOLO la versione migliorata. Nessun commento.
    `;

    const res3 = await ai.models.generateContent({
      model: getModel(isPro),
      contents: prompt3,
      config: { tools: [{ googleSearch: {} }] }
    });

    const textFinal = res3.text || text1;
    const sourcesFinal: GroundingSource[] = [];
    res3.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
      if (chunk.web) sourcesFinal.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
    });

    return { text: textFinal, sources: sourcesFinal.length > 0 ? sourcesFinal : sources1 };
  });
};

// Suggest strategic objectives for content planning
export const suggestStrategyObjectives = async (brand: BrandKB, platform: Platform, isPro: boolean = false): Promise<string[]> => {
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: getModel(isPro),
      contents: `Suggerisci 5 obiettivi strategici brevi per ${platform} per il brand ${brand.name} in ITALIANO. Ritorna un array JSON di stringhe.`,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(cleanJson(response.text || "[]"));
    return Array.isArray(data) ? data : ["Awareness", "Conversion", "Thought Leadership"];
  });
};

// Refine specific brand knowledge fields via AI
export const refineBrandField = async (fieldName: string, currentValue: string, isPro: boolean = false): Promise<string> => {
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: getModel(isPro),
      contents: `Migliora questo campo "${fieldName}" in ITALIANO professionale: "${currentValue}"`
    });
    return response.text?.trim() || currentValue;
  });
};

// Optimize custom post drafts based on strategic objectives
export const refineCustomPost = async (brand: BrandKB, platform: Platform, objective: string, baseText: string, isPro: boolean = false): Promise<{text: string, sources: GroundingSource[]}> => {
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: getModel(isPro),
      contents: `Ottimizza questo post per ${platform} in ITALIANO. OBIETTIVO: ${objective}. TESTO: ${baseText}. Se LinkedIn: NO Markdown, usa Unicode Bold.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    const sources: GroundingSource[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
      if (chunk.web) sources.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
    });
    return { text: response.text || "", sources };
  });
};

// Multimodal analysis: generate content based on image and text ideas
export const analyzeImageAndGeneratePost = async (imageBase64: string, mimeType: string, baseText: string, brand: BrandKB, platform: Platform, isPro: boolean = false): Promise<{text: string, sources: GroundingSource[]}> => {
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: getModel(isPro),
      contents: { 
        parts: [
          { inlineData: { data: imageBase64, mimeType } }, 
          { text: `Analizza immagine e scrivi post per ${platform}. Idea: ${baseText}. Se LinkedIn: NO Markdown, usa Unicode Bold.` }
        ] 
      },
      config: { tools: [{ googleSearch: {} }] }
    });
    const sources: GroundingSource[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
      if (chunk.web) sources.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
    });
    return { text: response.text || "", sources };
  });
};

// Generate a detailed visual prompt for graphics creation
export const generateDeepVisualPrompt = async (post: CalendarPost, brand: BrandKB, isPro: boolean = false): Promise<string> => {
  return fetchWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: getModel(isPro),
      contents: `Genera una DESCRIZIONE VISIVA professionale e dettagliata in ITALIANO per una grafica o immagine che accompagni questo post. 
      L'immagine deve riflettere il contenuto del post e l'identità del brand.
      
      POST HOOK: ${post.hook}
      POST ANGLE: ${post.angle}
      TESTO COMPLETO (se presente): ${post.fullContent || 'Non ancora generato'}
      VISUAL STYLE BRAND: ${brand.visualKeywords}
      BRAND PERSONALITY: ${brand.brandPersonality}
      
      Regole mandatorie per la descrizione:
      1. Inizia con un RIASSUNTO DETTAGLIATO del contenuto del post per fornire contesto alla creazione.
      2. Privilegia lo stile INFOGRAFICA (chiara, professionale, ben organizzata) o IMMAGINE REALISTICA (look fotografico naturale, illuminazione morbida, profondità di campo autentica).
      3. IMPORTANTE: Evita il look "generato da AI" (niente colori ipersaturi innaturali, niente volti perfetti in modo sospetto, niente stili digital art generici). L'obiettivo è un look che sembri creato da un fotografo professionista o da un graphic designer umano.
      4. Descrivi composizione, palette colori (coerente con il brand), elementi visivi chiave e atmosfera desiderata.
      5. Ritorna solo il testo della descrizione in italiano.`
    });
    return response.text || "";
  });
};
