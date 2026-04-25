
import { AppUser } from '../types';
import { API_URL, getAuthHeaders } from './apiConfig';

const AUTH_KEY = 'brand_auth_user';
const TOKEN_KEY = 'brand_auth_token';

export const authService = {
  getCurrentUser: (): AppUser | null => {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Errore recupero utente corrente:", e);
      return null;
    }
  },

  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  login: async (email: string, pass: string): Promise<AppUser> => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', pass);

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Email o password non corretti.");
    }

    const data = await response.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);

    // Dopo il login, recuperiamo i dati dell'utente
    const userResponse = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders()
    });

    if (!userResponse.ok) throw new Error("Errore nel recupero profilo utente");
    
    const user = await userResponse.json();
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user as AppUser;
  },

  register: async (name: string, email: string, pass: string): Promise<AppUser> => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pass })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Errore durante la registrazione.");
    }

    // Dopo la registrazione, facciamo il login automatico
    return authService.login(email, pass);
  },

  updateSettings: async (updates: Partial<AppUser>): Promise<AppUser> => {
    const response = await fetch(`${API_URL}/auth/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Errore durante l'aggiornamento delle impostazioni.");
    }

    const updatedUser = await response.json();
    localStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
    return updatedUser as AppUser;
  },

  logout: () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
};
