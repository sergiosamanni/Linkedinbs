import React, { useState, useRef } from 'react';
import { BrandKB, CustomPost, Platform, ContentType, BrandFile } from '../types';
import { refineCustomPost, analyzeImageAndGeneratePost, suggestObjectives, queryBrandBrain } from '../services/geminiService';
import { 
  Sparkles, Loader2, Copy, Check, Camera, Send, Linkedin, 
  Mail, ExternalLink, Link2, Wand2, FileText, Layout, Brain, Search, MessageSquare, BookOpen, Plus
} from 'lucide-react';

interface Props {
  brand: BrandKB;
  platform: Platform;
  isProMode: boolean;
  onGlobalError: (error: any) => void;
}

const ContentCustom: React.FC<Props> = ({ brand, platform, isProMode, onGlobalError }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'brain'>('create');
  const [post, setPost] = useState<CustomPost>({ 
    platform, 
    contentType: platform === 'linkedin' ? 'post' : 'email',
    objective: '', 
    baseText: '' 
  });
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestedObjectives, setSuggestedObjectives] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Brand Brain State
  const [brainQuery, setBrainQuery] = useState('');
  const [brainLoading, setBrainLoading] = useState(false);
  const [brainResponse, setBrainResponse] = useState<string | null>(null);

  const handleSuggestObjectives = async () => {
    setSuggesting(true);
    try {
      const suggestions = await suggestObjectives(brand, platform, post.contentType, isProMode);
      setSuggestedObjectives(suggestions);
    } catch (e) {
      onGlobalError(e);
    } finally {
      setSuggesting(false);
    }
  };

  const handleBrainQuery = async () => {
    if (!brainQuery || !brand.files?.length) return;
    setBrainLoading(true);
    try {
      const result = await queryBrandBrain(brainQuery, brand.files, isProMode);
      setBrainResponse(result.text);
    } catch (e) {
      onGlobalError(e);
    } finally {
      setBrainLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!post.objective || !post.baseText) return;
    setLoading(true);
    setError(null);
    try {
      let result;
      if (imageBase64 && imageMime) {
        result = await analyzeImageAndGeneratePost(imageBase64, imageMime, post.baseText, brand, platform, isProMode);
      } else {
        result = await refineCustomPost(brand, platform, post.contentType, post.objective, post.baseText, isProMode);
      }
      setPost({ ...post, fullContent: result.text, sources: result.sources });
    } catch (e: any) { 
      onGlobalError(e);
      setError("Errore generazione."); 
    }
    finally { setLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto h-[calc(100vh-200px)]">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
          <button 
            onClick={() => setActiveTab('create')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Sparkles size={14} />
            <span>Creazione</span>
          </button>
          <button 
            onClick={() => setActiveTab('brain')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'brain' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Brain size={14} />
            <span>Brand Brain</span>
          </button>
        </div>

        {activeTab === 'create' ? (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pr-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-2xl text-white ${platform === 'linkedin' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                  {platform === 'linkedin' ? <Linkedin size={20} /> : <Mail size={20} />}
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Content Creator</h3>
              </div>
              
              {platform === 'linkedin' && (
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                  <button 
                    onClick={() => setPost({...post, contentType: 'post'})}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${post.contentType === 'post' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    Post
                  </button>
                  <button 
                    onClick={() => setPost({...post, contentType: 'article'})}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${post.contentType === 'article' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    Articolo
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Obiettivo Strategico</label>
                <button 
                  onClick={handleSuggestObjectives}
                  disabled={suggesting}
                  className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center space-x-1 hover:text-blue-700 disabled:opacity-50"
                >
                  {suggesting ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                  <span>Suggerisci con AI</span>
                </button>
              </div>
              
              <input 
                value={post.objective} 
                onChange={e => setPost({...post, objective: e.target.value})} 
                placeholder="Esempio: Posizionamento come esperto di AI..." 
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-blue-500 transition-all shadow-sm" 
              />

              {suggestedObjectives.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                  {suggestedObjectives.map((obj, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        setPost({...post, objective: obj});
                        setSuggestedObjectives([]);
                      }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      {obj}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div onClick={() => fileInputRef.current?.click()} className="relative cursor-pointer border-2 border-dashed border-slate-200 rounded-[2.5rem] h-48 flex items-center justify-center overflow-hidden hover:bg-slate-50 transition-all bg-slate-50/30 group">
              {imagePreview ? (
                <img src={imagePreview} className="w-full h-full object-cover" alt="Upload" />
              ) : (
                <div className="text-center text-slate-400 group-hover:scale-110 transition-transform">
                  <Camera size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Aggiungi Visual (Opzionale)</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={e => {
                const file = e.target.files?.[0];
                if(file) {
                  const reader = new FileReader();
                  reader.onloadend = () => { setImagePreview(reader.result as string); setImageBase64((reader.result as string).split(',')[1]); setImageMime(file.type); };
                  reader.readAsDataURL(file);
                }
              }} />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ideazione e Dati Grezzi</label>
              <textarea 
                value={post.baseText} 
                onChange={e => setPost({...post, baseText: e.target.value})} 
                rows={8} 
                placeholder="Incolla qui i tuoi appunti o i dati su cui vuoi costruire il post..." 
                className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[2.5rem] outline-none text-sm font-medium focus:bg-white focus:border-blue-500 transition-all shadow-sm leading-relaxed" 
              />
            </div>

            <button 
              onClick={handleRefine} 
              disabled={loading || !post.baseText || !post.objective} 
              className={`w-full py-5 text-white rounded-[1.5rem] font-black flex items-center justify-center space-x-3 shadow-xl shadow-blue-100 disabled:opacity-50 transition-all active:scale-[0.98] ${platform === 'linkedin' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
              <span className="text-[13px] uppercase tracking-widest">Genera {post.contentType === 'article' ? 'Articolo' : 'Post'} Strategico</span>
            </button>
            {error && <div className="text-red-500 text-[10px] font-black text-center mt-2 uppercase tracking-widest">{error}</div>}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden space-y-6">
            <div className="space-y-2">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center">
                <Brain size={16} className="mr-2 text-blue-500" /> Ricerca nel Knowledge Vault
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">Interroga i tuoi PDF, report e documenti caricati per estrarre dati reali.</p>
            </div>

            {!brand.files?.length ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200 p-10 text-center space-y-4">
                <BookOpen size={40} className="text-slate-200" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Il Vault è vuoto</p>
                <p className="text-[10px] text-slate-400">Carica i tuoi documenti nella Knowledge Base per attivare il Brain.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
                  {brainResponse ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6 animate-in zoom-in-95 duration-300">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                          <Brain size={16} />
                        </div>
                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Analisi Brand Brain</span>
                      </div>
                      <div className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                        {brainResponse}
                      </div>
                      <button 
                        onClick={() => {
                          setPost({...post, baseText: (post.baseText + "\n\nDATI DAL BRAIN:\n" + brainResponse).trim()});
                          setActiveTab('create');
                        }}
                        className="mt-6 flex items-center space-x-2 px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        <Plus size={14} className="mr-1" /> Usa come base per il post
                      </button>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                        <MessageSquare size={32} className="text-slate-200" />
                      </div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fai una domanda ai tuoi dati</p>
                      <p className="text-[10px] text-slate-400">L'AI leggerà i tuoi {brand.files.length} file per risponderti.</p>
                    </div>
                  )}
                </div>

                <div className="p-2 bg-slate-900 rounded-[2rem] shadow-2xl">
                  <div className="flex items-center p-2">
                    <textarea 
                      value={brainQuery}
                      onChange={(e) => setBrainQuery(e.target.value)}
                      placeholder="Chiedi qualcosa ai tuoi documenti..."
                      rows={1}
                      className="flex-1 bg-transparent border-none text-white text-xs font-medium placeholder:text-slate-500 focus:ring-0 resize-none px-4 py-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleBrainQuery();
                        }
                      }}
                    />
                    <button 
                      onClick={handleBrainQuery}
                      disabled={brainLoading || !brainQuery}
                      className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg"
                    >
                      {brainLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col h-full">
        {post.fullContent ? (
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative shadow-2xl flex-1 flex flex-col overflow-hidden ring-1 ring-white/10">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-3">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] px-3 py-1.5 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-inner">
                  Preview Ottimizzata
                </span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {post.contentType === 'article' ? 'Articolo LinkedIn' : 'Post LinkedIn'}
                </span>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(post.fullContent!); setCopied(true); setTimeout(()=>setCopied(false), 2000); }} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all active:scale-90">
                {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
              </button>
            </div>
            
            <div className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap overflow-y-auto no-scrollbar flex-1 mb-8 pr-2 custom-scrollbar">
              {post.fullContent}
            </div>

            {post.sources && post.sources.length > 0 && (
              <div className="mt-auto p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 flex items-center">
                  <Link2 size={12} className="mr-2" /> Grounding: Fonti Verificate
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {post.sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-white/5 rounded-xl text-[11px] text-blue-300 hover:text-white hover:bg-white/10 flex items-center group transition-all border border-transparent hover:border-blue-500/30"
                    >
                      <ExternalLink size={12} className="mr-2.5 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                      <span className="truncate font-bold">{source.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-16 text-center space-y-6">
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-slate-200 border border-slate-100 animate-pulse">
              <Send size={40} className="text-slate-200" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Ready for Generation</p>
              <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                Usa il <b>Brand Brain</b> per estrarre dati dai documenti o scrivi direttamente la tua idea a sinistra.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentCustom;
