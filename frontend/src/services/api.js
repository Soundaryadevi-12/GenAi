import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

export const api = {
  // Documents
  fetchDocuments: async () => {
    const res = await client.get('/documents');
    return res.data;
  },

  uploadDocuments: async (files) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    const res = await client.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  fetchDocumentStatus: async (docId) => {
    const res = await client.get(`/documents/${docId}/status`);
    return res.data;
  },

  deleteDocument: async (docId) => {
    const res = await client.delete(`/documents/${docId}`);
    return res.data;
  },

  // RAG Chat
  queryRAGChat: async (question, history = []) => {
    const res = await client.post('/query', { question, history });
    return res.data;
  },

  // Knowledge Graph
  fetchGraphData: async () => {
    const res = await client.get('/graph/data');
    return res.data;
  },

  fetchNodeDetails: async (nodeId) => {
    const res = await client.get(`/graph/nodes/${nodeId}`);
    return res.data;
  },

  // Dashboard Metrics
  fetchDashboardMetrics: async () => {
    const res = await client.get('/graph/metrics');
    return res.data;
  },
};

export default api;
