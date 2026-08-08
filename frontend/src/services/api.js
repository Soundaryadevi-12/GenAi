import axios from 'axios';

// In dev: baseURL is '' so Vite's /api proxy intercepts all /api/* requests.
// In production: set VITE_API_BASE_URL to the backend origin ONLY (no /api suffix),
//   e.g. https://your-backend.vercel.app — the /api/ prefix is included in each path below.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

export const api = {
  // ── Documents ────────────────────────────────────────────────────────────────
  fetchDocuments: async () => {
    const res = await client.get('/api/documents');
    return res.data;
  },

  uploadDocuments: async (files) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    const res = await client.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  fetchDocumentStatus: async (docId) => {
    const res = await client.get(`/api/documents/${docId}/status`);
    return res.data;
  },

  deleteDocument: async (docId) => {
    const res = await client.delete(`/api/documents/${docId}`);
    return res.data;
  },

  // ── RAG Chat ─────────────────────────────────────────────────────────────────
  queryRAGChat: async (question, history = []) => {
    const res = await client.post('/api/query', { question, history });
    return res.data;
  },

  // ── Knowledge Graph ───────────────────────────────────────────────────────────
  fetchGraphData: async () => {
    const res = await client.get('/api/graph/data');
    return res.data;
  },

  fetchNodeDetails: async (nodeId) => {
    const res = await client.get(`/api/graph/nodes/${nodeId}`);
    return res.data;
  },

  // ── Dashboard Metrics ─────────────────────────────────────────────────────────
  fetchDashboardMetrics: async () => {
    const res = await client.get('/api/graph/metrics');
    return res.data;
  },
};

export default api;

