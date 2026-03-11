
import React, { useState, useEffect } from 'react';
import { MonthlyStrategy, CalendarPost } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';

interface Props {
  strategies: MonthlyStrategy[];
}

const CalendarGrid: React.FC<Props> = ({ strategies }) => {
  const [currentIdx, setCurrentIdx] = useState(strategies.length > 0 ? strategies.length - 1 : 0);
  
  // Sync index when strategies list changes (e.g., first one added)
  useEffect(() => {
    if (strategies.length > 0 && currentIdx < 0) {
      setCurrentIdx(strategies.length - 1);
    }
  }, [strategies, currentIdx]);

  const strategy = strategies[currentIdx];

  if (!strategy) {
    return (
      <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
        <h3 className="text-xl font-bold text-slate-400">Nessuna strategia attiva</h3>
        <p className="text-slate-500">Genera una strategia nel Planner per vederla qui.</p>
      </div>
    );
  }

  const date = new Date(strategy.year, strategy.month, 1);
  const daysInMonth = new Date(strategy.year, strategy.month + 1, 0).getDate();
  const firstDay = new Date(strategy.year, strategy.month, 1).getDay(); // 0=Sun, 1=Mon...
  
  // Shift for Monday start (standard in Italy)
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - offset + 1;
    if (dayNum > 0 && dayNum <= daysInMonth) {
      const posts = (strategy.posts || []).filter(p => new Date(p.scheduledDate).getDate() === dayNum);
      return { dayNum, posts };
    }
    return { dayNum: null, posts: [] };
  });

  const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(date);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 capitalize">{monthName}</h3>
            <p className="text-xs text-slate-500 font-medium">Visualizzazione a Griglia Mensile</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            disabled={currentIdx <= 0}
            onClick={() => setCurrentIdx(currentIdx - 1)}
            className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            disabled={currentIdx >= strategies.length - 1}
            onClick={() => setCurrentIdx(currentIdx + 1)}
            className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
          {weekDays.map(d => (
            <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 last:border-none">
              {d}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 border-slate-100">
          {days.map((day, i) => (
            <div key={i} className={`min-h-[120px] p-2 border-r border-b border-slate-100 relative ${!day.dayNum ? 'bg-slate-50/30' : 'bg-white'}`}>
              {day.dayNum && (
                <div className="flex flex-col h-full">
                  <span className="text-xs font-black text-slate-300 mb-1">{day.dayNum}</span>
                  <div className="space-y-1">
                    {(day.posts || []).map(p => (
                      <div key={p.id} className={`p-1.5 rounded-lg text-[9px] font-bold leading-tight border transition-all ${p.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                        <div className="flex items-center justify-between mb-0.5">
                           <span className="uppercase text-[7px] opacity-60 truncate">{p.pillar}</span>
                           {p.status === 'published' && <CheckCircle2 size={8} />}
                        </div>
                        <div className="truncate">{p.hook}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
