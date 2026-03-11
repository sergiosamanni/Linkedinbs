import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import BrandKBForm from './components/BrandKBForm';
import StrategyPlanner from './components/StrategyPlanner';
import UnifiedCalendar from './components/UnifiedCalendar';
import ContentCustom from './components/ContentCustom';
import { analyzeCompetitors, suggestPersonas, suggestPillars, generateSinglePersonaDetails, generateSinglePillarDetails, suggestRelevantSectors } from './services/geminiService';
import { BrandKB, Persona, Pillar, View, MonthlyStrategy, CalendarPost, BrandProject, User, Platform, SuggestedSector } from './types';
import { authService } from './services/authService';
import { storageService } from './services/storageService';
import { 
  Plus, Trash2, Sparkles, Loader2, Search, Check, 
  X, TrendingUp, Zap, UserPlus, Linkedin, Mail, ArrowRight, Activity, Lock, Unlock, ShieldAlert, Newspaper, FileText, Shield, LayoutGrid, List,
  BookOpen, Star, AlertCircle, Wand2, Factory, Briefcase, ChevronRight, Target, CheckSquare, Square
} from 'lucide-react';

const LI_DEFAULT_GUIDELINES = `Agisci come LinkedIn Content Strategist Senior.
- NO MARKDOWN. Solo caratteri UNICODE BOLD per evidenziare.
- Lunghezza: 1400+ caratteri.
- Struttura: Hook forte, corpo a blocchi brevi, valore reale (insight), CTA.
- Dati reali via Google Search.`;

const LI_NEWSLETTER_GUIDELINES = `LINEE GUIDA NEWSLETTER LINKEDIN
- Stile: Approfondito, autorevole, narrativo.
- NO MARKDOWN. Usa unicode bold.`;

const LI_ARTICLE_GUIDELINES = `LINEE GUIDA ARTICOLI LINKEDIN
- Stile: Saggistico ma leggibile.
- NO MARKDOWN. Usa unicode bold.`;

const NL_DEFAULT_GUIDELINES = `GUIDELINES NEWSLETTER EMAIL
- Stile: Personale e diretto (1:1).
- Focus: Educazione, Autorevolezza, Conversione.`;

const PRO_PASSWORD = "PRO-MASTER-2025";

const generateId = () => Math.random().toString(36).substr(2, 9);

const createEmptyProject = (userId: string, name: string = 'Nuovo Brand'): BrandProject => ({
  id: generateId(),
  userId,
  brand: {
    name,
    websiteUrl: '',
    description: '',
    mission: '',
    usp: '',
    values: '',
    toneOfVoice: 'Professionale',
    brandPersonality: '',
    targetSummary: '',
    visualKeywords: '',
    linkedinGuidelines: LI_DEFAULT_GUIDELINES,
    linkedinNewsletterGuidelines: LI_NEWSLETTER_GUIDELINES,
    linkedinArticleGuidelines: LI_ARTICLE_GUIDELINES,
    newsletterGuidelines: NL_DEFAULT_GUIDELINES,
    linkedinPostsPerMonth: 12,
    newsletterPostsPerMonth: 4,
    competitors: [],
    competitorPostLinks: [],
    competitorArticleLinks: []
  },
  personas: [],
  pillars: [],
  strategies: []
});

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());
  const [activeView, setActiveView] = useState<View>('knowledge');
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); 
  const [projects, setProjects] = useState<BrandProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [isProMode, setIsProMode] = useState<boolean>(() => localStorage.getItem('pro_mode_enabled') === 'true');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPass, setUnlockPass] = useState("");
  const [unlockError, setUnlockError] = useState(false);

  const [newPostComp, setNewPostComp] = useState("");
  const [newArticleComp, setNewArticleComp] = useState("");
  const [analyzingPosts, setAnalyzingPosts] = useState(false);
  const [analyzingArticles, setAnalyzingArticles] = useState(false);

  const [completingPersonaId, setCompletingPersonaId] = useState<string | null>(null);
  const [completingPillarId, setCompletingPillarId] = useState<string | null>(null);

  const [isSectorsModalOpen, setIsSectorsModalOpen] = useState(false);
  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [suggestedSectors, setSuggestedSectors] = useState<SuggestedSector[]>([]);
  const [selectedSectorKeys, setSelectedSectorKeys] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setFetchingProjects(true);
      storageService.getProjects(user.id).then(cloudProjects => {
        const loadedProjects = cloudProjects || [];
        setProjects(loadedProjects);
        if (loadedProjects.length > 0) setActiveProjectId(loadedProjects[0].id);
        setFetchingProjects(false);
        setIsInitialized(true); 
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && isInitialized && !fetchingProjects) {
      storageService.saveProjects(user.id, projects);
    }
  }, [projects, user, fetchingProjects, isInitialized]);

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId) || null, [projects, activeProjectId]);

  const updateActiveProject = useCallback((updater: (p: BrandProject) => BrandProject) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => p.id === activeProjectId ? updater(p) : p));
  }, [activeProjectId]);

  const brand = useMemo(() => activeProject?.brand || createEmptyProject("").brand, [activeProject]);
  const personas = useMemo(() => activeProject?.personas || [], [activeProject]);
  const pillars = useMemo(() => activeProject?.pillars || [], [activeProject]);
  const strategies = useMemo(() => activeProject?.strategies || [], [activeProject]);

  const setBrand = useCallback((updater: BrandKB | ((prev: BrandKB) => BrandKB)) => 
    updateActiveProject(p => ({ ...p, brand: typeof updater === 'function' ? updater(p.brand) : updater })), [updateActiveProject]);

  const setPersonas = useCallback((updater: Persona[] | ((prev: Persona[]) => Persona[])) => 
    updateActiveProject(p => ({ ...p, personas: typeof updater === 'function' ? updater(p.personas) : updater })), [updateActiveProject]);

  const setPillars = useCallback((updater: Pillar[] | ((prev: Pillar[]) => Pillar[])) => 
    updateActiveProject(p => ({ ...p, pillars: typeof updater === 'function' ? updater(p.pillars) : updater })), [updateActiveProject]);

  const setStrategies = useCallback((updater: MonthlyStrategy[] | ((prev: MonthlyStrategy[]) => MonthlyStrategy[])) => 
    updateActiveProject(p => ({ ...p, strategies: typeof updater === 'function' ? updater(p.strategies) : updater })), [updateActiveProject]);

  // Handle strategy updates by replacing the specific strategy in the project state
  const onUpdateStrategy = useCallback((updated: MonthlyStrategy) => {
    setStrategies(prev => prev.map(s => s.id === updated.id ? updated : s));
  }, [setStrategies]);

  const handleGlobalError = (error: any) => {
    if (error.message === "QUOTA_EXCEEDED") {
      setShowUnlockModal(true);
    } else {
      alert("Errore AI: " + error.message);
    }
  };

  const handleUnlockPro = () => {
    if (unlockPass === PRO_PASSWORD) {
      setIsProMode(true);
      localStorage.setItem('pro_mode_enabled', 'true');
      setShowUnlockModal(false);
      setUnlockPass("");
      setUnlockError(false);
    } else { setUnlockError(true); }
  };

  const handleAddCompetitorPostLinks = () => {
    if (!newPostComp) return;
    const links = newPostComp.split(/[\n,\s]+/).map(l => l.trim()).filter(l => l.length > 0);
    setBrand(prev => ({ ...prev, competitorPostLinks: Array.from(new Set([...(prev.competitorPostLinks || []), ...links])) }));
    setNewPostComp("");
  };

  const handleAddCompetitorArticleLinks = () => {
    if (!newArticleComp) return;
    const links = newArticleComp.split(/[\n,\s]+/).map(l => l.trim()).filter(l => l.length > 0);
    setBrand(prev => ({ ...prev, competitorArticleLinks: Array.from(new Set([...(prev.competitorArticleLinks || []), ...links])) }));
    setNewArticleComp("");
  };

  const handleAnalyzePosts = async () => {
    if (!brand.competitorPostLinks || brand.competitorPostLinks.length === 0) return;
    setAnalyzingPosts(true);
    try {
      const insights = await analyzeCompetitors(brand.competitorPostLinks, 'linkedin', brand, pillars, isProMode);
      setBrand(prev => ({ ...prev, competitorPostInsights: insights }));
    } catch (e: any) { handleGlobalError(e); }
    finally { setAnalyzingPosts(false); }
  };

  const handleAnalyzeArticles = async () => {
    if (!brand.competitorArticleLinks || brand.competitorArticleLinks.length === 0) return;
    setAnalyzingArticles(true);
    try {
      const insights = await analyzeCompetitors(brand.competitorArticleLinks, 'blog', brand, pillars, isProMode);
      setBrand(prev => ({ ...prev, competitorArticleInsights: insights }));
    } catch (e: any) { handleGlobalError(e); }
    finally { setAnalyzingArticles(false); }
  };

  const handleCompletePersona = async (p: Persona) => {
    if (!p.name) return;
    setCompletingPersonaId(p.id);
    try {
      const details = await generateSinglePersonaDetails(brand, p.name, p.role || "Professionista", isProMode);
      setPersonas(prev => prev.map(x => x.id === p.id ? { ...x, pains: details.pains, goals: details.goals } : x));
    } catch (e) { handleGlobalError(e); }
    finally { setCompletingPersonaId(null); }
  };

  const handleCompletePillar = async (p: Pillar) => {
    if (!p.title) return;
    setCompletingPillarId(p.id);
    try {
      const details = await generateSinglePillarDetails(brand, p.title, isProMode);
      setPillars(prev => prev.map(x => x.id === p.id ? { ...x, description: details.description } : x));
    } catch (e) { handleGlobalError(e); }
    finally { setCompletingPillarId(null); }
  };

  const handleSuggestSectors = async () => {
    setSectorsLoading(true);
    setIsSectorsModalOpen(true);
    setSelectedSectorKeys([]);
    try {
      const suggestions = await suggestRelevantSectors(brand, isProMode);
      setSuggestedSectors(suggestions);
    } catch (e) {
      handleGlobalError(e);
      setIsSectorsModalOpen(false);
    } finally {
      setSectorsLoading(false);
    }
  };

  const toggleSelection = (key: string) => {
    setSelectedSectorKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleBatchImport = async () => {
    if (selectedSectorKeys.length === 0) return;
    
    if (activeView === 'personas') {
      const newItems: Persona[] = selectedSectorKeys.map(key => {
        const [sIdx, rIdx] = key.split('-').map(Number);
        const s = suggestedSectors[sIdx];
        const r = s.targetRoles[rIdx];
        return { id: generateId(), name: s.sector, role: r.role, pains: '', goals: '' };
      });
      setPersonas(prev => [...prev, ...newItems]);
      setIsSectorsModalOpen(false);
      // Completa in serie per evitare sovrapposizioni e gestire rate limits
      for (const item of newItems) {
        await handleCompletePersona(item);
      }
    } else if (activeView === 'pillars') {
      const newItems: Pillar[] = selectedSectorKeys.map(key => {
        const sIdx = Number(key);
        const s = suggestedSectors[sIdx];
        return { id: generateId(), title: `Target: ${s.sector}`, description: '' };
      });
      setPillars(prev => [...prev, ...newItems]);
      setIsSectorsModalOpen(false);
      for (const item of newItems) {
        await handleCompletePillar(item);
      }
    }
  };

  if (!user) return <Auth onAuthSuccess={u => setUser(u)} />;

  return (
    <Layout 
      activeView={activeView} onViewChange={setActiveView} projects={projects}
      activeProjectId={activeProjectId} onProjectSelect={setActiveProjectId}
      onProjectAdd={() => { const p = createEmptyProject(user.id); setProjects([...projects, p]); setActiveProjectId(p.id); }}
      onProjectDelete={(id) => { if(confirm("Eliminare brand?")) { const updated = projects.filter(x => x.id !== id); setProjects(updated); setActiveProjectId(updated.length > 0 ? updated[0].id : null); }}}
      onUpdateProjectBrandLogo={(pid, url) => setProjects(prev => prev.map(x => x.id === pid ? {...x, brand: {...x.brand, logoUrl: url}} : x))}
      onUpdateProjectBrandFavicon={(pid, url) => setProjects(prev => prev.map(x => x.id === pid ? {...x, brand: {...x.brand, faviconUrl: url}} : x))}
      user={user} onLogout={() => { authService.logout(); setUser(null); }}
    >
      {activeProject && (
        <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-10 pb-20">
          
          <div className="flex justify-end px-2">
            <div className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${isProMode ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <Zap size={10} fill="currentColor" />
              <span>{isProMode ? 'Pro Mode' : 'Free Tier'}</span>
              {!isProMode && <button onClick={() => setShowUnlockModal(true)} className="ml-2 hover:underline text-blue-600">Unlock Pro</button>}
            </div>
          </div>

          {activeView === 'knowledge' && <BrandKBForm data={brand} onChange={setBrand} />}
          
          {activeView === 'personas' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Target Personas</h3>
                  <p className="text-xs text-slate-500 mt-1">Definisci gli archetipi del tuo mercato.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSuggestSectors} className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-black uppercase flex items-center space-x-2 hover:bg-blue-100 transition-all"><Factory size={14} /> <span>Suggerisci Settori</span></button>
                  <button onClick={() => setPersonas(prev => [...prev, { id: generateId(), name: '', role: '', pains: '', goals: '' }])} className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black uppercase flex items-center space-x-2 transition-all"><Plus size={14} /> <span>Aggiungi Manuale</span></button>
                  <button onClick={async () => { setLoadingSuggestions(true); try { const s = await suggestPersonas(brand, isProMode); setPersonas(prev => [...prev, ...s]); } catch(e) { handleGlobalError(e); } finally { setLoadingSuggestions(false); } }} disabled={loadingSuggestions} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase flex items-center space-x-2 shadow-lg">{loadingSuggestions ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}<span>Genera con AI</span></button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {personas.map(p => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all flex flex-col group">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400"><UserPlus size={20} /></div>
                        <div className="flex-1">
                          <input value={p.name} onChange={e => setPersonas(prev => prev.map(x => x.id === p.id ? {...x, name: e.target.value} : x))} className="text-md font-black text-slate-900 bg-transparent outline-none w-full" placeholder="Nome Persona..." />
                          <input value={p.role} onChange={e => setPersonas(prev => prev.map(x => x.id === p.id ? {...x, role: e.target.value} : x))} className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-transparent outline-none w-full mt-1" placeholder="Ruolo..." />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleCompletePersona(p)}
                          disabled={completingPersonaId === p.id || !p.name}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-0 transition-opacity"
                          title="Completa con AI"
                        >
                          {completingPersonaId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        </button>
                        <button onClick={() => setPersonas(prev => prev.filter(x => x.id !== p.id))} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <textarea value={p.pains} onChange={e => setPersonas(prev => prev.map(x => x.id === p.id ? {...x, pains: e.target.value} : x))} className="w-full text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 outline-none resize-none min-h-[80px]" placeholder="Pains..." />
                      <textarea value={p.goals} onChange={e => setPersonas(prev => prev.map(x => x.id === p.id ? {...x, goals: e.target.value} : x))} className="w-full text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 outline-none resize-none min-h-[80px]" placeholder="Goals..." />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'pillars' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Content Pillars</h3>
                  <p className="text-xs text-slate-500 mt-1">I pilastri tematici della strategia.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSuggestSectors} className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-black uppercase flex items-center space-x-2 hover:bg-blue-100 transition-all"><Factory size={14} /> <span>Suggerisci Settori</span></button>
                  <button onClick={() => setPillars(prev => [...prev, { id: generateId(), title: '', description: '' }])} className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black uppercase flex items-center space-x-2"><Plus size={14} /> <span>Aggiungi Manuale</span></button>
                  <button onClick={async () => { setLoadingSuggestions(true); try { const s = await suggestPillars(brand, isProMode); setPillars(prev => [...prev, ...s]); } catch(e) { handleGlobalError(e); } finally { setLoadingSuggestions(false); } }} disabled={loadingSuggestions} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase flex items-center space-x-2 shadow-lg">{loadingSuggestions ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}<span>Genera Pilastri AI</span></button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pillars.map(p => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <input value={p.title} onChange={e => setPillars(prev => prev.map(x => x.id === p.id ? {...x, title: e.target.value} : x))} className="text-md font-black text-slate-900 bg-transparent outline-none w-full" placeholder="Titolo..." />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 block">Pilastro Strategico</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleCompletePillar(p)}
                          disabled={completingPillarId === p.id || !p.title}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-0 transition-opacity"
                          title="Completa con AI"
                        >
                          {completingPillarId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        </button>
                        <button onClick={() => setPillars(prev => prev.filter(x => x.id !== p.id))} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <textarea value={p.description} onChange={e => setPillars(prev => prev.map(x => x.id === p.id ? {...x, description: e.target.value} : x))} className="w-full text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-4 outline-none resize-none min-h-[120px] leading-relaxed" placeholder="Descrizione..." />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'suite_guidelines' && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <div className="flex items-center space-x-4 px-2">
                <div className="p-3 bg-slate-900 text-white rounded-lg shadow-lg"><Shield size={24} /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase">Suite Guidelines</h3>
                  <p className="text-xs text-slate-500 font-medium">Definisci le regole master per ogni singolo formato editoriale.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <Linkedin size={18} />
                    <h4 className="text-xs font-black uppercase tracking-widest">LinkedIn Post Guidelines</h4>
                  </div>
                  <textarea value={brand.linkedinGuidelines} onChange={e => setBrand(prev => ({...prev, linkedinGuidelines: e.target.value}))} className="w-full h-64 p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs font-mono leading-relaxed focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all" />
                </div>
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-indigo-600">
                    <Newspaper size={18} />
                    <h4 className="text-xs font-black uppercase tracking-widest">LinkedIn Newsletter Guidelines</h4>
                  </div>
                  <textarea value={brand.linkedinNewsletterGuidelines} onChange={e => setBrand(prev => ({...prev, linkedinNewsletterGuidelines: e.target.value}))} className="w-full h-64 p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs font-mono leading-relaxed focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all" />
                </div>
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-emerald-600">
                    <FileText size={18} />
                    <h4 className="text-xs font-black uppercase tracking-widest">LinkedIn Articoli Guidelines</h4>
                  </div>
                  <textarea value={brand.linkedinArticleGuidelines} onChange={e => setBrand(prev => ({...prev, linkedinArticleGuidelines: e.target.value}))} className="w-full h-64 p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs font-mono leading-relaxed focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all" />
                </div>
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-purple-600">
                    <Mail size={18} />
                    <h4 className="text-xs font-black uppercase tracking-widest">Email Newsletter Guidelines</h4>
                  </div>
                  <textarea value={brand.newsletterGuidelines} onChange={e => setBrand(prev => ({...prev, newsletterGuidelines: e.target.value}))} className="w-full h-64 p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs font-mono leading-relaxed focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all" />
                </div>
              </div>
            </div>
          )}

          {activeView === 'linkedin_benchmarking' && (
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div className="flex items-center space-x-5">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg"><Search size={24} /></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase">Competitor Radar Master</h3>
                    <p className="text-xs text-slate-500 font-medium">Analisi multicanale dei competitor per estrarre insight strategici.</p>
                  </div>
                </div>
              </div>

              {/* SEZIONE POSTS (LinkedIn) */}
              <div className="space-y-8 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-600 text-white rounded-lg"><Linkedin size={18} /></div>
                    <h4 className="text-lg font-black text-slate-900">Sezione Posts</h4>
                  </div>
                  <button onClick={handleAnalyzePosts} disabled={analyzingPosts || !brand.competitorPostLinks?.length} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center space-x-3 shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50">
                    {analyzingPosts ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    <span>Analizza Posts LinkedIn</span>
                  </button>
                </div>
                <div className="space-y-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">URL Profili / Posts LinkedIn dei Competitor</p>
                  <textarea value={newPostComp} onChange={e => setNewPostComp(e.target.value)} placeholder="Inserisci link profili LinkedIn..." className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold min-h-[100px] resize-none focus:bg-white focus:border-blue-500 transition-all" />
                  <button onClick={handleAddCompetitorPostLinks} disabled={!newPostComp} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 disabled:opacity-30">Aggiungi ai Posts</button>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {brand.competitorPostLinks?.map((c, i) => (
                      <div key={i} className="px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-lg flex items-center space-x-2">
                        <span className="truncate max-w-[250px]">{c}</span>
                        <button onClick={() => setBrand(prev => ({...prev, competitorPostLinks: prev.competitorPostLinks?.filter(x => x !== c)}))} className="text-blue-300 hover:text-rose-500"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {brand.competitorPostInsights && !analyzingPosts && (
                  <div className="space-y-8 mt-8">
                    {/* Competitor Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {brand.competitorPostInsights.competitors.map((c, i) => (
                        <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                          <div className="flex justify-between items-start">
                            <h6 className="font-black text-slate-900 text-xs uppercase">{c.name}</h6>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${c.analysisQuality === 'STRONG' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {c.analysisQuality}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 italic leading-snug">{c.editorialPositioning}</p>
                          <div className="space-y-1">
                            {c.strengths.slice(0, 2).map((s, j) => <div key={j} className="text-[9px] font-bold text-emerald-600 flex items-center"><Check size={10} className="mr-1" /> {s}</div>)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-2"><TrendingUp size={12} /><span>GAP Identificati & Priorità</span></h5>
                        <ul className="space-y-4">
                          {brand.competitorPostInsights.overallMarketGaps.map((gapObj, i) => (
                            <li key={i} className="flex flex-col space-y-1 p-3 bg-white rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                              <div className={`absolute top-0 right-0 px-2 py-0.5 text-[7px] font-black uppercase ${gapObj.priority === 'HIGH' ? 'bg-red-500 text-white' : gapObj.priority === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'}`}>
                                {gapObj.priority}
                              </div>
                              <div className="flex items-start space-x-2">
                                <Check size={12} className="text-blue-50 text-blue-500 mt-1 shrink-0" />
                                <span className="text-xs font-bold text-slate-700">{gapObj.gap}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 pl-5 leading-relaxed">{gapObj.brandAdvantage}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-2"><Activity size={12} /><span>Azioni Tattiche Master</span></h5>
                        <ul className="space-y-3">
                          {brand.competitorPostInsights.practicalStrategicTips.map((tip, i) => (
                            <li key={i} className="text-xs font-bold text-slate-700 flex flex-col p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                              <span className="text-[9px] font-black text-blue-600 uppercase mb-1">{tip.expectedImpact}</span>
                              <div className="flex items-start space-x-2">
                                <Zap size={12} fill="currentColor" className="text-amber-400 mt-0.5 shrink-0" />
                                <span>{tip.action}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SEZIONE ARTICOLI (Blog) */}
              <div className="space-y-8 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-600 text-white rounded-lg"><BookOpen size={18} /></div>
                    <h4 className="text-lg font-black text-slate-900">Sezione Articoli</h4>
                  </div>
                  <button onClick={handleAnalyzeArticles} disabled={analyzingArticles || !brand.competitorArticleLinks?.length} className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center space-x-3 shadow-lg hover:bg-purple-700 transition-all disabled:opacity-50">
                    {analyzingArticles ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    <span>Analizza Blog Competitor</span>
                  </button>
                </div>
                <div className="space-y-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">URL Blog e Articoli dei Competitor</p>
                  <textarea value={newArticleComp} onChange={e => setNewArticleComp(e.target.value)} placeholder="Inserisci link blog esterni..." className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold min-h-[100px] resize-none focus:bg-white focus:border-purple-500 transition-all" />
                  <button onClick={handleAddCompetitorArticleLinks} disabled={!newArticleComp} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 disabled:opacity-30">Aggiungi agli Articoli</button>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {brand.competitorArticleLinks?.map((c, i) => (
                      <div key={i} className="px-3 py-1 bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-black uppercase rounded-lg flex items-center space-x-2">
                        <span className="truncate max-w-[250px]">{c}</span>
                        <button onClick={() => setBrand(prev => ({...prev, competitorArticleLinks: prev.competitorArticleLinks?.filter(x => x !== c)}))} className="text-purple-300 hover:text-rose-500"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {brand.competitorArticleInsights && !analyzingArticles && (
                  <div className="space-y-8 mt-8">
                    {/* Competitor Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {brand.competitorArticleInsights.competitors.map((c, i) => (
                        <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                          <div className="flex justify-between items-start">
                            <h6 className="font-black text-slate-900 text-xs uppercase">{c.name}</h6>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${c.analysisQuality === 'STRONG' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {c.analysisQuality}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 italic leading-snug">{c.editorialPositioning}</p>
                          <div className="space-y-1">
                            {c.strengths.slice(0, 2).map((s, j) => <div key={j} className="text-[9px] font-bold text-emerald-600 flex items-center"><Check size={10} className="mr-1" /> {s}</div>)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-2"><FileText size={12} /><span>Temi Emergenti & Priorità</span></h5>
                        <ul className="space-y-4">
                          {brand.competitorArticleInsights.overallMarketGaps.map((gapObj, i) => (
                            <li key={i} className="flex flex-col space-y-1 p-3 bg-white rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                              <div className={`absolute top-0 right-0 px-2 py-0.5 text-[7px] font-black uppercase ${gapObj.priority === 'HIGH' ? 'bg-red-500 text-white' : gapObj.priority === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'}`}>
                                {gapObj.priority}
                              </div>
                              <div className="flex items-start space-x-2">
                                <Check size={12} className="text-blue-500 mt-1 shrink-0" />
                                <span className="text-xs font-bold text-slate-700">{gapObj.gap}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 pl-5 leading-relaxed">{gapObj.brandAdvantage}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-2"><Zap size={12} /><span>Spunti Produttivi Strategici</span></h5>
                        <ul className="space-y-3">
                          {brand.competitorArticleInsights.practicalStrategicTips.map((tip, i) => (
                            <li key={i} className="text-xs font-bold text-slate-700 flex flex-col p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                              <span className="text-[9px] font-black text-purple-600 uppercase mb-1">{tip.expectedImpact}</span>
                              <div className="flex items-start space-x-2">
                                <Zap size={12} fill="currentColor" className="text-amber-400 mt-0.5 shrink-0" />
                                <span>{tip.action}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'calendar' && (
            <UnifiedCalendar 
              brand={brand} 
              personas={personas} 
              pillars={pillars} 
              strategies={strategies} 
              onUpdateStrategy={onUpdateStrategy} 
              onStrategyAdded={s => setStrategies(prev => [...prev, s])}
              isProMode={isProMode} 
              onGlobalError={handleGlobalError} 
            />
          )}

          {(activeView === 'linkedin_strategy' || activeView === 'newsletter_strategy') && (
            <StrategyPlanner 
              brand={brand} personas={personas} pillars={pillars} platform={activeView.split('_')[0] as Platform}
              strategies={strategies?.filter(s => s.platform === activeView.split('_')[0]) || []} 
              onStrategyAdded={s => setStrategies(prev => [...prev, s])} 
              onStrategyDeleted={id => setStrategies(prev => prev.filter(s => s.id !== id))} 
              onStrategyUpdated={onUpdateStrategy}
              onUpdateBrand={setBrand} isProMode={isProMode} onGlobalError={handleGlobalError}
            />
          )}

          {(activeView === 'linkedin_custom' || activeView === 'newsletter_custom') && (
            <ContentCustom brand={brand} platform={activeView.split('_')[0] as Platform} isProMode={isProMode} onGlobalError={handleGlobalError} />
          )}
        </div>
      )}

      {/* Suggested Sectors Modal */}
      {isSectorsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6 shrink-0">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200">
                  <Factory size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">Suggerimenti Settori Strategici</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Basati sulla tua Knowledge Base</p>
                </div>
              </div>
              <button onClick={() => setIsSectorsModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-6">
              {sectorsLoading ? (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                  <Loader2 size={40} className="animate-spin text-blue-600" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">L'AI sta analizzando i mercati verticali...</p>
                </div>
              ) : suggestedSectors.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {suggestedSectors.map((s, sIdx) => (
                    <div key={sIdx} className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-6 space-y-4 hover:border-blue-200 transition-all group">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-3">
                             {activeView === 'pillars' && (
                               <button 
                                 onClick={() => toggleSelection(sIdx.toString())}
                                 className={`p-1 rounded transition-colors ${selectedSectorKeys.includes(sIdx.toString()) ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'}`}
                               >
                                 {selectedSectorKeys.includes(sIdx.toString()) ? <CheckSquare size={20} /> : <Square size={20} />}
                               </button>
                             )}
                             <h5 className="text-md font-black text-slate-900">{s.sector}</h5>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-1 italic">"{s.rationale}"</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-200/50">
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Roles & Select:</span>
                         <div className="flex flex-wrap gap-2">
                            {s.targetRoles.map((r, rIdx) => {
                              const key = `${sIdx}-${rIdx}`;
                              const isSelected = selectedSectorKeys.includes(key);
                              return (
                                <button 
                                  key={rIdx} 
                                  onClick={() => activeView === 'personas' ? toggleSelection(key) : null}
                                  className={`px-3 py-1.5 border rounded-lg text-[9px] font-black uppercase transition-all flex items-center ${
                                    activeView === 'personas' 
                                      ? (isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300')
                                      : 'bg-white border-slate-100 text-slate-500 cursor-default'
                                  }`}
                                >
                                  {activeView === 'personas' && (isSelected ? <CheckSquare size={10} className="mr-1.5" /> : <Square size={10} className="mr-1.5" />)}
                                  {r.role}
                                </button>
                              );
                            })}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 space-y-2">
                  <AlertCircle size={32} className="mx-auto text-slate-200" />
                  <p className="text-xs font-bold text-slate-400">Nessun suggerimento disponibile. Controlla la Knowledge Base.</p>
                </div>
              )}
            </div>
            
            <div className="pt-6 border-t border-slate-50 shrink-0 space-y-4">
               {selectedSectorKeys.length > 0 && (
                 <button 
                   onClick={handleBatchImport}
                   className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center space-x-3 shadow-xl hover:bg-blue-700 transition-all"
                 >
                   <Sparkles size={16} />
                   <span>Importa Selezionati ({selectedSectorKeys.length}) & Completa AI</span>
                 </button>
               )}
               <p className="text-[9px] text-slate-400 italic text-center">
                 Seleziona più settori o ruoli e clicca il tasto di importazione massiva. L'AI genererà automaticamente in background i dettagli per ogni elemento inserito.
               </p>
            </div>
          </div>
        </div>
      )}

      {showUnlockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="text-center space-y-2"><ShieldAlert size={32} className="mx-auto text-blue-600" /><h4 className="text-xl font-black">Sblocca Versione Pro</h4><p className="text-xs text-slate-500">Quota esaurita o funzione avanzata. Inserisci la password Pro.</p></div>
            <input type="password" value={unlockPass} onChange={e => setUnlockPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUnlockPro()} className={`w-full px-4 py-3 bg-slate-50 border rounded-lg outline-none font-bold ${unlockError ? 'border-red-300' : 'border-slate-100'}`} placeholder="Password Pro..." />
            <button onClick={handleUnlockPro} className="w-full py-3 bg-slate-900 text-white rounded-lg font-black text-xs uppercase shadow-xl">ATTIVA PRO</button>
            <button onClick={() => setShowUnlockModal(false)} className="w-full text-slate-400 text-[10px] uppercase font-black">Chiudi</button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;