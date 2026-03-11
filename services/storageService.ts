
import { BrandProject } from '../types';

const PROJECTS_DB = 'brand_projects_cloud';

export const storageService = {
  getProjects: async (userId: string): Promise<BrandProject[]> => {
    // Simulazione latenza rete
    await new Promise(r => setTimeout(r, 400));
    const allProjects = JSON.parse(localStorage.getItem(PROJECTS_DB) || '[]');
    return allProjects.filter((p: BrandProject) => p.userId === userId);
  },

  saveProjects: async (userId: string, projects: BrandProject[]): Promise<void> => {
    // In un'app reale questa sarebbe una chiamata API
    const allProjects = JSON.parse(localStorage.getItem(PROJECTS_DB) || '[]');
    
    // Filtriamo i progetti che non appartengono a questo utente
    const otherUsersProjects = allProjects.filter((p: BrandProject) => p.userId !== userId);
    
    // Uniamo i progetti filtrati con i nuovi/aggiornati dell'utente attuale
    const updatedDb = [...otherUsersProjects, ...projects];
    localStorage.setItem(PROJECTS_DB, JSON.stringify(updatedDb));
  },

  deleteProject: async (projectId: string): Promise<void> => {
    const allProjects = JSON.parse(localStorage.getItem(PROJECTS_DB) || '[]');
    const updated = allProjects.filter((p: BrandProject) => p.id !== projectId);
    localStorage.setItem(PROJECTS_DB, JSON.stringify(updated));
  }
};
