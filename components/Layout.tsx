
import React, { useState, useRef } from 'react';
import { View, BrandProject, User } from '../types';
import { 
  LayoutDashboard, Users, Database, Target, CalendarDays, 
  MessageSquarePlus, Plus, Briefcase, Trash2, LogOut, 
  ChevronDown, Linkedin, Mail, Search, BookOpen, 
  ChevronRight, Camera, FileText, Newspaper, Shield, Layers,
  Upload, Image as ImageIcon, Settings as SettingsIcon, CheckCircle2
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  onViewChange: (view: View) => void;
  projects: BrandProject[];
  activeProjectId: string | null;
  onProjectSelect: (id: string) => void;
  onProjectAdd: () => void;
  onProjectDelete: (id: string) => void;
  onUpdateProjectBrandLogo: (projectId: string, logoUrl: string) => void;
  onUpdateProjectBrandFavicon: (projectId: string, faviconUrl: string) => void;
  user: User;
  onLogout: () => void;
  isSaving?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, activeView, onViewChange, projects, 
  activeProjectId, onProjectSelect, onProjectAdd,
  onProjectDelete, onUpdateProjectBrandLogo, onUpdateProjectBrandFavicon, user, onLogout,
  isSaving = false
}) => {
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeProject = projects.find(p => p.id === activeProjectId);

  const coreMenu = [
    { id: 'knowledge', label: 'Knowledge Base', icon: Database },
    { id: 'personas', label: 'Target Persona', icon: Users },
    { id: 'pillars', label: 'Content Pillars', icon: Target },
    { id: 'suite_guidelines', label: 'Suite Guidelines', icon: Shield },
    { id: 'linkedin_benchmarking', label: 'Competitor Radar', icon: Search },
  ];

  const linkedinMenu = [
    { id: 'linkedin_strategy', label: 'Strategy Planner', icon: LayoutDashboard },
    { id: 'linkedin_custom', label: 'Content Custom', icon: MessageSquarePlus },
  ];

  const newsletterMenu = [
    { id: 'newsletter_strategy', label: 'Strategy Planner', icon: LayoutDashboard },
    { id: 'newsletter_custom', label: 'Content Custom', icon: MessageSquarePlus },
  ];

  const contentMenu = [
    { id: 'calendar', label: 'Editorial Calendar', icon: CalendarDays },
  ];

  const handleFaviconClick = (projectId: string) => {
    if (activeProjectId === projectId) {
      fileInputRef.current?.click();
    } else {
      onProjectSelect(projectId);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeProjectId) {
      setIsUploading(activeProjectId);
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateProjectBrandFavicon(activeProjectId, reader.result as string);
        setIsUploading(null);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Stretta (Brand Switcher) */}
      <aside className="w-16 bg-slate-900 flex flex-col items-center border-r border-slate-800 z-30 shrink-0">
        <div className="w-full flex flex-col items-center pt-6 pb-4 shrink-0">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black text-lg mb-4 shadow-lg shadow-blue-900/20 ring-1 ring-white/10">B</div>
          <div className="w-8 h-[1px] bg-slate-800 mb-2" />
        </div>

        <div className="flex-1 w-full flex flex-col items-center space-y-4 overflow-y-auto no-scrollbar py-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            hidden 
            accept="image/*" 
            onChange={handleFileChange} 
          />
          
          {projects.map((project) => {
            const isActive = activeProjectId === project.id;
            const displayUrl = project.brand.faviconUrl || project.brand.logoUrl;

            return (
              <div key={project.id} className="relative group shrink-0">
                <button
                  onClick={() => handleFaviconClick(project.id)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all overflow-hidden relative ${
                    isActive 
                      ? 'bg-white text-slate-900 ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {isUploading === project.id ? (
                    <Upload size={14} className="animate-bounce text-blue-500" />
                  ) : displayUrl ? (
                    <img src={displayUrl} alt={project.brand.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-black">
                      {project.brand.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Overlay per caricamento sulla favicon attiva */}
                  {isActive && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera size={12} className="text-white" />
                    </div>
                  )}
                </button>
                
                {/* Tooltip con nome brand */}
                {!isActive && (
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {project.brand.name}
                  </div>
                )}
              </div>
            );
          })}
          
          <button 
            onClick={onProjectAdd} 
            className="w-10 h-10 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-500 hover:border-blue-500 hover:text-blue-500 bg-slate-800/20 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        {activeProjectId && (
          <div className="py-4 border-t border-slate-800 w-full flex justify-center">
            <button 
              onClick={() => onProjectDelete(activeProjectId)} 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-500 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </aside>

      {/* Sidebar Larga (Navigazione Progetto) */}
      <aside className="w-56 bg-white border-r border-slate-200 hidden md:flex flex-col sticky top-0 h-screen z-20 shrink-0">
        <div className="p-4 border-b border-slate-100">
          <h1 className="text-lg font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
            {activeProject?.brand.name || 'Brand'}
          </h1>
        </div>
        
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar">
          <div className="space-y-1">
            <p className="px-3 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Core Assets</p>
            {coreMenu.map((item) => (
              <button key={item.id} onClick={() => onViewChange(item.id as View)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-[12px] font-bold transition-all ${activeView === item.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                <item.icon size={15} /><span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[8px] font-black text-slate-900 uppercase tracking-widest mb-1 flex items-center"><Linkedin size={10} className="mr-1 text-blue-600" /> LinkedIn Suite</p>
            {linkedinMenu.map((item) => (
              <button key={item.id} onClick={() => onViewChange(item.id as View)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-[12px] font-bold transition-all ${activeView === item.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <item.icon size={15} /><span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[8px] font-black text-slate-900 uppercase tracking-widest mb-1 flex items-center"><Mail size={10} className="mr-1 text-purple-600" /> Newsletter</p>
            {newsletterMenu.map((item) => (
              <button key={item.id} onClick={() => onViewChange(item.id as View)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-[12px] font-bold transition-all ${activeView === item.id ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <item.icon size={15} /><span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 pt-4 border-t border-slate-50">
            <p className="px-3 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">CONTENTS</p>
            {contentMenu.map((item) => (
              <button key={item.id} onClick={() => onViewChange(item.id as View)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-[12px] font-bold transition-all ${activeView === item.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                <item.icon size={15} /><span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-1">
          <button onClick={() => onViewChange('settings')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-[12px] font-bold transition-all ${activeView === 'settings' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
            <SettingsIcon size={15} /><span>Impostazioni AI</span>
          </button>
          <button onClick={onLogout} className="w-full flex items-center space-x-3 px-3 py-2 text-[12px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"><LogOut size={15} /><span>Logout</span></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-14 flex items-center px-6 shrink-0">
          <div className="bg-slate-100 px-3 py-1 rounded-lg text-[9px] font-black text-slate-500 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span>DASHBOARD</span><ChevronRight size={10} /><span className="text-slate-900">{activeView.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div className="w-[1px] h-3 bg-slate-300" />
            <span className="text-blue-600">v2.0 Orchestrator</span>
          </div>
          <div className="ml-6 flex items-center">
            {isSaving ? (
              <div className="flex items-center space-x-2 text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
                <Upload size={12} className="animate-bounce" />
                <span>Salvataggio...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest opacity-60">
                <CheckCircle2 size={12} />
                <span>Sincronizzato</span>
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">{user.name}</span>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} className="w-9 h-9 rounded-xl border border-slate-200 object-cover shadow-sm" alt={user.name} />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-100">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full no-scrollbar">
          {activeProjectId ? children : <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 font-bold">Seleziona un Brand dal menu a sinistra</div>}
        </div>
      </main>
    </div>
  );
};

export default Layout;
