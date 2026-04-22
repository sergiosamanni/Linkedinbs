import React, { useState } from 'react';
import { BrandKB, Pillar } from '../types';
import { Loader2, Zap, Search, Linkedin, BookOpen, X, Check, TrendingUp, Activity, FileText } from 'lucide-react';
import { analyzeCompetitors } from '../services/geminiService';

interface Props {
  brand: BrandKB;
  pillars: Pillar[];
  isProMode: boolean;
  onUpdateBrand: (updater: BrandKB | ((prev: BrandKB) => BrandKB)) => void;
  onGlobalError: (error: any) => void;
}

const CompetitorRadar: React.FC<Props> = ({ brand, pillars, isProMode, onUpdateBrand, onGlobalError }) => {
  const [analyzingPosts, setAnalyzingPosts] = useState(false);
  const [analyzingArticles, setAnalyzingArticles] = useState(false);
  const [newPostComp, setNewPostComp] = useState("");
  const [newArticleComp, setNewArticleComp] = useState("");

  const handleAddCompetitorPostLinks = () => {
    if (!newPostComp) return;
    const links = newPostComp.split(/[\n,\s]+/).map(l => l.trim()).filter(l => l.length > 0);
    onUpdateBrand(prev => ({ ...prev, competitorPostLinks: Array.from(new Set([...(prev.competitorPostLinks || []), ...links])) }));
    setNewPostComp("");
  };

  const handleAddCompetitorArticleLinks = () => {
    if (!newArticleComp) return;
    const links = newArticleComp.split(/[\n,\s]+/).map(l => l.trim()).filter(l => l.length > 0);
    onUpdateBrand(prev => ({ ...prev, competitorArticleLinks: Array.from(new Set([...(prev.competitorArticleLinks || []), ...links])) }));
    setNewArticleComp("");
  };

  const handleAnalyzePosts = async () => {
    if (!brand.competitorPostLinks || brand.competitorPostLinks.length === 0) return;
    setAnalyzingPosts(true);
    try {
      const insights = await analyzeCompetitors(brand.competitorPostLinks, 'linkedin', brand, pillars, isProMode);
      onUpdateBrand(prev => ({ ...prev, competitorPostInsights: insights }));
    } catch (e: any) { onGlobalError(e); }
    finally { setAnalyzingPosts(false); }
  };

  const handleAnalyzeArticles = async () => {
    if (!brand.competitorArticleLinks || brand.competitorArticleLinks.length === 0) return;
    setAnalyzingArticles(true);
    try {
      const insights = await analyzeCompetitors(brand.competitorArticleLinks, 'blog', brand, pillars, isProMode);
      onUpdateBrand(prev => ({ ...prev, competitorArticleInsights: insights }));
    } catch (e: any) { onGlobalError(e); }
    finally { setAnalyzingArticles(false); }
  };

  return (
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
            <span>{analyzingPosts ? 'Analisi in corso...' : 'Analizza Posts LinkedIn'}</span>
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
                <button onClick={() => onUpdateBrand(prev => ({...prev, competitorPostLinks: prev.competitorPostLinks?.filter(x => x !== c)}))} className="text-blue-300 hover:text-rose-500"><X size={12} /></button>
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
                        <Check size={12} className="text-blue-500 mt-1 shrink-0" />
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
            <span>{analyzingArticles ? 'Analisi in corso...' : 'Analizza Blog Competitor'}</span>
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
                <button onClick={() => onUpdateBrand(prev => ({...prev, competitorArticleLinks: prev.competitorArticleLinks?.filter(x => x !== c)}))} className="text-purple-300 hover:text-rose-500"><X size={12} /></button>
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
  );
};

export default CompetitorRadar;
