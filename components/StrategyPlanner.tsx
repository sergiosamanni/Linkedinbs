
import React, { useState, useEffect, useMemo } from 'react';
import { BrandKB, Persona, Pillar, MonthlyStrategy, CalendarPost, Platform } from '../types';
import { generateMonthlyStrategy, suggestStrategyObjectives } from '../services/geminiService';
import { 
  Sparkles, Loader2, Zap, Linkedin, Mail, Trash2, 
  Target, Activity, History, ChevronRight, ChevronDown, 
  Plus, CheckCircle2, Archive, Calendar
} from 'lucide-react';

interface Props {
  brand: BrandKB;
  personas: Persona[];
  pillars: Pillar[];
  platform: Platform;
  strategies: MonthlyStrategy[];
  onStrategyAdded: (strategy: MonthlyStrategy) => void;
  onStrategyDeleted: (id: string) => void;
  onStrategyUpdated: (strategy: MonthlyStrategy) => void;
  onUpdateBrand: (brand: BrandKB) => void;
  isProMode: boolean;
  onGlobalError: (error: any) => void;
}

const StrategyPlanner: React.FC<Props> = ({ brand, personas, pillars, platform, strategies, onStrategyAdded, onStrategyDeleted, onStrategyUpdated, onUpdateBrand, isProMode, onGlobalError }) => {
  const [objective, setObjective] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [suggestedObjectives, setSuggestedObjectives] = useState<string[]>([]);
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({ [new Date().getFullYear()]: true });

  const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  const shortMonths = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUGL", "AGO", "SET", "OTT", "NOV", "DIC"];

  const strategiesByYear = useMemo(() => {
    const map: Record<number, MonthlyStrategy[]> = {};
    strategies.forEach(s => {
      if (!map[s.year]) map[s.year] = [];
      map[s.year].push(s);
    });
    return map;
  }, [strategies]);

  const yearsInArchive = useMemo(() => Object.keys(strategiesByYear).map(Number).sort((a,b) => b-a), [strategiesByYear]);

  useEffect(() => {
    if (brand.name) {
      suggestStrategyObjectives(brand, platform, isProMode).then(setSuggestedObjectives);
    }
  }, [brand.name, platform, isProMode]);

  const handleGeneratePlan = async () => {
    if (!objective || personas.length === 0 || pillars.length === 0) return alert("Dati mancanti.");
    setLoading(true);
    
    const sortedStrategies = [...strategies].sort((a,b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    
    const platformStrategies = sortedStrategies.filter(s => s.platform === platform);
    const lastStrategy = platformStrategies[platformStrategies.length - 1];

    try {
      const strategy = await generateMonthlyStrategy(
        brand, personas, pillars, platform, objective, counts, 
        selectedMonth, selectedYear, lastStrategy, isProMode
      );
      onStrategyAdded(strategy);
      
      // Reset objective
      setObjective("");
      
      // Espandi l'anno se non lo è
      setExpandedYears(prev => ({ ...prev, [selectedYear]: true }));

      // AVANZAMENTO AUTOMATICO AL MESE SUCCESSIVO
      const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
      const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
      
      setSelectedMonth(nextMonth);
      setSelectedYear(nextYear);

    } catch (e) { onGlobalError(e); }
    finally { setLoading(false); }
  };

  const [counts, setCounts] = useState<Record<string, number>>({
    post: platform === 'linkedin' ? 12 : 0,
    article: 0,
    linkedin_newsletter: 0,
    email: platform === 'newsletter' ? 4 : 0
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      
      {/* 1. ROADMAP ANNUALE A PALLINI */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
           <div className="flex items-center space-x-3">
             <div className="p-2 bg-slate-900 text-white rounded-lg"><Calendar size={18} /></div>
             <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Roadmap Strategica Annuale</h3>
           </div>
        </div>

        {yearsInArchive.length > 0 ? (
          yearsInArchive.map(year => (
            <div key={year} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-6">
                  <span className="text-2xl font-black text-slate-900">{year}</span>
                  <div className="flex items-center space-x-2">
                    {shortMonths.map((m, idx) => {
                      const hasStrategy = (strategiesByYear[year] || []).some(s => s.month === idx);
                      return (
                        <div key={idx} className="flex flex-col items-center space-y-2">
                          <div 
                            title={months[idx]}
                            className={`w-4 h-4 rounded-full border-2 transition-all ${
                              hasStrategy 
                                ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-200' 
                                : 'bg-white border-slate-200'
                            }`}
                          />
                          <span className="text-[7px] font-black text-slate-400">{m}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button 
                  onClick={() => setExpandedYears(prev => ({...prev, [year]: !prev[year]}))}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase flex items-center space-x-2 text-slate-600 transition-colors"
                >
                  {expandedYears[year] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>{expandedYears[year] ? 'Nascondi Dettagli' : 'Mostra Dettagli'}</span>
                </button>
              </div>

              {expandedYears[year] && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/20">
                  {strategiesByYear[year].sort((a,b) => a.month - b.month).map(s => (
                    <div key={s.id} className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">{months[s.month]}</span>
                        <button onClick={() => onStrategyDeleted(s.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                      </div>
                      <p className="text-xs font-bold text-slate-800 leading-snug mb-4 line-clamp-3">{s.objective}</p>
                      <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{s.posts.length} Contenuti</span>
                        <div className="flex -space-x-1">
                          {Array.from(new Set(s.posts.map(p => p.contentType))).map((type, i) => (
                            <div key={i} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm ${
                              (type as string) === 'post' ? 'bg-blue-500' : 
                              (type as string) === 'article' ? 'bg-emerald-500' : 
                              (type as string) === 'email' ? 'bg-amber-500' : 'bg-indigo-500'
                            }`}>
                              {(type as string).charAt(0).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-[2.5rem] space-y-3">
            <History size={40} className="mx-auto text-slate-200" />
            <p className="text-sm font-bold text-slate-400 italic">Inizia a generare strategie per popolare la roadmap.</p>
          </div>
        )}
      </section>

      {/* 2. PIANIFICATORE MENSILE */}
      <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-sm space-y-10">
        <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
          <div className={`p-4 rounded-3xl text-white shadow-xl ${platform === 'linkedin' ? 'bg-blue-600' : 'bg-purple-600'}`}>
            {platform === 'linkedin' ? <Linkedin size={24} /> : <Mail size={24} />}
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Configuratore Mensile</h3>
            <p className="text-sm text-slate-500 font-medium">Imposta gli obiettivi e i volumi per il mese selezionato.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center space-x-2">
                <Target size={12} className="text-blue-600" />
                <span>Focus Strategico</span>
              </label>
              <textarea 
                value={objective} 
                onChange={e => setObjective(e.target.value)} 
                placeholder="Definisci l'obiettivo principale del mese..." 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all min-h-[120px] resize-none" 
              />
              <div className="flex flex-wrap gap-2">
                {suggestedObjectives.map((o, i) => (
                  <button key={i} onClick={() => setObjective(o)} className="px-3 py-1.5 bg-slate-100 text-[9px] font-black text-slate-600 rounded-xl hover:bg-slate-200 transition-colors uppercase">{o}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mese</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black uppercase outline-none">
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Anno</label>
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black outline-none">
                  <option value={2025}>2025</option><option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 space-y-6 flex flex-col">
            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Pianificazione Volumi</h4>
            <div className="flex-1 space-y-3">
              {Object.keys(counts).map(type => {
                if (platform === 'newsletter' && type !== 'email') return null;
                if (platform === 'linkedin' && type === 'email') return null;
                return (
                  <div key={type} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-700 uppercase">{type.replace('_', ' ')}</span>
                    <div className="flex items-center space-x-3">
                      <button onClick={() => setCounts({...counts, [type]: Math.max(0, counts[type] - 1)})} className="w-8 h-8 flex items-center justify-center font-black text-slate-300 hover:text-slate-900 transition-colors">-</button>
                      <span className="text-sm font-black text-slate-900 w-6 text-center">{counts[type]}</span>
                      <button onClick={() => setCounts({...counts, [type]: counts[type] + 1})} className="w-8 h-8 flex items-center justify-center font-black text-slate-300 hover:text-slate-900 transition-colors">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-400 font-medium italic leading-relaxed pt-4 border-t border-slate-100">
              L'AI distribuirà questi {(Object.values(counts) as number[]).reduce((a,b)=>a+b,0)} contenuti nel calendario basandosi sui dati del brand.
            </p>
          </div>
        </div>

        <button 
          onClick={handleGeneratePlan} 
          disabled={loading} 
          className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center space-x-4 shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} fill="currentColor" />}
          <span>Genera Strategia Mensile</span>
        </button>
      </section>
    </div>
  );
};

export default StrategyPlanner;
