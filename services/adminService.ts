
import { User, BrandProject } from '../types';
import { API_URL, getAuthHeaders } from './apiConfig';

export const adminService = {
  getUsers: async (): Promise<User[]> => {
    const response = await fetch(`${API_URL}/auth/users`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Errore nel recupero utenti");
    return await response.json();
  },

  deleteUser: async (userId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Errore nell'eliminazione utente");
  },

  registerUser: async (userData: any): Promise<User> => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Errore nella creazione utente");
    }
    return await response.json();
  }
};
