
import { User } from '../types';

const AUTH_KEY = 'brand_auth_user';
const USERS_DB = 'brand_registered_users';

export const authService = {
  getCurrentUser: (): User | null => {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Errore recupero utente corrente:", e);
      return null;
    }
  },

  login: async (email: string, pass: string): Promise<User> => {
    // Simulazione latenza rete
    await new Promise(r => setTimeout(r, 800));
    
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem(USERS_DB) || '[]');
    } catch (e) {
      users = [];
    }

    const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    
    if (!user) throw new Error("Email o password non corretti.");
    
    const { password, ...userWithoutPass } = user;
    localStorage.setItem(AUTH_KEY, JSON.stringify(userWithoutPass));
    return userWithoutPass as User;
  },

  register: async (name: string, email: string, pass: string): Promise<User> => {
    await new Promise(r => setTimeout(r, 1000));
    
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem(USERS_DB) || '[]');
    } catch (e) {
      users = [];
    }

    if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Email già registrata. Effettua il login.");
    }
    
    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email: email.toLowerCase(),
      password: pass,
      createdAt: new Date().toISOString(),
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`
    };
    
    users.push(newUser);
    localStorage.setItem(USERS_DB, JSON.stringify(users));
    
    const { password, ...userWithoutPass } = newUser;
    localStorage.setItem(AUTH_KEY, JSON.stringify(userWithoutPass));
    return userWithoutPass as User;
  },

  logout: () => {
    localStorage.removeItem(AUTH_KEY);
  }
};
