
import React, { useState } from 'react';
import { BrandKB, CalendarPost, Persona, Pillar } from '../types';
import { generatePostContent, generateDeepVisualPrompt } from '../services/geminiService';
import { 
  Copy, Check, Loader2, Sparkles, Pencil, CheckCircle2, 
  Save, Palette, FileText, Link2, Linkedin, Mail, Newspaper, Target,
  Trash2
} from 'lucide-react';

interface Props {
  brand: BrandKB;
  post: CalendarPost;
  persona?: Persona;
  pillar?: Pillar;
  onUpdate: (updatedPost: CalendarPost) => void;
  isProMode: boolean;
  onGlobalError: (error: any) => void;
}

const PostCreator: React.FC<Props> = ({ brand, post, persona, pillar, onUpdate, isProMode, onGlobalError }) => {
  const [loading, setLoading] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isPublished = post.status === 'published';
  const platformBtn = post.platform === 'newsletter' ? 'bg-purple-600' : 'bg-blue-600';

  const handleCreate = async () => {
    setLoading(true);
    try {
      const result = await generatePostContent(brand, post, persona, pillar, isProMode);
      onUpdate({ ...post, fullContent: result.text, sources: result.sources, status: 'drafted' });
    } catch (e: any) { 
      onGlobalError(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleGenerateAndCopyPrompt = async () => {
    let currentPrompt = post.mediaPrompt;
    
    try {
      if (!currentPrompt) {
        setLoadingPrompt(true);
        currentPrompt = await generateDeepVisualPrompt(post, brand, isProMode);
        onUpdate({ ...post, mediaPrompt: currentPrompt });
      }

      if (currentPrompt) {
        // La copia avviene subito dopo l'assegnazione o il recupero
        await navigator.clipboard.writeText(currentPrompt);
        setPromptCopied(true);
        setTimeout(() => setPromptCopied(false), 2000);
      }
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        alert("Permesso negato per gli appunti. Assicurati di aver dato il consenso al browser.");
      } else {
        onGlobalError(e);
      }
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleTogglePublished = () => onUpdate({ ...post, status: isPublished ? 'drafted' : 'published' });
  const handleCopy = () => { if (post.fullContent) { navigator.clipboard.writeText(post.fullContent); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  
  const formattedDate = new Date(post.scheduledDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

  const getIcon = () => {
    if (post.contentType === 'article') return <FileText size={14} />;
    if (post.contentType === 'linkedin_newsletter') return <Newspaper size={14} />;
    return post.platform === 'newsletter' ? <Mail size={14} /> : <Linkedin size={14} />;
  };

  return (
    <div className={`bg-white border rounded-[1.5rem] overflow-hidden shadow-sm flex flex-col h-full transition-all group ${isPublished ? 'border-emerald-200' : 'border-slate-100 hover:border-blue-100'}`}>
      
      {/* HEADER MINIMALISTA E FUNZIONALE */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isPublished ? 'bg-emerald-50/20' : 'bg-slate-50/20'}`}>
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            {getIcon()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 leading-none mb-0.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{formattedDate}</span>
              <span className="text-[7px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                {post.contentType.replace(/_/g, ' ')}
              </span>
            </div>
            <h4 className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tight">{post.pillar}</h4>
          </div>
        </div>
        
        {/* PULSANTI OPERATIVI SEMPRE VISIBILI E PULITI */}
        <div className="flex items-center space-x-1 shrink-0 ml-2">
          {!post.fullContent && (
            <button 
              onClick={handleCreate} 
              disabled={loading} 
              title="Genera Contenuto"
              className={`w-7 h-7 text-white rounded-md flex items-center justify-center transition-all ${platformBtn} hover:brightness-110 disabled:opacity-30`}
            >
              {loading ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
            </button>
          )}
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            title="Modifica"
            className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all ${isEditing ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-300 hover:text-blue-600 hover:border-blue-200'}`}
          >
            {isEditing ? <Save size={14} /> : <Pencil size={14} />}
          </button>
          <button 
            onClick={handleTogglePublished} 
            title={isPublished ? "Ripristina" : "Marca come Pubblicato"}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${isPublished ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-300 hover:text-emerald-500 hover:border-emerald-200'}`}
          >
            <CheckCircle2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col space-y-4">
        {isEditing ? (
          <div className="flex-1 flex flex-col space-y-3">
            <textarea 
              value={post.fullContent || ""} 
              onChange={(e) => onUpdate({ ...post, fullContent: e.target.value })} 
              className="flex-1 w-full text-[11px] font-medium border border-slate-100 rounded-xl p-4 bg-slate-50 focus:bg-white focus:border-blue-300 outline-none resize-none leading-relaxed transition-all min-h-[150px]" 
              placeholder="Contenuto del post..." 
            />
            <button 
              onClick={() => setIsEditing(false)} 
              className={`w-full py-2.5 text-white rounded-xl text-[9px] font-black uppercase tracking-widest ${platformBtn}`}
            >
              Conferma Modifiche
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="space-y-1 border-l-2 border-slate-900 pl-3 py-0.5 mb-4">
              <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5 tracking-tight">
                <Target size={10} /> {post.persona}
              </span>
              <p className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-2">{post.hook}</p>
            </div>
            
            {post.fullContent ? (
              <div className="relative group/text mb-4">
                <div className="text-[11px] p-4 rounded-xl border border-slate-50 bg-slate-50/30 whitespace-pre-wrap leading-relaxed font-medium max-h-40 overflow-y-auto no-scrollbar text-slate-600">
                  {post.fullContent}
                </div>
                <button 
                  onClick={handleCopy} 
                  className="absolute top-2 right-2 p-1.5 bg-white rounded-lg border border-slate-100 shadow-sm opacity-0 group-hover/text:opacity-100 transition-all hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-50 rounded-2xl bg-slate-50/10 mb-4">
                 <p className="text-[9px] font-bold text-slate-300 italic uppercase tracking-widest">Contenuto in attesa</p>
              </div>
            )}

            {/* BOTTONE PROMPT GRAFICA: GENERA E COPIA AUTOMATICAMENTE, MAI TESTO VISIBILE */}
            <div className="mt-auto">
              <button 
                onClick={handleGenerateAndCopyPrompt}
                disabled={loadingPrompt}
                className={`w-full py-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 flex items-center justify-center space-x-2 transition-all shadow-sm ${promptCopied ? 'border-emerald-200 bg-emerald-50' : 'active:scale-95'}`}
              >
                {loadingPrompt ? (
                  <Loader2 size={12} className="animate-spin text-slate-400" />
                ) : promptCopied ? (
                  <Check size={12} className="text-emerald-600" />
                ) : (
                  <Palette size={12} className="text-blue-500" />
                )}
                <span className={`text-[10px] font-black uppercase tracking-tight ${promptCopied ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {loadingPrompt ? "Generazione..." : promptCopied ? "Prompt Copiato!" : "Prompt Grafica AI"}
                </span>
              </button>
            </div>

            {post.sources && post.sources.length > 0 && !isEditing && (
              <div className="pt-3 mt-3 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  <Link2 size={10} /> <span>Fonti</span>
                </div>
                <a href={post.sources[0].uri} target="_blank" rel="noopener noreferrer" className="text-[8px] text-blue-500 hover:underline truncate max-w-[120px] font-bold"> 
                  {post.sources[0].title}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCreator;
