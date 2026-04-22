
import React, { useState, useRef } from 'react';
import { BrandKB, CustomPost, Platform } from '../types';
import { refineCustomPost, analyzeImageAndGeneratePost } from '../services/geminiService';
// Added ExternalLink and Link2 for sources display
import { Sparkles, Loader2, Copy, Check, Camera, Send, Linkedin, Mail, ExternalLink, Link2 } from 'lucide-react';

interface Props {
  brand: BrandKB;
  platform: Platform;
  /* Fix: Added missing props passed from App.tsx */
  isProMode: boolean;
  onGlobalError: (error: any) => void;
}

const ContentCustom: React.FC<Props> = ({ brand, platform, isProMode, onGlobalError }) => {
  const [post, setPost] = useState<CustomPost>({ platform, objective: '', baseText: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRefine = async () => {
    if (!post.objective || !post.baseText) return;
    setLoading(true);
    setError(null);
    try {
      let result;
      if (imageBase64 && imageMime) {
        /* Fix: Pass isProMode to analyzeImageAndGeneratePost */
        result = await analyzeImageAndGeneratePost(imageBase64, imageMime, post.baseText, brand, platform, isProMode);
      } else {
        /* Fix: Pass isProMode to refineCustomPost */
        result = await refineCustomPost(brand, platform, post.objective, post.baseText, isProMode);
      }
      setPost({ ...post, fullContent: result.text, sources: result.sources });
    } catch (e: any) { 
      /* Fix: Forward error to global handler and update local state */
      onGlobalError(e);
      setError("Errore generazione."); 
    }
    finally { setLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className={`p-3 rounded-2xl text-white ${platform === 'linkedin' ? 'bg-blue-600' : 'bg-purple-600'}`}>
            {platform === 'linkedin' ? <Linkedin size={20} /> : <Mail size={20} />}
          </div>
          <h3 className="text-xl font-black text-slate-900">Custom Content Creator</h3>
        </div>

        <input value={post.objective} onChange={e => setPost({...post, objective: e.target.value})} placeholder="Obiettivo specifico..." className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none" />
        
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

        <textarea value={post.baseText} onChange={e => setPost({...post, baseText: e.target.value})} rows={6} placeholder="Scrivi qui la tua idea grezza o i dati del case study..." className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none text-sm font-medium" />

        <button onClick={handleRefine} disabled={loading || !post.baseText} className={`w-full py-4 text-white rounded-2xl font-black flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 transition-all ${platform === 'linkedin' ? 'bg-blue-600' : 'bg-purple-600'}`}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          <span>{loading ? 'Generazione in corso...' : 'Genera con AI Master'}</span>
        </button>
        {error && <div className="text-red-500 text-xs font-bold text-center mt-2">{error}</div>}
      </div>

      <div className="flex flex-col">
        {post.fullContent ? (
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative shadow-2xl flex-1 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Preview Ottimizzata</span>
              <button onClick={() => { navigator.clipboard.writeText(post.fullContent!); setCopied(true); setTimeout(()=>setCopied(false), 2000); }} className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap overflow-y-auto no-scrollbar flex-1 mb-6">
              {post.fullContent}
            </div>

            {/* Added display for grounding sources as required by Gemini API guidelines */}
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
            <Send size={40} className="opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">L'anteprima apparirà qui</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentCustom;
