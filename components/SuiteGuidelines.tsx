import React from 'react';
import { BrandKB } from '../types';
import { Shield, Linkedin, Newspaper, FileText, Mail } from 'lucide-react';

interface Props {
  brand: BrandKB;
  onUpdateBrand: (updater: BrandKB | ((prev: BrandKB) => BrandKB)) => void;
}

const SuiteGuidelines: React.FC<Props> = ({ brand, onUpdateBrand }) => {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4 px-2">
        <div className="p-3 bg-slate-900 text-white rounded-lg shadow-lg"><Shield size={24} /></div>
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase">Suite Guidelines</h3>
          <p className="text-xs text-slate-500 font-medium">Definisci le regole master per ogni singolo formato editoriale.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-blue-600">
            <Linkedin size={18} />
            <h4 className="text-xs font-black uppercase tracking-widest">LinkedIn Post Guidelines</h4>
          </div>
          <textarea value={brand.linkedinGuidelines} onChange={e => onUpdateBrand(prev => ({...prev, linkedinGuidelines: e.target.value}))} className="w-full h-64 p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs font-mono leading-relaxed focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all" />
        </div>
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600">
            <Newspaper size={18} />
            <h4 className="text-xs font-black uppercase tracking-widest">LinkedIn Newsletter Guidelines</h4>
          </div>
          <textarea value={brand.linkedinNewsletterGuidelines} onChange={e => onUpdateBrand(prev => ({...prev, linkedinNewsletterGuidelines: e.target.value}))} className="w-full h-64 p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs font-mono leading-relaxed focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all" />
        </div>
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-emerald-600">
            <FileText size={18} />
            <h4 className="text-xs font-black uppercase tracking-widest">LinkedIn Articoli Guidelines</h4>
          </div>
          <textarea value={brand.linkedinArticleGuidelines} onChange={e => onUpdateBrand(prev => ({...prev, linkedinArticleGuidelines: e.target.value}))} className="w-full h-64 p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs font-mono leading-relaxed focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all" />
        </div>
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-purple-600">
            <Mail size={18} />
            <h4 className="text-xs font-black uppercase tracking-widest">Email Newsletter Guidelines</h4>
          </div>
          <textarea value={brand.newsletterGuidelines} onChange={e => onUpdateBrand(prev => ({...prev, newsletterGuidelines: e.target.value}))} className="w-full h-64 p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs font-mono leading-relaxed focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all" />
        </div>
      </div>
    </div>
  );
};

export default SuiteGuidelines;
