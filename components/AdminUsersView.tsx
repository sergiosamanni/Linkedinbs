
import React, { useState, useEffect } from 'react';
import { User, BrandProject } from '../types';
import { adminService } from '../services/adminService';
import { Plus, Trash2, UserPlus, Shield, Check, X, Building, Mail, User as UserIcon, Loader2 } from 'lucide-react';

interface Props {
  projects: BrandProject[];
  onUpdateProject: (project: BrandProject) => void;
  onGlobalError: (error: any) => void;
}

const AdminUsersView: React.FC<Props> = ({ projects, onUpdateProject, onGlobalError }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New user form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers();
      setUsers(data.filter(u => u.role !== 'admin')); // Only show non-admin users
    } catch (e) {
      onGlobalError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newName || !newEmail || !newPassword) return;
    setCreating(true);
    try {
      await adminService.registerUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: 'user'
      });
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      loadUsers();
    } catch (e) {
      onGlobalError(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo utente?")) return;
    try {
      await adminService.deleteUser(userId);
      loadUsers();
    } catch (e) {
      onGlobalError(e);
    }
  };

  const toggleBrandAccess = (userEmail: string, project: BrandProject) => {
    const collabs = project.collaborators || [];
    const hasAccess = collabs.includes(userEmail);
    
    let newCollabs;
    if (hasAccess) {
      newCollabs = collabs.filter(email => email !== userEmail);
    } else {
      newCollabs = [...collabs, userEmail];
    }
    
    onUpdateProject({ ...project, collaborators: newCollabs });
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-sm font-black uppercase tracking-widest">Caricamento Utenti...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <h3 className="text-2xl font-black text-slate-900">Gestione Utenti & Team</h3>
          <p className="text-sm text-slate-500 font-medium">Crea account per i tuoi collaboratori e assegna loro l'accesso ai brand.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center space-x-3 shadow-xl hover:bg-slate-800 transition-all"
        >
          <UserPlus size={18} />
          <span>Nuovo Utente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {users.map(user => (
          <div key={user.id} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              {/* User Info */}
              <div className="flex items-center space-x-6 min-w-0">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                  <UserIcon size={32} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xl font-black text-slate-900 truncate">{user.name}</h4>
                  <p className="text-sm text-slate-400 font-medium flex items-center mt-1">
                    <Mail size={14} className="mr-2" /> {user.email}
                  </p>
                  <div className="flex items-center mt-3 space-x-2">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-md border border-blue-100">User</span>
                    <span className="text-[10px] text-slate-300 font-bold italic">Creato il {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Brand Access Management */}
              <div className="flex-1 lg:max-w-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Accesso ai Brand</p>
                <div className="flex flex-wrap gap-2">
                  {projects.map(project => {
                    const hasAccess = project.collaborators?.includes(user.email);
                    return (
                      <button
                        key={project.id}
                        onClick={() => toggleBrandAccess(user.email, project)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                          hasAccess 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                            : 'bg-slate-50 border-slate-100 text-slate-400 grayscale hover:grayscale-0 hover:border-slate-200'
                        }`}
                      >
                        <Building size={14} />
                        <span>{project.brand.name}</span>
                        {hasAccess ? <Check size={14} className="ml-1" /> : <Plus size={14} className="ml-1 opacity-40" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="shrink-0 flex justify-end">
                <button 
                  onClick={() => handleDeleteUser(user.id)}
                  className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  title="Elimina Utente"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="py-20 text-center space-y-4 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem]">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Users size={32} />
            </div>
            <div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Nessun utente creato</p>
              <p className="text-xs text-slate-400 mt-1">Inizia creando un account per un tuo collaboratore.</p>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">Nuovo Account Utente</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Compila i dati per l'accesso</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Nome Completo</label>
                <input 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" 
                  placeholder="Mario Rossi"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Email di Accesso</label>
                <input 
                  type="email"
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" 
                  placeholder="mario@agency.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Password Iniziale</label>
                <input 
                  type="password"
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" 
                  placeholder="••••••••"
                />
              </div>

              <button 
                onClick={handleCreateUser}
                disabled={creating || !newName || !newEmail || !newPassword}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center space-x-3 shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>Crea Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersView;
