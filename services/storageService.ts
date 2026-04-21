
import { BrandProject } from '../types';
import { API_URL, getAuthHeaders } from './apiConfig';

export const storageService = {
  getProjects: async (userId: string): Promise<BrandProject[]> => {
    try {
      const response = await fetch(`${API_URL}/projects/`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token scaduto o non valido
          localStorage.removeItem('brand_auth_user');
          localStorage.removeItem('brand_auth_token');
          window.location.reload();
        }
        throw new Error("Errore nel recupero progetti");
      }
      
      return await response.json();
    } catch (e) {
      console.error("Storage Service Error:", e);
      return [];
    }
  },

  saveProjects: async (userId: string, projects: BrandProject[]): Promise<void> => {
    // In questa nuova architettura, salviamo i progetti uno per uno o aggiorniamo l'intero stato.
    // Per mantenere compatibilità con il frontend attuale che chiama saveProjects con l'intero array:
    for (const project of projects) {
      await storageService.saveProject(project);
    }
  },

  saveProject: async (project: BrandProject): Promise<BrandProject> => {
    const response = await fetch(`${API_URL}/projects/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(project)
    });

    if (!response.ok) throw new Error("Errore nel salvataggio del progetto");
    return await response.json();
  },

  deleteProject: async (projectId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) throw new Error("Errore nell'eliminazione del progetto");
  }
};
