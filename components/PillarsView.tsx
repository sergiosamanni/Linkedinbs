import React, { useState } from 'react';
import { BrandKB, Pillar } from '../types';
import { Plus, Sparkles, Loader2, Wand2, Trash2, Factory } from 'lucide-react';
import { suggestPillars, generateSinglePillarDetails } from '../services/geminiService';

interface Props {
  brand: BrandKB;
  pillars: Pillar[];
  isProMode: boolean;
  onUpdatePillars: (updater: Pillar[] | ((prev: Pillar[]) => Pillar[])) => void;
  onGlobalError: (error: any) => void;
  onSuggestSectors: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const PillarsView: React.FC<Props> = ({ brand, pillars, isProMode, onUpdatePillars, onGlobalError, onSuggestSectors }) => {
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [completingPillarId, setCompletingPillarId] = useState<string | null>(null);

  const handleCompletePillar = async (p: Pillar) => {
    if (!p.title) return;
    setCompletingPillarId(p.id);
    try {
      const details = await generateSinglePillarDetails(brand, p.title, isProMode);
      onUpdatePillars(prev => prev.map(x => x.id === p.id ? { ...x, description: details.description } : x));
    } catch (e) { onGlobalError(e); }
    finally { setCompletingPillarId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h3 className="text-xl font-black text-slate-900">Content Pillars</h3>
          <p className="text-xs text-slate-500 mt-1">I pilastri tematici della strategia.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onSuggestSectors} className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-black uppercase flex items-center space-x-2 hover:bg-blue-100 transition-all"><Factory size={14} /> <span>Suggerisci Settori</span></button>
          <button onClick={() => onUpdatePillars(prev => [...prev, { id: generateId(), title: '', description: '' }])} className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black uppercase flex items-center space-x-2"><Plus size={14} /> <span>Aggiungi Manuale</span></button>
          <button 
            onClick={async () => { 
                setLoadingSuggestions(true); 
                try { 
                    const s = await suggestPillars(brand, isProMode); 
                    onUpdatePillars(prev => [...prev, ...s]); 
                } catch(e) { onGlobalError(e); } 
                finally { setLoadingSuggestions(false); } 
            }} 
            disabled={loadingSuggestions} 
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase flex items-center space-x-2 shadow-lg"
          >
            {loadingSuggestions ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Genera Pilastri AI</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pillars.map(p => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <input value={p.title} onChange={e => onUpdatePillars(prev => prev.map(x => x.id === p.id ? {...x, title: e.target.value} : x))} className="text-md font-black text-slate-900 bg-transparent outline-none w-full" placeholder="Titolo..." />
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
                <button onClick={() => onUpdatePillars(prev => prev.filter(x => x.id !== p.id))} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
              </div>
            </div>
            <textarea value={p.description} onChange={e => onUpdatePillars(prev => prev.map(x => x.id === p.id ? {...x, description: e.target.value} : x))} className="w-full text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-4 outline-none resize-none min-h-[120px] leading-relaxed" placeholder="Descrizione..." />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PillarsView;
