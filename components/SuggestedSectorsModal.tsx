import React from 'react';
import { View, SuggestedSector } from '../types';
import { Factory, X, Loader2, CheckSquare, Square, AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  isBatchImporting: boolean;
  sectors: SuggestedSector[];
  selectedKeys: string[];
  activeView: View;
  onToggleSelection: (key: string) => void;
  onBatchImport: () => void;
  onAddCustomSector: (sector: SuggestedSector) => void;
}

const SuggestedSectorsModal: React.FC<Props> = ({ 
  isOpen, onClose, loading, isBatchImporting, sectors, selectedKeys, activeView, onToggleSelection, onBatchImport, onAddCustomSector 
}) => {
  const [manualSector, setManualSector] = React.useState('');
  const [manualRole, setManualRole] = React.useState('');

  const handleAddManual = () => {
    if (!manualSector) return;
    onAddCustomSector({
      sector: manualSector,
      rationale: "Inserito manualmente dall'utente.",
      targetRoles: [{ role: manualRole || "Professionista / Decision Maker", focus: "Obiettivo personalizzato" }]
    });
    setManualSector('');
    setManualRole('');
  };

  if (!isOpen) return null;

  return (
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
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 shadow-inner">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center space-x-2"><Factory size={12} /><span>Aggiunta Manuale Settore O Target</span></h5>
            <div className="flex flex-col md:flex-row gap-3">
              <input value={manualSector} onChange={e => setManualSector(e.target.value)} placeholder={activeView === 'pillars' ? "Es: Settore Healthcare..." : "Es: Medicale..."} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
              {activeView === 'personas' && (
                <input value={manualRole} onChange={e => setManualRole(e.target.value)} placeholder="Ruolo Es: Direttore Sanitario..." className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
              )}
              <button disabled={!manualSector} onClick={handleAddManual} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase shadow-lg hover:bg-slate-800 disabled:opacity-30">Aggiungi</button>
            </div>
            <p className="text-[9px] text-slate-400 mt-3 font-medium italic">Se non trovi quello che cerchi, scrivilo tu: lo selezionerai e l'AI lo elaborerà insieme agli altri.</p>
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 size={40} className="animate-spin text-blue-600" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">L'AI sta analizzando i mercati verticali...</p>
            </div>
          ) : sectors.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {sectors.map((s, sIdx) => (
                <div key={sIdx} className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-6 space-y-4 hover:border-blue-200 transition-all group">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-3">
                          {activeView === 'pillars' && (
                            <button 
                              onClick={() => onToggleSelection(sIdx.toString())}
                              className={`p-1 rounded transition-colors ${selectedKeys.includes(sIdx.toString()) ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'}`}
                            >
                              {selectedKeys.includes(sIdx.toString()) ? <CheckSquare size={20} /> : <Square size={20} />}
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
                          const isSelected = selectedKeys.includes(key);
                          return (
                            <button 
                              key={rIdx} 
                              onClick={() => activeView === 'personas' ? onToggleSelection(key) : null}
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
            {selectedKeys.length > 0 && (
              <button 
                onClick={onBatchImport}
                disabled={isBatchImporting}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center space-x-3 shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {isBatchImporting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>
                  {isBatchImporting 
                    ? `Generazione in corso...` 
                    : `Importa Selezionati (${selectedKeys.length}) & Completa AI`}
                </span>
              </button>
            )}
            <p className="text-[9px] text-slate-400 italic text-center">
              Seleziona più settori o ruoli e clicca il tasto di importazione massiva. L'AI genererà automaticamente in background i dettagli per ogni elemento inserito.
            </p>
        </div>
      </div>
    </div>
  );
};

export default SuggestedSectorsModal;
