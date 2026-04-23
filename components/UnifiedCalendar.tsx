
import React, { useState } from 'react';
import { MonthlyStrategy, CalendarPost, BrandKB, Persona, Pillar, ContentType, Platform } from '../types';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Grid, 
  CheckCircle2, Linkedin, Mail, Newspaper, FileText, Plus, X, 
  Target, Info, Sparkles
} from 'lucide-react';
import PostCreator from './PostCreator';

interface Props {
  brand: BrandKB;
  personas: Persona[];
  pillars: Pillar[];
  strategies: MonthlyStrategy[];
  onUpdateStrategy: (strategy: MonthlyStrategy) => void;
  onStrategyAdded: (strategy: MonthlyStrategy) => void;
  isProMode: boolean;
  onGlobalError: (error: any) => void;
}

const UnifiedCalendar: React.FC<Props> = ({ brand, personas, pillars, strategies, onUpdateStrategy, onStrategyAdded, isProMode, onGlobalError }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [draggedPost, setDraggedPost] = useState<{ strategyId: string, postId: string } | null>(null);
  const [dropTargetDay, setDropTargetDay] = useState<number | null>(null);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPostDate, setNewPostDate] = useState<number>(new Date().getDate());
  const [newPostType, setNewPostType] = useState<ContentType>('post');
  const [newPostPillar, setNewPostPillar] = useState<string>('');
  const [newPostPersona, setNewPostPersona] = useState<string>('');
  const [newPostHook, setNewPostHook] = useState('');

  const currentMonthDate = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const allPosts = (strategies || [])
    .filter(s => s.month === currentMonth && s.year === currentYear)
    .flatMap(s => (s.posts || []).map(p => ({ ...p, strategyId: s.id })));

  const handleDragStart = (strategyId: string, postId: string) => {
    setDraggedPost({ strategyId, postId });
  };

  const handleDrop = (e: React.DragEvent, targetDay: number) => {
    e.preventDefault();
    if (!draggedPost) return;

    const targetStrategy = strategies.find(s => s.id === draggedPost.strategyId);
    if (!targetStrategy) return;

    const postIndex = targetStrategy.posts.findIndex(p => p.id === draggedPost.postId);
    if (postIndex === -1) return;

    const updatedPosts = [...targetStrategy.posts];
    const post = { ...updatedPosts[postIndex] };
    const oldDate = new Date(post.scheduledDate);
    const newDate = new Date(currentYear, currentMonth, targetDay, oldDate.getHours(), oldDate.getMinutes());
    post.scheduledDate = newDate.toISOString();
    
    updatedPosts[postIndex] = post;
    onUpdateStrategy({ ...targetStrategy, posts: updatedPosts });

    setDraggedPost(null);
    setDropTargetDay(null);
  };

  const handleOpenAddModal = (day?: number) => {
    if (day) setNewPostDate(day);
    else setNewPostDate(new Date().getDate());
    
    // Default values
    if (pillars.length > 0) setNewPostPillar(pillars[0].title);
    if (personas.length > 0) setNewPostPersona(personas[0].name);
    
    setShowAddModal(true);
  };

  const handleAddCustomPost = () => {
    const platform: Platform = newPostType === 'email' ? 'newsletter' : 'linkedin';
    
    const newPost: CalendarPost = {
      id: Math.random().toString(36).substr(2, 9),
      platform,
      contentType: newPostType,
      scheduledDate: new Date(currentYear, currentMonth, newPostDate, 10, 0).toISOString(),
      pillar: newPostPillar || 'Generale',
      persona: newPostPersona || 'Audience',
      hook: newPostHook || 'Nuovo contenuto personalizzato',
      angle: '',
      status: 'planned'
    };

    // Find if a strategy for this month/platform exists
    const existingStrategy = strategies.find(s => s.month === currentMonth && s.year === currentYear && s.platform === platform);

    if (existingStrategy) {
      onUpdateStrategy({
        ...existingStrategy,
        posts: [...existingStrategy.posts, newPost]
      });
    } else {
      // Create a new strategy shell
      const newStrategy: MonthlyStrategy = {
        id: Math.random().toString(36).substr(2, 9),
        platform,
        month: currentMonth,
        year: currentYear,
        objective: 'Pianificazione Manuale',
        posts: [newPost],
        postsPerWeek: 1
      };
      onStrategyAdded(newStrategy);
    }

    // Reset and close
    setShowAddModal(false);
    setNewPostHook('');
  };

  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - offset + 1;
    if (dayNum > 0 && dayNum <= daysInMonth) {
      const posts = allPosts.filter(p => new Date(p.scheduledDate).getDate() === dayNum);
      return { dayNum, posts };
    }
    return { dayNum: null, posts: [] };
  });

  const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(currentMonthDate);

  const getTypeIcon = (contentType: string) => {
    switch(contentType) {
      case 'article': return <FileText size={10} />;
      case 'linkedin_newsletter': return <Newspaper size={10} />;
      case 'email': return <Mail size={10} />;
      default: return <Linkedin size={10} />;
    }
  };

  const getTypeColorClasses = (contentType: string) => {
    switch(contentType) {
      case 'article': return 'bg-emerald-50 border-emerald-100 text-emerald-800 border-l-2 border-l-emerald-400';
      case 'linkedin_newsletter': return 'bg-indigo-50 border-indigo-100 text-indigo-800 border-l-2 border-l-indigo-400';
      case 'email': return 'bg-amber-50 border-amber-100 text-amber-800 border-l-2 border-l-amber-400';
      default: return 'bg-blue-50 border-blue-100 text-blue-800 border-l-2 border-l-blue-400';
    }
  };

  const contentTypes: { id: ContentType, label: string, icon: any, color: string }[] = [
    { id: 'post', label: 'Linkedin Post', icon: Linkedin, color: 'text-blue-600' },
    { id: 'article', label: 'Linkedin Articolo', icon: FileText, color: 'text-emerald-600' },
    { id: 'linkedin_newsletter', label: 'Linkedin Newsletter', icon: Newspaper, color: 'text-indigo-600' },
    { id: 'email', label: 'Email Newsletter', icon: Mail, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-slate-900 text-white rounded-2xl">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 capitalize">{monthName}</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Calendario Editoriale</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => handleOpenAddModal()}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
          >
            <Plus size={14} />
            <span>Content Custom</span>
          </button>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all flex items-center space-x-2 ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Grid size={14} /> <span>GRIGLIA</span>
            </button>
            <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all flex items-center space-x-2 ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <List size={14} /> <span>LISTA</span>
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button onClick={() => {
              if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } else { setCurrentMonth(currentMonth - 1); }
            }} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"><ChevronLeft size={20} /></button>
            <button onClick={() => {
              if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } else { setCurrentMonth(currentMonth + 1); }
            }} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      {/* Monthly Objectives Banner */}
      <div className="flex flex-wrap gap-4">
        {(strategies || [])
          .filter(s => s.month === currentMonth && s.year === currentYear)
          .map(s => (
            <div key={s.id} className="flex-1 min-w-[300px] bg-slate-900 text-white p-5 rounded-[2rem] shadow-xl relative overflow-hidden group">
               <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 blur-3xl transition-all group-hover:scale-150 ${s.platform === 'linkedin' ? 'bg-blue-400' : 'bg-purple-400'}`} />
               <div className="flex items-center space-x-3 mb-2">
                  <div className={`p-1.5 rounded-lg ${s.platform === 'linkedin' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                    {s.platform === 'linkedin' ? <Linkedin size={14} /> : <Mail size={14} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.platform} Strategy</span>
               </div>
               <p className="text-sm font-black leading-tight">{s.objective}</p>
               <p className="text-[10px] mt-2 font-bold text-slate-400 italic line-clamp-1">"{s.nextMonthProjection}"</p>
            </div>
          ))}
        {strategies.filter(s => s.month === currentMonth && s.year === currentYear).length === 0 && (
          <div className="w-full bg-slate-50 border border-slate-200 border-dashed p-6 rounded-[2rem] text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nessuna strategia pianificata per questo mese.</p>
          </div>
        )}
      </div>

      {viewMode === 'grid' ? (
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
            {weekDays.map(d => (
              <div key={d} className="py-2.5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => (
              <div 
                key={i} 
                onDragOver={(e) => { e.preventDefault(); if(day.dayNum) setDropTargetDay(day.dayNum); }}
                onDrop={(e) => day.dayNum && handleDrop(e, day.dayNum)}
                className={`min-h-[140px] p-2 border-r border-b border-slate-100 transition-colors relative group/day ${!day.dayNum ? 'bg-slate-50/20' : dropTargetDay === day.dayNum ? 'bg-blue-50/50' : 'bg-white'}`}
              >
                {day.dayNum && (
                  <div className="flex flex-col h-full space-y-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[10px] font-black ${day.dayNum === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear() ? 'text-blue-600 bg-blue-50 w-5 h-5 rounded-md flex items-center justify-center' : 'text-slate-300'}`}>{day.dayNum}</span>
                      <button 
                        onClick={() => handleOpenAddModal(day.dayNum!)}
                        className="opacity-0 group-hover/day:opacity-100 p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {day.posts?.map(p => (
                        <div 
                          key={p.id} 
                          draggable 
                          onDragStart={() => handleDragStart(p.strategyId!, p.id)}
                          className={`p-1.5 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] flex flex-col gap-0.5 ${getTypeColorClasses(p.contentType)}`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center space-x-1 opacity-70 scale-90 origin-left">
                                {getTypeIcon(p.contentType)}
                                <span className="text-[7px] font-black uppercase tracking-tight leading-none">{p.contentType.replace('_', ' ')}</span>
                            </div>
                            {p.status === 'published' && <CheckCircle2 size={8} className="text-emerald-600" />}
                          </div>
                          <div className="text-[9px] font-bold leading-[1.2] line-clamp-2 text-slate-800">{p.hook}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allPosts?.sort((a,b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()).map(post => (
            <PostCreator 
              key={post.id} 
              brand={brand} 
              post={post} 
              persona={personas.find(pr => pr.name === post.persona)}
              pillar={pillars.find(pl => pl.title === post.pillar)}
              onUpdate={(updated) => {
                const strat = (strategies || []).find(s => s.id === post.strategyId);
                if (strat) onUpdateStrategy({ ...strat, posts: strat.posts.map(p => p.id === updated.id ? updated : p) });
              }} 
              isProMode={isProMode}
              onGlobalError={onGlobalError}
            />
          ))}
          
          {/* List view placeholder/button to add */}
          <button 
            onClick={() => handleOpenAddModal()}
            className="h-full min-h-[250px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[1.5rem] bg-white hover:bg-slate-50 hover:border-blue-400 transition-all group"
          >
            <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all mb-4">
              <Plus size={24} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Aggiungi Content Custom</p>
          </button>
        </div>
      )}

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl">
                  <Plus size={20} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">Nuovo Content Custom</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Giorno {newPostDate} di {monthName}</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Content Type Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo di Contenuto</label>
                <div className="grid grid-cols-2 gap-3">
                  {contentTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setNewPostType(type.id)}
                      className={`p-3 rounded-2xl border text-left flex items-center space-x-3 transition-all ${newPostType === type.id ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-50' : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200'}`}
                    >
                      <div className={`p-2 rounded-xl bg-white shadow-sm ${type.color}`}>
                        <type.icon size={16} />
                      </div>
                      <span className={`text-xs font-bold ${newPostType === type.id ? 'text-blue-900' : 'text-slate-600'}`}>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Target size={12} /> Pilastro
                  </label>
                  <select 
                    value={newPostPillar} 
                    onChange={e => setNewPostPillar(e.target.value)} 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                  >
                    {pillars.map(p => <option key={p.id} value={p.title}>{p.title}</option>)}
                    {pillars.length === 0 && <option value="">Nessun pilastro</option>}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Target size={12} /> Target Persona
                  </label>
                  <select 
                    value={newPostPersona} 
                    onChange={e => setNewPostPersona(e.target.value)} 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                  >
                    {personas.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    {personas.length === 0 && <option value="">Nessun target</option>}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hook / Idea del contenuto</label>
                <textarea 
                  value={newPostHook}
                  onChange={e => setNewPostHook(e.target.value)}
                  placeholder="Di cosa parlerà questo contenuto?"
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium min-h-[100px] outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start space-x-3">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
                  Una volta aggiunto, potrai generare il testo completo utilizzando l'AI Master basandoti sulle linee guida specifiche del brand.
                </p>
              </div>

              <button 
                onClick={handleAddCustomPost}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center space-x-3 shadow-xl hover:bg-slate-800 transition-all"
              >
                <Sparkles size={16} />
                <span>Pianifica Contenuto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedCalendar;
