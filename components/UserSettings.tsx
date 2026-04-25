
import React, { useState } from 'react';
import { User, ApiKeys, UserSettings as Settings } from '../types';
import { authService } from '../services/authService';
import { 
  Key, Save, Loader2, Cpu, ShieldCheck, Zap, 
  Settings as SettingsIcon, Globe, Lock, BrainCircuit, Sparkles,
  Linkedin, Info
} from 'lucide-react';
import { API_URL, getAuthHeaders } from '../services/apiConfig';

interface Props {
  user: User;
  onUpdate: (user: User) => void;
}

const UserSettings: React.FC<Props> = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [apiKeys, setApiKeys] = useState<ApiKeys>(user.apiKeys || {});
  const [settings, setSettings] = useState<Settings>(user.settings || { preferredModel: 'gemini', useCustomKeys: false });
  const [linkedinAuth, setLinkedinAuth] = useState(user.linkedinAuth || {});

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      const updatedUser = await authService.updateSettings({
        apiKeys,
        settings,
        linkedinAuth
      });
      onUpdate(updatedUser);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      alert("Errore nel salvataggio: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectLinkedin = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/linkedin/auth_url`, {
        headers: getAuthHeaders()
      });
      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Errore nel recupero dell'URL di autorizzazione.");
      }
    } catch (e) {
      alert("Errore di connessione a LinkedIn.");
    }
  };

  const providers = [
    { id: 'gemini', name: 'Google Gemini', icon: Sparkles, color: 'text-blue-500' },
    { id: 'openai', name: 'OpenAI (GPT-4o)', icon: Zap, color: 'text-emerald-500' },
    { id: 'anthropic', name: 'Anthropic (Claude)', icon: BrainCircuit, color: 'text-orange-500' },
    { id: 'openrouter', name: 'OpenRouter', icon: Globe, color: 'text-purple-500' },
    { id: 'deepseek', name: 'DeepSeek', icon: Cpu, color: 'text-indigo-500' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="flex items-center space-x-4 mb-2">
        <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Impostazioni AI</h2>
          <p className="text-sm text-slate-500 font-medium">Gestisci le tue API Key personali e scegli il tuo modello preferito.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Colonna Sinistra: Modello Preferito */}
        <div className="md:col-span-1 space-y-6">
          <section className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
              <Zap size={14} className="mr-2 text-blue-500" /> Modello Primario
            </h3>
            
            <div className="space-y-3">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSettings({ ...settings, preferredModel: p.id })}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    settings.preferredModel === p.id 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                      : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <p.icon size={16} className={settings.preferredModel === p.id ? 'text-white' : p.color} />
                    <span className="text-[11px] font-black uppercase">{p.name}</span>
                  </div>
                  {settings.preferredModel === p.id && <ShieldCheck size={14} />}
                </button>
              ))}
            </div>
          </section>

          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
              Il modello primario sarà usato per tutte le generazioni. Se dovesse fallire (es. quota esaurita), il sistema utilizzerà gli altri modelli come fallback in ordine automatico.
            </p>
          </div>
        </div>

        {/* Colonna Destra: API Keys */}
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Key size={14} className="mr-2 text-blue-500" /> API Key Personali
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-[9px] font-black text-slate-400 uppercase">Usa chiavi personali</span>
                <button 
                  onClick={() => setSettings({...settings, useCustomKeys: !settings.useCustomKeys})}
                  className={`w-10 h-5 rounded-full transition-all relative ${settings.useCustomKeys ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.useCustomKeys ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {providers.map((p) => (
                <div key={p.id} className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center px-1">
                    <p.icon size={12} className={`mr-2 ${p.color}`} /> {p.name} API Key
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <Lock size={14} />
                    </div>
                    <input
                      type="password"
                      value={(apiKeys as any)[p.id] || ''}
                      onChange={(e) => setApiKeys({ ...apiKeys, [p.id]: e.target.value })}
                      placeholder={`Incolla qui la tua chiave ${p.name}`}
                      className="w-full pl-10 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium focus:bg-white focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  
                  {/* Custom Model Inputs */}
                  {p.id === 'openrouter' && (
                    <div className="mt-2 pl-2">
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        ID Modello OpenRouter (opzionale - default: Claude 3.5 Sonnet)
                      </label>
                      <input
                        type="text"
                        value={settings.openrouterModel || ''}
                        onChange={(e) => setSettings({ ...settings, openrouterModel: e.target.value })}
                        placeholder="es: qwen/qwen-2.5-coder-32b-instruct"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold focus:bg-white focus:border-purple-500 outline-none transition-all"
                      />
                    </div>
                  )}

                  {p.id === 'deepseek' && (
                    <div className="mt-2 pl-2">
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        ID Modello DeepSeek (opzionale - default: deepseek-chat)
                      </label>
                      <input
                        type="text"
                        value={settings.deepseekModel || ''}
                        onChange={(e) => setSettings({ ...settings, deepseekModel: e.target.value })}
                        placeholder="es: deepseek-reasoner"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>



            <div className="pt-6 border-t border-slate-50">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center space-x-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : success ? <ShieldCheck size={16} className="text-emerald-400" /> : <Save size={16} />}
                <span>{loading ? 'Salvataggio...' : success ? 'Impostazioni Salvate!' : 'Salva Impostazioni'}</span>
              </button>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
              <Linkedin size={14} className="mr-2 text-blue-600" /> LinkedIn App Credentials
            </h3>
            
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start space-x-3">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                Per caricare i post direttamente, devi creare un'app su <a href="https://www.linkedin.com/developers/" target="_blank" className="font-black underline">LinkedIn Developers</a> con il prodotto "Share on LinkedIn". Incolla qui il tuo Client ID e Secret.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">LinkedIn Client ID</label>
                <input
                  type="text"
                  value={linkedinAuth.clientId || ''}
                  onChange={(e) => setLinkedinAuth({ ...linkedinAuth, clientId: e.target.value })}
                  placeholder="Incolla Client ID"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">LinkedIn Client Secret</label>
                <input
                  type="password"
                  value={linkedinAuth.clientSecret || ''}
                  onChange={(e) => setLinkedinAuth({ ...linkedinAuth, clientSecret: e.target.value })}
                  placeholder="Incolla Client Secret"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 pt-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-3 hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
              >
                <Save size={14} />
                <span>Salva Credenziali App</span>
              </button>
            </div>
          </section>

          <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4">
             <div className="flex items-center space-x-3">
               <Sparkles size={18} className="text-blue-400" />
               <p className="text-xs font-bold uppercase tracking-tight">Perché inserire le tue chiavi?</p>
             </div>
             <p className="text-[11px] text-slate-400 leading-relaxed">
               Inserendo le tue chiavi personali, potrai utilizzare l'app senza limiti di quota e avrai il pieno controllo sui modelli utilizzati. Se non inserisci nulla, l'app continuerà a usare le chiavi di default del sistema finché disponibili.
             </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserSettings;
