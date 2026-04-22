import React, { useState } from 'react';
import { BrandKB, Persona } from '../types';
import { Plus, Sparkles, Loader2, UserPlus, Wand2, Trash2, Factory } from 'lucide-react';
import { suggestPersonas, generateSinglePersonaDetails } from '../services/geminiService';

interface Props {
  brand: BrandKB;
  personas: Persona[];
  isProMode: boolean;
  onUpdatePersonas: (updater: Persona[] | ((prev: Persona[]) => Persona[])) => void;
  onGlobalError: (error: any) => void;
  onSuggestSectors: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const PersonasView: React.FC<Props> = ({ brand, personas, isProMode, onUpdatePersonas, onGlobalError, onSuggestSectors }) => {
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [completingPersonaId, setCompletingPersonaId] = useState<string | null>(null);

  const handleCompletePersona = async (p: Persona) => {
    if (!p.name) return;
    setCompletingPersonaId(p.id);
    try {
      const details = await generateSinglePersonaDetails(brand, p.name, p.role || "Professionista", isProMode);
      onUpdatePersonas(prev => prev.map(x => x.id === p.id ? { ...x, pains: details.pains, goals: details.goals } : x));
    } catch (e) { onGlobalError(e); }
    finally { setCompletingPersonaId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h3 className="text-xl font-black text-slate-900">Target Personas</h3>
          <p className="text-xs text-slate-500 mt-1">Definisci gli archetipi del tuo mercato.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onSuggestSectors} className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-black uppercase flex items-center space-x-2 hover:bg-blue-100 transition-all"><Factory size={14} /> <span>Suggerisci Settori</span></button>
          <button onClick={() => onUpdatePersonas(prev => [...prev, { id: generateId(), name: '', role: '', pains: '', goals: '' }])} className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black uppercase flex items-center space-x-2 transition-all"><Plus size={14} /> <span>Aggiungi Manuale</span></button>
          <button 
            onClick={async () => { 
                setLoadingSuggestions(true); 
                try { 
                    const s = await suggestPersonas(brand, isProMode); 
                    onUpdatePersonas(prev => [...prev, ...s]); 
                } catch(e) { onGlobalError(e); } 
                finally { setLoadingSuggestions(false); } 
            }} 
            disabled={loadingSuggestions} 
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase flex items-center space-x-2 shadow-lg"
           >
            {loadingSuggestions ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{loadingSuggestions ? 'Generazione...' : 'Genera con AI'}</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {personas.map(p => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all flex flex-col group">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400"><UserPlus size={20} /></div>
                <div className="flex-1">
                  <input value={p.name} onChange={e => onUpdatePersonas(prev => prev.map(x => x.id === p.id ? {...x, name: e.target.value} : x))} className="text-md font-black text-slate-900 bg-transparent outline-none w-full" placeholder="Nome Persona..." />
                  <input value={p.role} onChange={e => onUpdatePersonas(prev => prev.map(x => x.id === p.id ? {...x, role: e.target.value} : x))} className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-transparent outline-none w-full mt-1" placeholder="Ruolo..." />
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
                <button onClick={() => onUpdatePersonas(prev => prev.filter(x => x.id !== p.id))} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <textarea value={p.pains} onChange={e => onUpdatePersonas(prev => prev.map(x => x.id === p.id ? {...x, pains: e.target.value} : x))} className="w-full text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 outline-none resize-none min-h-[80px]" placeholder="Pains..." />
              <textarea value={p.goals} onChange={e => onUpdatePersonas(prev => prev.map(x => x.id === p.id ? {...x, goals: e.target.value} : x))} className="w-full text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 outline-none resize-none min-h-[80px]" placeholder="Goals..." />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonasView;
