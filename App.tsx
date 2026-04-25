import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import BrandKBForm from './components/BrandKBForm';
import StrategyPlanner from './components/StrategyPlanner';
import UnifiedCalendar from './components/UnifiedCalendar';
import ContentCustom from './components/ContentCustom';
import UserSettings from './components/UserSettings';
import CompetitorRadar from './components/CompetitorRadar';
import PersonasView from './components/PersonasView';
import PillarsView from './components/PillarsView';
import SuiteGuidelines from './components/SuiteGuidelines';
import SuggestedSectorsModal from './components/SuggestedSectorsModal';
import AdminUsersView from './components/AdminUsersView';
import { analyzeCompetitors, suggestPersonas, suggestPillars, generateSinglePersonaDetails, generateSinglePillarDetails, suggestRelevantSectors } from './services/geminiService';
import { BrandKB, Persona, Pillar, View, MonthlyStrategy, CalendarPost, BrandProject, AppUser, Platform, SuggestedSector } from './types';
import { authService } from './services/authService';
import { storageService } from './services/storageService';
import { 
  Plus, Trash2, Sparkles, Loader2, Search, Check, 
  X, TrendingUp, Zap, UserPlus, Linkedin, Mail, ArrowRight, Activity, Lock, Unlock, ShieldAlert, Newspaper, FileText, Shield, LayoutGrid, List,
  BookOpen, Star, AlertCircle, Wand2, Factory, Briefcase, ChevronRight, Target, CheckSquare, Square,
  Settings as SettingsIcon
} from 'lucide-react';

const LI_DEFAULT_GUIDELINES = `Agisci come LinkedIn Content Strategist Senior.
- NO MARKDOWN: Usa SOLO UNICODE BOLD per evidenziare. NON USARE MAI **.
- Leggibilità: Frasi brevi e incisive. Paragrafi di massimo 2-3 righe.
- Link: Se hai un link, mettilo SEMPRE nelle prime 3 righe.
- Lunghezza: 1400+ caratteri.
- Struttura: Hook forte, corpo a blocchi brevi, valore reale (insight), CTA.
- Dati reali via Google Search.`;

const LI_NEWSLETTER_GUIDELINES = `LINEE GUIDA NEWSLETTER LINKEDIN
- Stile: Approfondito, autorevole, narrativo.
- NO MARKDOWN: Usa SOLO UNICODE BOLD per evidenziare. NON USARE MAI **.
- Leggibilità: Frasi brevi e incisive per non stancare il lettore.`;

const LI_ARTICLE_GUIDELINES = `LINEE GUIDA ARTICOLI LINKEDIN
- Stile: Saggistico ma leggibile.
- NO MARKDOWN: Usa SOLO UNICODE BOLD per evidenziare. NON USARE MAI **.
- Leggibilità: Frasi brevi e concetti chiari.`;

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
  const [user, setUser] = useState<AppUser | null>(authService.getCurrentUser());
  const [activeView, setActiveView] = useState<View>('knowledge');
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); 
  const [projects, setProjects] = useState<BrandProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isProMode, setIsProMode] = useState<boolean>(() => localStorage.getItem('pro_mode_enabled') === 'true');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPass, setUnlockPass] = useState("");
  const [unlockError, setUnlockError] = useState(false);

  const [isSectorsModalOpen, setIsSectorsModalOpen] = useState(false);
  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [suggestedSectors, setSuggestedSectors] = useState<SuggestedSector[]>([]);
  const [selectedSectorKeys, setSelectedSectorKeys] = useState<string[]>([]);
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [isLILoading, setIsLILoading] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    if (path.includes('/api/linkedin/callback')) {
      // Reindirizza direttamente al backend per gestire il callback e il successivo redirect
      window.location.href = `${API_URL}/api/linkedin/callback${search}`;
    }
  }, []);

  useEffect(() => {
    if (user) {
      setFetchingProjects(true);
      storageService.getProjects(user.id).then(cloudProjects => {
        const loadedProjects = cloudProjects || [];
        setProjects(loadedProjects);
        
        // Se c'è un progetto specificato nell'URL (es. dopo redirect LinkedIn), selezionalo
        const urlParams = new URLSearchParams(window.location.search);
        const urlProjId = urlParams.get('project');
        
        if (urlProjId && loadedProjects.some(p => p.id === urlProjId)) {
          setActiveProjectId(urlProjId);
        } else if (loadedProjects.length > 0) {
          setActiveProjectId(loadedProjects[0].id);
        }
        
        setFetchingProjects(false);
        setIsInitialized(true); 
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && isInitialized && !fetchingProjects) {
      setIsSaving(true);
      storageService.saveProjects(user.id, projects).catch(err => {
        console.error("Autosave failed:", err);
        // Silently fail but log it for now, or optionally alert
      }).finally(() => {
        // Mock delay for smoother UI feedback
        setTimeout(() => setIsSaving(false), 800);
      });
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
    setIsBatchImporting(true);
    
    if (activeView === 'personas') {
      const newItems: Persona[] = selectedSectorKeys.map(key => {
        const [sIdx, rIdx] = key.split('-').map(Number);
        const s = suggestedSectors[sIdx];
        const r = s.targetRoles[rIdx];
        return { id: generateId(), name: s.sector, role: r.role, pains: 'Generazione in corso...', goals: 'Generazione in corso...' };
      });
      setPersonas(prev => [...prev, ...newItems]);
      
      // Completa in serie per evitare sovrapposizioni e gestire rate limits
      for (const item of newItems) {
        try {
          const details = await generateSinglePersonaDetails(brand, item.name, item.role || "Professionista", isProMode);
          setPersonas(prev => prev.map(x => x.id === item.id ? { ...x, pains: details.pains, goals: details.goals } : x));
        } catch (e) { handleGlobalError(e); }
      }
    } else if (activeView === 'pillars') {
      const newItems: Pillar[] = selectedSectorKeys.map(key => {
        const sIdx = Number(key);
        const s = suggestedSectors[sIdx];
        return { id: generateId(), title: `Target: ${s.sector}`, description: 'Generazione in corso...' };
      });
      setPillars(prev => [...prev, ...newItems]);
      
      for (const item of newItems) {
        try {
          const details = await generateSinglePillarDetails(brand, item.title, isProMode);
          setPillars(prev => prev.map(x => x.id === item.id ? { ...x, description: details.description } : x));
        } catch (e) { handleGlobalError(e); }
      }
    }

    setIsBatchImporting(false);
    setIsSectorsModalOpen(false);
    setSelectedSectorKeys([]);
  };

  if (isLILoading) return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white space-y-6 z-[200]">
      <Loader2 size={48} className="animate-spin text-blue-500" />
      <div className="text-center">
        <h2 className="text-2xl font-black">Connessione a LinkedIn...</h2>
        <p className="text-slate-400">Stiamo finalizzando l'autorizzazione del brand.</p>
      </div>
    </div>
  );

  if (!user) return <Auth onAuthSuccess={u => setUser(u)} />;

  return (
    <Layout 
      activeView={activeView} onViewChange={setActiveView} projects={projects}
      activeProjectId={activeProjectId} onProjectSelect={setActiveProjectId}
      onProjectAdd={() => { const p = createEmptyProject(user.id); setProjects([...projects, p]); setActiveProjectId(p.id); }}
      onProjectDelete={(id) => { 
        const p = projects.find(x => x.id === id);
        const isOwner = p?.userId === user.id;
        if(confirm(isOwner ? "Eliminare brand definitivamente?" : "Rimuovere questo brand condiviso dalla tua lista?")) { 
          const updated = projects.filter(x => x.id !== id); 
          setProjects(updated); 
          setActiveProjectId(updated.length > 0 ? updated[0].id : null); 
        } 
      }}
      onUpdateProjectBrandLogo={(pid, url) => setProjects(prev => prev.map(x => x.id === pid ? {...x, brand: {...x.brand, logoUrl: url}} : x))}
      onUpdateProjectBrandFavicon={(pid, url) => setProjects(prev => prev.map(x => x.id === pid ? {...x, brand: {...x.brand, faviconUrl: url}} : x))}
      user={user} onLogout={() => { authService.logout(); setUser(null); }}
      isSaving={isSaving}
    >
      {activeProject && (
        <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-10 pb-20">
          


          {activeView === 'knowledge' && (
            <BrandKBForm 
              data={brand} 
              onChange={setBrand} 
              isOwner={activeProject.userId === user.id}
              project={activeProject}
              onUpdateProject={(updated) => setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))}
              user={user}
            />
          )}
          
          {activeView === 'personas' && (
            <PersonasView 
              brand={brand} 
              personas={personas} 
              isProMode={isProMode} 
              onUpdatePersonas={setPersonas} 
              onGlobalError={handleGlobalError} 
              onSuggestSectors={handleSuggestSectors} 
            />
          )}

          {activeView === 'pillars' && (
            <PillarsView 
              brand={brand} 
              pillars={pillars} 
              isProMode={isProMode} 
              onUpdatePillars={setPillars} 
              onGlobalError={handleGlobalError} 
              onSuggestSectors={handleSuggestSectors} 
            />
          )}

          {activeView === 'suite_guidelines' && (
            <SuiteGuidelines brand={brand} onUpdateBrand={setBrand} />
          )}

          {activeView === 'settings' && user && (
        <UserSettings user={user} onUpdate={setUser} />
      )}

      {activeView === 'linkedin_benchmarking' && (
        <CompetitorRadar 
          brand={brand} 
          pillars={pillars} 
          isProMode={isProMode} 
          onUpdateBrand={setBrand} 
          onGlobalError={handleGlobalError} 
        />
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

          {activeView === 'admin_users' && user.role === 'admin' && (
            <AdminUsersView 
              projects={projects}
              onUpdateProject={async (p) => {
                await storageService.saveProject(p);
                setProjects(prev => prev.map(x => x.id === p.id ? p : x));
              }}
              onGlobalError={handleGlobalError}
            />
          )}
        </div>
      )}

      {/* Suggested Sectors Modal */}
        <SuggestedSectorsModal 
          isOpen={isSectorsModalOpen} 
          onClose={() => setIsSectorsModalOpen(false)}
          loading={sectorsLoading}
          isBatchImporting={isBatchImporting}
          sectors={suggestedSectors}
          selectedKeys={selectedSectorKeys}
          activeView={activeView}
          onToggleSelection={(key) => setSelectedSectorKeys(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])}
          onBatchImport={handleBatchImport}
          onAddCustomSector={(sector) => {
            setSuggestedSectors(prev => {
              const newIdx = prev.length;
              setSelectedSectorKeys(keys => [...keys, activeView === 'personas' ? `${newIdx}-0` : `${newIdx}`]);
              return [...prev, sector];
            });
          }}
        />

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