
import React, { useState, useRef } from 'react';
import type { BrandKB, BrandFile, User, BrandProject } from '../types';
import { refineBrandField } from '../services/geminiService';
import { 
  FileCode, CheckCircle2, AlertCircle, Camera, UploadCloud, Linkedin,
  Link2, Info, Sparkles, Loader2, Globe, Database, Type, MessageSquare,
  Target, Rocket, ShieldCheck, Heart, Eye, PenTool, Users,
  FileUp, FileText, FileSpreadsheet, Image as ImageIcon, Trash2, X
} from 'lucide-react';
import { API_URL, getAuthHeaders } from '../services/apiConfig';

interface Props {
  data: BrandKB;
  onChange: (data: BrandKB) => void;
  collaborators?: string[];
  onChangeCollaborators?: (collabs: string[]) => void;
  isOwner?: boolean;
  project?: BrandProject;
  onUpdateProject?: (project: BrandProject) => void;
  user?: User;
}

interface FieldWrapperProps {
  id: keyof BrandKB;
  label: string;
  icon: any;
  children: React.ReactNode;
  canRefine?: boolean;
  data: BrandKB;
  refiningField: string | null;
  handleRefine: (field: keyof BrandKB) => void;
}

const FieldWrapper: React.FC<FieldWrapperProps> = ({ 
  id, 
  label, 
  icon: Icon, 
  children, 
  canRefine = true,
  data,
  refiningField,
  handleRefine
}) => (
  <div className="space-y-2 group">
    <div className="flex justify-between items-center px-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
        <Icon size={12} className="mr-2 text-slate-300 group-hover:text-blue-500 transition-colors" />
        {label}
      </label>
      {canRefine && (
        <button
          onClick={() => handleRefine(id)}
          disabled={refiningField === id || (typeof data[id] === 'string' && (data[id] as string).length < 5)}
          className="flex items-center space-x-2 text-[9px] font-black text-blue-600 uppercase hover:text-blue-700 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
        >
          {refiningField === id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
          <span>Raffina AI</span>
        </button>
      )}
    </div>
    {children}
  </div>
);

const BrandKBForm: React.FC<Props> = ({ 
  data, onChange, collaborators = [], onChangeCollaborators, isOwner = true,
  project, onUpdateProject, user
}) => {
  const [uploading, setUploading] = useState(false);
  const [refiningField, setRefiningField] = useState<keyof BrandKB | null>(null);
  const [liLoading, setLiLoading] = useState(false);
  const [newCollab, setNewCollab] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleConnectLinkedin = async () => {
    if (!project) return;
    setLiLoading(true);
    try {
      const resp = await fetch(`${API_URL}/api/linkedin/auth_url?project_id=${project.id}`, {
        headers: getAuthHeaders()
      });
      const resData = await resp.json();
      if (resData.url) {
        window.location.href = resData.url;
      } else {
        alert(resData.detail || "Errore nel recupero dell'URL di autorizzazione.");
      }
    } catch (e) {
      alert("Errore di connessione a LinkedIn.");
    } finally {
      setLiLoading(false);
    }
  };

  const addCollaborator = () => {
    if (newCollab && !collaborators.includes(newCollab) && onChangeCollaborators) {
      onChangeCollaborators([...collaborators, newCollab.toLowerCase()]);
      setNewCollab("");
    }
  };

  const removeCollaborator = (email: string) => {
    if (onChangeCollaborators) {
      onChangeCollaborators(collaborators.filter(c => c !== email));
    }
  };

  const handleRefine = async (field: keyof BrandKB) => {
    const val = data[field];
    if (typeof val !== 'string' || val.length < 5) return;
    
    setRefiningField(field);
    try {
      const refined = await refineBrandField(field, val);
      onChange({ ...data, [field]: refined });
    } catch (e) {
      alert("Errore raffinamento AI.");
    } finally {
      setRefiningField(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    setUploading(true);
    const newFiles: BrandFile[] = [];
    let processed = 0;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          mimeType: file.type,
          data: base64,
          size: file.size
        });
        processed++;
        if (processed === files.length) {
          onChange({
            ...data,
            files: [...(data.files || []), ...newFiles]
          });
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logoUrl' | 'faviconUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...data, [type]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (id: string) => {
    onChange({
      ...data,
      files: (data.files || []).filter(f => f.id !== id)
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return <ImageIcon size={20} className="text-blue-500" />;
    if (mimeType === 'application/pdf') return <FileText size={20} className="text-red-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return <FileSpreadsheet size={20} className="text-emerald-500" />;
    return <FileCode size={20} className="text-slate-500" />;
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      
      {/* 5. LinkedIn Integration - MOVED TO TOP */}
      <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm space-y-10">
        <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
          <div className="p-4 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-100">
            <Linkedin size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">LinkedIn Publishing</h3>
            <p className="text-sm text-slate-500 font-medium">Collega questo brand al suo account o pagina LinkedIn specifica.</p>
          </div>
        </div>

        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            {project?.linkedinAuth?.accessToken ? (
              <>
                <p className="text-sm font-black text-emerald-600 uppercase flex items-center justify-center md:justify-start gap-2">
                  <CheckCircle2 size={16} /> Brand Connesso
                </p>
                <p className="text-xs text-slate-500 font-bold tracking-tight">
                  Collegato come: <span className="text-slate-900">{project.linkedinAuth.connectedAs || "Account LinkedIn"}</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nessuna Connessione</p>
                <p className="text-xs text-slate-500 font-medium">Connetti LinkedIn per abilitare la pubblicazione diretta.</p>
              </>
            )}
          </div>

          <button 
            onClick={handleConnectLinkedin}
            disabled={liLoading}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${project?.linkedinAuth?.accessToken ? 'bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100'}`}
          >
            {liLoading ? <Loader2 size={16} className="animate-spin" /> : <Linkedin size={16} />}
            <span>{project?.linkedinAuth?.accessToken ? "Ricollega Account" : "Connetti LinkedIn"}</span>
          </button>
        </div>

        <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start space-x-3">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-blue-700 font-medium leading-relaxed italic">
            Nota: La connessione è specifica per questo brand. Se gestisci più brand, dovrai connettere ciascuno al proprio account LinkedIn corrispondente.
          </p>
        </div>
      </section>
      {/* 0. Branding & Assets */}
      <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm space-y-10">
        <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
          <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-200">
            <PenTool size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Branding & Assets</h3>
            <p className="text-sm text-slate-500 font-medium">Carica il tuo logo e la tua favicon per personalizzare la piattaforma.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Logo Uploader */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
              <ImageIcon size={12} className="mr-2" /> Logo Principale (Orizzontale/Pieno)
            </label>
            <div 
              onClick={() => logoInputRef.current?.click()}
              className="border-2 border-dashed border-slate-100 rounded-[2rem] h-40 flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-all bg-slate-50/30 overflow-hidden relative group"
            >
              {data.logoUrl ? (
                <>
                  <img src={data.logoUrl} alt="Brand Logo" className="max-w-full max-h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="text-white" size={24} />
                  </div>
                </>
              ) : (
                <div className="text-center space-y-2">
                  <UploadCloud className="mx-auto text-slate-300" size={32} />
                  <p className="text-[10px] font-black text-slate-400 uppercase">Trascina o clicca</p>
                </div>
              )}
            </div>
            <input type="file" ref={logoInputRef} hidden accept="image/*" onChange={(e) => handleAssetUpload(e, 'logoUrl')} />
          </div>

          {/* Favicon Uploader */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
              <Camera size={12} className="mr-2" /> Favicon (Icona Quadrata)
            </label>
            <div className="flex items-center space-x-8">
              <div 
                onClick={() => faviconInputRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-all bg-slate-50/30 overflow-hidden relative group"
              >
                {data.faviconUrl ? (
                  <>
                    <img src={data.faviconUrl} alt="Favicon" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <UploadCloud className="text-white" size={16} />
                    </div>
                  </>
                ) : (
                  <ImageIcon className="text-slate-300" size={24} />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs font-bold text-slate-900 leading-tight">L'icona che appare nella barra laterale.</p>
                <p className="text-[10px] text-slate-500 font-medium">Usa un'immagine quadrata senza troppo testo per la massima leggibilità.</p>
                <button 
                  onClick={() => faviconInputRef.current?.click()}
                  className="mt-2 text-[10px] font-black text-indigo-600 uppercase hover:underline"
                >
                  Sostituisci Icona
                </button>
              </div>
            </div>
            <input type="file" ref={faviconInputRef} hidden accept="image/*" onChange={(e) => handleAssetUpload(e, 'faviconUrl')} />
          </div>
        </div>
      </section>

      {/* 1. Knowledge Vault */}
      <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm space-y-10">
        <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
          <div className="p-4 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-200">
            <Database size={28} />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-slate-900">Knowledge Vault</h3>
            <p className="text-sm text-slate-500 font-medium">Carica PDF, Documenti, CSV o Immagini per istruire l'AI sul tuo brand.</p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
            <span>Carica Documenti</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            hidden 
            accept=".pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png" 
            onChange={handleFileUpload}
          />
        </div>

        {data.files && data.files.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.files.map((file) => (
              <div key={file.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center space-x-4 group hover:bg-white hover:border-blue-100 transition-all">
                <div className="shrink-0">
                  {getFileIcon(file.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-900 truncate">{file.name}</p>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button 
                  onClick={() => removeFile(file.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <FileUp size={32} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Knowledge Base Vuota</p>
              <p className="text-xs text-slate-400 mt-1">Carica file .docx, .pdf, .xlsx, .csv, .jpg o .png</p>
            </div>
          </div>
        )}

        <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-start space-x-4">
          <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-blue-900">Analisi Multimodale Attiva</p>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              Gemini analizzerà direttamente il contenuto dei file caricati per garantire che ogni post e strategia sia 100% allineato ai tuoi dati aziendali, 
              listini prezzi, guide di stile e report reali.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Cluster Fondamentale */}
      <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm space-y-10">
        <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
          <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl shadow-slate-200">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Fondamenta Master</h3>
            <p className="text-sm text-slate-500 font-medium">L'essenza del business e l'identità legale.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FieldWrapper id="name" label="Nome Brand" icon={Type} canRefine={false} data={data} refiningField={refiningField} handleRefine={handleRefine}>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-900"
              placeholder="es. Acme Tech Solutions"
            />
          </FieldWrapper>

          <FieldWrapper id="websiteUrl" label="URL Sito Web" icon={Globe} canRefine={false} data={data} refiningField={refiningField} handleRefine={handleRefine}>
            <input
              type="url"
              value={data.websiteUrl}
              onChange={(e) => onChange({ ...data, websiteUrl: e.target.value })}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-900"
              placeholder="https://acme-tech.com"
            />
          </FieldWrapper>

          <FieldWrapper id="linkedinUrl" label="URL Pagina/Profilo LinkedIn" icon={Linkedin} canRefine={false} data={data} refiningField={refiningField} handleRefine={handleRefine}>
            <input
              type="url"
              value={data.linkedinUrl}
              onChange={(e) => onChange({ ...data, linkedinUrl: e.target.value })}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-900"
              placeholder="https://linkedin.com/company/il-tuo-brand"
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FieldWrapper id="description" label="Vision & Brand Story" icon={Eye} data={data} refiningField={refiningField} handleRefine={handleRefine}>
            <textarea
              value={data.description}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              rows={4}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-medium leading-relaxed no-scrollbar"
              placeholder="Dove volete arrivare tra 5 anni?"
            />
          </FieldWrapper>

          <FieldWrapper id="mission" label="Mission Operativa" icon={Rocket} data={data} refiningField={refiningField} handleRefine={handleRefine}>
            <textarea
              value={data.mission}
              onChange={(e) => onChange({ ...data, mission: e.target.value })}
              rows={4}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-medium leading-relaxed no-scrollbar"
              placeholder="Cosa fate ogni giorno per i vostri clienti?"
            />
          </FieldWrapper>
        </div>
      </section>

      {/* 3. Cluster Identità Strategica */}
      <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm space-y-10">
        <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
          <div className="p-4 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-200">
            <Sparkles size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Identità & Posizionamento</h3>
            <p className="text-sm text-slate-500 font-medium">Ciò che rende il brand unico sul mercato.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FieldWrapper id="usp" label="USP (Unique Selling Proposition)" icon={Target} data={data} refiningField={refiningField} handleRefine={handleRefine}>
            <textarea
              value={data.usp}
              onChange={(e) => onChange({ ...data, usp: e.target.value })}
              rows={3}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-medium"
              placeholder="Perché scegliere voi invece di un concorrente?"
            />
          </FieldWrapper>

          <FieldWrapper id="values" label="Valori di Brand" icon={Heart} data={data} refiningField={refiningField} handleRefine={handleRefine}>
            <textarea
              value={data.values}
              onChange={(e) => onChange({ ...data, values: e.target.value })}
              rows={3}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-medium"
              placeholder="Trasparenza, Velocità, Empatia..."
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FieldWrapper id="brandPersonality" label="Brand Personality" icon={User} data={data} refiningField={refiningField} handleRefine={handleRefine}>
            <input
              type="text"
              value={data.brandPersonality}
              onChange={(e) => onChange({ ...data, brandPersonality: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900 text-xs"
              placeholder="es. Saggio, Ribelle, Amichevole..."
            />
          </FieldWrapper>

          <FieldWrapper id="toneOfVoice" label="Tono di Voce" icon={MessageSquare} data={data} refiningField={refiningField} handleRefine={handleRefine}>
            <input
              type="text"
              value={data.toneOfVoice}
              onChange={(e) => onChange({ ...data, toneOfVoice: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900 text-xs"
              placeholder="es. Autorevole, Ironico, Caldo..."
            />
          </FieldWrapper>

          <FieldWrapper id="visualKeywords" label="Visual Style Guide" icon={PenTool} data={data} refiningField={refiningField} handleRefine={handleRefine}>
            <input
              type="text"
              value={data.visualKeywords}
              onChange={(e) => onChange({ ...data, visualKeywords: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900 text-xs"
              placeholder="es. Minimal, Dark, Neon, Clean..."
            />
          </FieldWrapper>
        </div>
      </section>

      {/* 4. Cluster Mercato */}
      <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm space-y-10">
        <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
          <div className="p-4 bg-purple-600 text-white rounded-3xl shadow-xl shadow-purple-200">
            <Users size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Pubblico Primario</h3>
            <p className="text-sm text-slate-500 font-medium">A chi stiamo parlando veramente?</p>
          </div>
        </div>

        <FieldWrapper id="targetSummary" label="Sommario del Target Master" icon={Target} data={data} refiningField={refiningField} handleRefine={handleRefine}>
          <textarea
            value={data.targetSummary}
            onChange={(e) => onChange({ ...data, targetSummary: e.target.value })}
            rows={4}
            className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-medium leading-relaxed"
            placeholder="Descrivi il tuo cliente ideale in modo sintetico prima di creare le Personas dettagliate."
          />
        </FieldWrapper>
      </section>

    </div>
  );
};

export default BrandKBForm;
