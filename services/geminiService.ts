
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
    // Prova a trovare l'inizio e la fine di un array [ ] o oggetto { }
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    const objectMatch = text.match(/\{[\s\S]*\}/);
    
    let jsonToParse = text;
    if (arrayMatch) jsonToParse = arrayMatch[0];
    else if (objectMatch) jsonToParse = objectMatch[0];

    let cleaned = jsonToParse.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Errore parsing JSON AI. Testo originale:", text);
    throw new Error("L'AI ha risposto con un formato non leggibile. Riprova tra un istante.");
  }
};

export const refineBrandField = async (field: string, value: string, isPro: boolean = false): Promise<string> => {
  const system = "Agisci come un Brand Strategist Senior e Copywriter esperto.";
  const prompt = `Raffina e ottimizza questo campo del brand: "${field}". Contenuto originale: "${value}". Ritorna ESCLUSIVAMENTE il testo raffinato.`;
  const result = await callAI(prompt, system, isPro);
  return result.text;
};

// Helper: costruisce un contesto testuale ricco per l'AI
const buildBrandContext = (brand: BrandKB): string => {
  let ctx = `Brand Name: ${brand.name}\n`;
  if (brand.websiteUrl) ctx += `Website: ${brand.websiteUrl}\n`;
  if (brand.description) ctx += `Description/Vision: ${brand.description}\n`;
  if (brand.mission) ctx += `Mission: ${brand.mission}\n`;
  if (brand.usp) ctx += `Unique Selling Proposition (USP): ${brand.usp}\n`;
  if (brand.values) ctx += `Brand Values: ${brand.values}\n`;
  if (brand.toneOfVoice) ctx += `Tone of Voice: ${brand.toneOfVoice}\n`;
  if (brand.brandPersonality) ctx += `Brand Personality: ${brand.brandPersonality}\n`;
  if (brand.targetSummary) ctx += `Target Audience Summary: ${brand.targetSummary}\n`;
  if (brand.visualKeywords) ctx += `Visual Style Keywords: ${brand.visualKeywords}\n`;
  
  if (brand.competitorPostInsights && brand.competitorPostInsights.overallMarketGaps?.length > 0) {
    ctx += `\nCompetitor Market Gaps (LinkedIn):\n`;
    brand.competitorPostInsights.overallMarketGaps.forEach(g => {
      ctx += `- Gap: ${g.gap} (Advantage: ${g.brandAdvantage})\n`;
    });
  }
  if (brand.competitorArticleInsights && brand.competitorArticleInsights.overallMarketGaps?.length > 0) {
    ctx += `\nCompetitor Market Gaps (Blog):\n`;
    brand.competitorArticleInsights.overallMarketGaps.forEach(g => {
      ctx += `- Gap: ${g.gap} (Advantage: ${g.brandAdvantage})\n`;
    });
  }
  
  if (brand.files && brand.files.length > 0) {
    ctx += `\nUploaded Brand Files (Context hints):\n`;
    brand.files.forEach(f => ctx += `- ${f.name}\n`);
  }

  return ctx;
};

export const suggestRelevantSectors = async (brand: BrandKB, isPro: boolean = false): Promise<SuggestedSector[]> => {
  const system = "Agisci come un esperto di Business Development e Marketing Strategico.";
  const brandContext = buildBrandContext(brand);
  const prompt = `Analizza attentamente tutti i dettagli del seguente brand (inclusi i gap dei competitor se disponibili) e identifica 5 settori o mercati strategici in cui potrebbe espandersi o rafforzarsi in modo iper-personalizzato:\n\n${brandContext}\n
Ritorna un array JSON di oggetti.
Ogni oggetto deve usare ESATTAMENTE queste chiavi in inglese: "sector" (stringa), "rationale" (stringa), "targetRoles" (array di oggetti con chiavi "role" e "focus").
I contenuti devono essere in italiano.
Esempio formato:
[{"sector": "Fintech", "rationale": "Perché il brand, grazie al suo USP, può rivoluzionare i pagamenti digitali colmando il gap X.", "targetRoles": [{"role": "CEO", "focus": "Innovazione"}]}]`;
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
  const brandContext = buildBrandContext(brand);
  const prompt = `Analizza il posizionamento e le carenze di mercato del seguente brand:\n\n${brandContext}\n\nSuggerisci 3 obiettivi strategici iper-specifici per una campagna su ${platform}. 
  Ritorna ESATTAMENTE un array JSON di stringhe (es: ["Lancio nuovo USP...", "Posizionamento per Direttori..."]). Non includere oggetti aggiuntivi.`;
  const result = await callAI(prompt, "Strategic Marketing Planner", isPro);
  const data = parseJsonFromAI(result.text);
  return extractArray(data);
};

export const generateMonthlyStrategy = async (
  brand: BrandKB, personas: Persona[], pillars: Pillar[], platform: Platform, 
  objective: string, counts: Record<string, number>, month: number, year: number,
  previousStrategy?: MonthlyStrategy, isProMode: boolean = false
): Promise<MonthlyStrategy> => {
  const system = "Agisci come un Direttore Editoriale e LinkedIn Strategist Senior.";
  const brandContext = buildBrandContext(brand);
  const personasCtx = personas.map(p => `- ${p.role}: ${p.pains}`).join('\n');
  const pillarsCtx = pillars.map(p => `- ${p.title}`).join('\n');
  const volumesCtx = Object.entries(counts).filter(([_, v]) => v > 0).map(([k, v]) => `${v} x ${k}`).join(', ');

  let historyCtx = "";
  if (previousStrategy) {
    historyCtx = `CONTESTO MESE PRECEDENTE:
Obiettivo: ${previousStrategy.objective}
Proiezione: ${previousStrategy.nextMonthProjection || "N/A"}
Numero Post: ${previousStrategy.posts.length}
Cerca di creare continuità narrativa con il mese precedente, evitando ripetizioni ma mantenendo il focus strategico evolutivo.`;
  }

  const prompt = `Crea un piano editoriale chirurgico per ${month+1}/${year}. PIATTAFORMA: ${platform}.
OBIETTIVO MENSILE: ${objective}.

VOLUMI RICHIESTI (Devi generare esattamente il numero di post indicato!):
${volumesCtx}

${historyCtx}

CONTESTO BRAND E COMPETITOR:
${brandContext}

TARGET PERSONAS DA COLPIRARE:
${personasCtx}

PILASTRI EDITORIALI DA USARE:
${pillarsCtx}

Ritorna ESCLUSIVAMENTE un oggetto JSON con questa esatta struttura:
{
  "nextMonthProjection": "Breve frase sull'intento del prossimo mese per dare continuità",
  "posts": [
    {
      "contentType": "tipo di contenuto (es. Carousel, Video, Text)",
      "dayOfMonth": 15,
      "pillar": "titolo del pillar esatto tra quelli sopra",
      "persona": "ruolo della persona target esatta",
      "hook": "Un aggancio per iniziare il post (il titolo vero e proprio che l'utente vedrà nel calendario)",
      "angle": "L'angolatura o l'idea del contenuto in breve",
      "mediaType": "image, video, carousel o none",
      "mediaIdea": "Idea per l'immagine/grafico se necessario"
    }
  ]
}`;
  const result = await callAI(prompt, system, isProMode);
  const data = parseJsonFromAI(result.text);
  
  const posts: CalendarPost[] = (data.posts || []).map((p: any) => ({
    id: Math.random().toString(36).substring(2, 11),
    platform,
    contentType: p.contentType || (platform === 'linkedin' ? 'text' : 'email'),
    scheduledDate: new Date(year, month, p.dayOfMonth || 15).toISOString(),
    pillar: p.pillar || 'Generale',
    persona: p.persona || 'Audience',
    hook: p.hook || 'Nuovo Post',
    angle: p.angle || '',
    mediaType: p.mediaType || 'none',
    mediaIdea: p.mediaIdea || '',
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
  const brandContext = buildBrandContext(brand);
  const prompt = `Analizza i seguenti competitor (${type}): ${competitorLinks.join(", ")}.

Contesto del ns. Brand per trovare gap strategici:
${brandContext}

Ritorna ESCLUSIVAMENTE un oggetto JSON con questa esatta struttura:
{
  "competitors": [
    {
      "name": "Nome",
      "url": "Link limitato se applicabile",
      "editorialPositioning": "Posizionamento editoriale",
      "strengths": ["Punto forza 1", "Punto forza 2"],
      "weaknesses": ["Punto debole 1", "Punto debole 2"],
      "contentPatterns": "Pattern prevalente",
      "analysisQuality": "STRONG" o "STANDARD"
    }
  ],
  "overallMarketGaps": [
    {
      "gap": "Vuoto di mercato identificato",
      "whyItMatters": "Perché è rilevante",
      "brandAdvantage": "Come il ns brand può sfruttarlo",
      "priority": "HIGH", "MEDIUM" o "LOW"
    }
  ],
  "practicalStrategicTips": [
    {
      "action": "Azione tattica",
      "objective": "Obiettivo",
      "channel": "${type}",
      "expectedImpact": "Breve impatto atteso"
    }
  ]
}`;
  const result = await callAI(prompt, "Competitor Intelligence Analyst", isPro);
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
  const brandContext = buildBrandContext(brand);
  const prompt = `Analizza attentamente tutti i dettagli del seguente brand (inclusi i gap dei competitor se disponibili) e definisci 3 Target Persona strategicamente ideali per massimizzare le opportunità nel mercato:\n\n${brandContext}\n
Ritorna un array JSON di oggetti. 
Ogni oggetto deve usare ESATTAMENTE queste chiavi in inglese: "name" (stringa), "role" (stringa), "pains" (stringa unica, non array), "goals" (stringa unica, non array).
I contenuti devono essere in italiano, molto specifici rispetto alla industry del brand.`;
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
  const brandContext = buildBrandContext(brand);
  const prompt = `Analizza attentamente tutti i dettagli del seguente brand (inclusi i gap dei competitor se disponibili) e identifica 4 Content Pillars (pilastri editoriali) fondamentali su cui basare la strategia di contenuti per distinguersi nel mercato:\n\n${brandContext}\n
Ritorna un array JSON di oggetti. 
Ogni oggetto deve usare ESATTAMENTE queste chiavi in inglese: "title" (stringa), "description" (stringa).
I contenuti devono essere in italiano, molto specifici e azionabili.`;
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

// Funzione per convertire markdown bold (**testo**) in Unicode Bold
// I caratteri senza equivalente Unicode Bold (accenti, simboli) restano normali
const convertMarkdownToUnicodeBold = (text: string): string => {
  const boldMap: Record<string, string> = {
    'A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝',
    'K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧',
    'U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭',
    'a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵','i':'𝗶','j':'𝗷',
    'k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽','q':'𝗾','r':'𝗿','s':'𝘀','t':'𝘁',
    'u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅','y':'𝘆','z':'𝘇',
    '0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵'
  };
  
  // Step 1: Rimuovi eventuali Unicode Bold corrotti (sequenze di caratteri U+1D5xx malformati)
  let cleaned = text.replace(/[\uD835][\uDC00-\uDFFF]/g, (match) => {
    // Mantieni solo i caratteri Unicode Bold validi che sono nella nostra mappa
    const values = Object.values(boldMap);
    return values.includes(match) ? match : '';
  });
  
  // Step 2: Converti **markdown bold** in Unicode Bold (solo caratteri ASCII)
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, (_match, p1) => {
    return Array.from(p1 as string).map((char: string) => {
      return boldMap[char] || char; // Caratteri senza mappa (accenti etc.) restano normali
    }).join('');
  });
  
  // Step 3: Rimuovi asterischi orfani residui
  cleaned = cleaned.replace(/\*{2,}/g, '');
  
  return cleaned;
};

export const generatePostContent = async (
  brand: BrandKB, post: CalendarPost, persona?: Persona, pillar?: Pillar, isPro: boolean = false
): Promise<{text: string, sources: GroundingSource[]}> => {
  // Selezione linee guida specifiche
  let guidelines = brand.linkedinGuidelines;
  if (post.platform === 'newsletter') {
    guidelines = brand.newsletterGuidelines;
  } else if (post.platform === 'linkedin') {
    if (post.contentType === 'article') guidelines = brand.linkedinArticleGuidelines;
    else if (post.contentType === 'linkedin_newsletter') guidelines = brand.linkedinNewsletterGuidelines;
  }

  const brandCtx = buildBrandContext(brand);
  const personaCtx = persona ? `\nTARGET PERSONA:\nRuolo: ${persona.role}\nPains: ${persona.pains}\nGoals: ${persona.goals}\n` : '';
  const pillarCtx = pillar ? `\nPILLAR EDITORIALE:\nTitolo: ${pillar.title}\nDescrizione: ${pillar.description}\n` : '';

  const system = `Agisci come un esperto Copywriter e Content Strategist Senior specializzato in ${post.platform}.
Sei incaricato di scrivere contenuti di altissimo livello che rispettino PEDISSEQUAMENTE le istruzioni fornite.

REGOLE MANDATORIE DI FORMATTAZIONE E STILE:
1. GRASSETTO: Usa **doppi asterischi** per evidenziare le parole importanti (es: **Strategia**). NON usare MAI caratteri Unicode speciali o simboli matematici per il grassetto.
2. LEGGIBILITÀ: Usa frasi brevi, incisive e paragrafi di massimo 2-3 righe per facilitare la lettura veloce a schermo.
3. LINK: Se le linee guida richiedono un link, posizionalo nelle prime 3 righe del post usando l'URL del brand (${brand.websiteUrl}).

REGOLE DI QUALITÀ DEL CONTENUTO:
4. SOBRIETÀ E COINVOLGIMENTO: Il tono deve essere sobrio ma coinvolgente. Evita sensazionalismi e fuffa. Ogni frase deve apportare valore reale.
5. APPORTO SIGNIFICATIVO: Il contenuto deve offrire insight concreti, dati reali o esperienze verificabili nel settore specifico del brand. No generalizzazioni vuote.
6. FONTI: Se citi dati, statistiche o tendenze di settore, indica la fonte tra parentesi (es: "secondo [Fonte, Anno]"). Cerca di essere sempre verificabile.
7. ORIGINALITÀ: Il tono di voce deve essere sempre originale e mirato al settore e al pubblico target. Evita formule generiche.

LINEE GUIDA SPECIFICHE DA SEGUIRE:
${guidelines}`;

  const prompt = `${brandCtx}
${personaCtx}
${pillarCtx}

DETTAGLI SPECIFICI PER QUESTO POST:
Piattaforma: ${post.platform}
Tipo Contenuto: ${post.contentType}
Hook/Titolo: ${post.hook}
Angolo Strategico: ${post.angle}
Idea Visual: ${post.mediaIdea}

ESECUZIONE:
Genera il contenuto completo del post. Assicurati che ogni singola riga delle linee guida e delle regole di qualità sopra citate sia rispettata.
Usa **doppi asterischi** per il grassetto. Evita paragrafi lunghi. Sii concreto e specifico.`;

  const result = await callAI(prompt, system, isPro);
  
  // Applica post-processing di sicurezza per eliminare eventuali asterischi residui
  const processedText = convertMarkdownToUnicodeBold(result.text);
  
  return { text: processedText, sources: result.sources };
};

export const suggestObjectives = async (brand: BrandKB, platform: Platform, contentType: ContentType, isPro: boolean = false): Promise<string[]> => {
  const system = "Agisci come un Content Strategist esperto.";
  const brandCtx = buildBrandContext(brand);
  const prompt = `Analizza questo brand e suggerisci 5 obiettivi specifici e strategici per un ${contentType} su ${platform}.
  Brand: ${brand.name}
  Contesto: ${brandCtx}
  
  Ritorna ESCLUSIVAMENTE un array JSON di stringhe (max 5 obiettivi).
  Esempio: ["Aumentare la lead generation", "Posizionare il CEO come leader di pensiero"]`;
  
  const result = await callAI(prompt, system, isPro);
  return parseJsonFromAI(result.text);
};

export const refineCustomPost = async (brand: BrandKB, platform: Platform, contentType: ContentType, objective: string, baseText: string, isPro: boolean = false): Promise<{text: string, sources: GroundingSource[]}> => {
  let guidelines = "";
  if (platform === 'linkedin') {
    guidelines = contentType === 'article' ? brand.linkedinArticleGuidelines : brand.linkedinGuidelines;
  } else {
    guidelines = brand.newsletterGuidelines;
  }
  
  const system = `Agisci come un esperto Copywriter Senior. Ottimizza il testo per un ${contentType} su ${platform} seguendo queste linee guida:
${guidelines}
REGOLE DI FORMATTAZIONE:
- Usa **doppi asterischi** per il grassetto. NON usare MAI caratteri Unicode speciali.
- Usa frasi brevi e incisive.
- Il tono deve essere sobrio ma coinvolgente, con un apporto significativo e realistico al settore.
- Se citi dati o tendenze, indica la fonte.
Se è un articolo, usa una struttura narrativa coinvolgente con titoli chiari.`;

  const prompt = `Brand: ${brand.name}. Obiettivo: ${objective}. Formato: ${contentType}.
Testo da ottimizzare:
${baseText}

Ritorna il testo raffinato e pronto per la pubblicazione su ${platform}.`;
  
  const result = await callAI(prompt, system, isPro);
  const processedText = convertMarkdownToUnicodeBold(result.text);
  return { text: processedText, sources: result.sources };
};

export const analyzeImageAndGeneratePost = async (imageBase64: string, mimeType: string, baseText: string, brand: BrandKB, platform: Platform, isPro: boolean = false): Promise<{text: string, sources: GroundingSource[]}> => {
  const response = await fetch(`${API_URL}/api/generate-multimodal`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      image_data: imageBase64,
      mime_type: mimeType,
      base_text: baseText,
      brand_kb: brand,
      platform: platform,
      is_pro: isPro
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Errore durante la generazione multimodale");
  }

  const data = await response.json();
  const processedText = convertMarkdownToUnicodeBold(data.text);
  return { text: processedText, sources: data.sources || [] };
};

export const queryBrandBrain = async (question: string, files: BrandFile[], isPro: boolean = false): Promise<{text: string, sources: GroundingSource[]}> => {
  const response = await fetch(`${API_URL}/api/brain/query`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      question,
      files,
      is_pro: isPro
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Errore durante l'interrogazione del Brain");
  }

  const data = await response.json();
  return { text: data.text, sources: data.sources || [] };
};

export const generateDeepVisualPrompt = async (post: CalendarPost, brand: BrandKB, isPro: boolean = false): Promise<string> => {
  const brandCtx = `Brand: ${brand.name}. Settore: ${brand.description}. Stile Visivo: ${brand.visualKeywords || 'Moderno, professionale'}.`;
  
  let typeSpecific = "";
  // Determiniamo se è un carosello dal tipo di contenuto o dal mediaIdea
  const isCarousel = post.contentType === 'linkedin_newsletter' || (post.mediaIdea && post.mediaIdea.toLowerCase().includes('carousel')) || (post.mediaType === 'carousel');

  if (post.contentType === 'article' || post.contentType === 'linkedin_newsletter') {
    typeSpecific = "Si tratta di un contenuto lungo, genera un prompt per un'immagine di copertina cinematografica ed evocativa (Aspect Ratio 16:9, --ar 16:9).";
  } else if (isCarousel) {
    typeSpecific = `Si tratta di un CAROSELLO LINKEDIN. Genera una struttura dettagliata slide per slide (minimo 5-7 slide):
    - Slide 1 (Copertina): Gancio visivo estremo, titolo "${post.hook}", colori del brand.
    - Slide 2-N: Sviluppo narrativo dell'angolo "${post.angle}". Per ogni slide specifica: Titolo, Grafica suggerita, Testo di supporto.
    - Ultima Slide: Call to Action chiara e forte.
    Specifica uno stile visivo coerente (formato 1080x1350, --ar 4:5).`;
  } else {
    typeSpecific = "Genera un prompt per un post standard LinkedIn (formato 1080x1350, --ar 4:5). Focus sul soggetto e l'atmosfera professionale.";
  }

  const system = "Agisci come un Art Director e Prompt Engineer Senior per AI generative (Midjourney, ChatGPT, DALL-E).";
  const prompt = `${brandCtx}
CONTENUTO POST:
Hook: ${post.hook}
Angolo: ${post.angle}
Idea Media Originale: ${post.mediaIdea || 'Non specificata'}

${typeSpecific}

REGOLE PROMPT:
1. Inizia con una descrizione visiva dettagliata (soggetto, stile, illuminazione, colori, tipo di lente).
2. Includi istruzioni tecniche precise per l'LLM (es: "Crea un'immagine che...", "Dividi il carosello in...").
3. Assicurati che l'estetica sia coerente con i "Visual Style Keywords" del brand: ${brand.visualKeywords || 'non definiti'}.
4. Se è un carosello, fornisci un output strutturato che posso copiare e incollare per ottenere tutte le slide.

Genera il prompt completo pronto per essere copiato:`;

  const result = await callAI(prompt, system, isPro);
  return result.text;
};
