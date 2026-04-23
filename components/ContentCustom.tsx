
import React, { useState, useRef } from 'react';
import { BrandKB, CustomPost, Platform, ContentType } from '../types';
import { refineCustomPost, analyzeImageAndGeneratePost, suggestObjectives } from '../services/geminiService';
import { 
  Sparkles, Loader2, Copy, Check, Camera, Send, Linkedin, 
  Mail, ExternalLink, Link2, Wand2, FileText, Layout
} from 'lucide-react';

interface Props {
  brand: BrandKB;
  platform: Platform;
  isProMode: boolean;
  onGlobalError: (error: any) => void;
}

const ContentCustom: React.FC<Props> = ({ brand, platform, isProMode, onGlobalError }) => {
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-2xl text-white ${platform === 'linkedin' ? 'bg-blue-600' : 'bg-purple-600'}`}>
              {platform === 'linkedin' ? <Linkedin size={20} /> : <Mail size={20} />}
            </div>
            <h3 className="text-xl font-black text-slate-900">Custom Content Creator</h3>
          </div>
          
          {platform === 'linkedin' && (
            <div className="flex bg-slate-100 p-1 rounded-xl">
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

        <div className="space-y-3">
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
            className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold focus:bg-white focus:border-blue-500 transition-all" 
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
        
        <div onClick={() => fileInputRef.current?.click()} className="relative cursor-pointer border-2 border-dashed border-slate-200 rounded-[2rem] h-48 flex items-center justify-center overflow-hidden hover:bg-slate-50 transition-all">
          {imagePreview ? (
            <img src={imagePreview} className="w-full h-full object-cover" alt="Upload" />
          ) : (
            <div className="text-center text-slate-400">
              <Camera size={24} className="mx-auto mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Allega Immagine (Opzionale)</p>
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

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Contenuto Grezzo / Note</label>
          <textarea 
            value={post.baseText} 
            onChange={e => setPost({...post, baseText: e.target.value})} 
            rows={6} 
            placeholder="Scrivi qui la tua idea grezza, i dati del case study o i punti chiave..." 
            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none text-sm font-medium focus:bg-white focus:border-blue-500 transition-all" 
          />
        </div>

        <button 
          onClick={handleRefine} 
          disabled={loading || !post.baseText || !post.objective} 
          className={`w-full py-4 text-white rounded-2xl font-black flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 transition-all ${platform === 'linkedin' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          <span>{loading ? 'Generazione in corso...' : `Genera ${post.contentType === 'article' ? 'Articolo' : 'Post'}`}</span>
        </button>
        {error && <div className="text-red-500 text-[10px] font-black text-center mt-2 uppercase tracking-widest">{error}</div>}
      </div>

      <div className="flex flex-col">
        {post.fullContent ? (
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative shadow-2xl flex-1 flex flex-col h-full ring-1 ring-white/10">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  Preview {post.contentType === 'article' ? 'Articolo' : 'Post'}
                </span>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(post.fullContent!); setCopied(true); setTimeout(()=>setCopied(false), 2000); }} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap overflow-y-auto no-scrollbar flex-1 mb-6 pr-2">
              {post.fullContent}
            </div>

            {post.sources && post.sources.length > 0 && (
              <div className="mt-auto p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center">
                  <Link2 size={10} className="mr-1" /> Fonti e Verifiche Reali
                </p>
                <div className="space-y-1">
                  {post.sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-300 hover:text-white hover:underline flex items-center group transition-colors"
                    >
                      <ExternalLink size={10} className="mr-1.5 opacity-50 group-hover:opacity-100" />
                      <span className="truncate">{source.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center text-slate-400 space-y-4">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-100">
              <Send size={32} className="opacity-20" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest">L'anteprima apparirà qui</p>
              <p className="text-[10px] font-medium mt-1">Definisci obiettivo e testo per iniziare.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentCustom;
