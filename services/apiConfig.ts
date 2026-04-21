
// API URL: In sviluppo punta a localhost, in produzione userà la variabile d'ambiente di Vercel
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper per gestire l'invio del token JWT nelle richieste
export const getAuthHeaders = () => {
  const token = localStorage.getItem('brand_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};
