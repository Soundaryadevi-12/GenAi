import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MetricsDashboard from './components/MetricsDashboard';
import KnowledgeGraph from './components/KnowledgeGraph';
import ChatInterface from './components/ChatInterface';
import api from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [documents, setDocuments] = useState([]);
  const [metrics, setMetrics] = useState({
    total_documents: 0,
    total_chunks: 0,
    total_concepts: 0,
    total_relationships: 0,
    storage_size_kb: 0,
  });

  const loadAppData = async () => {
    try {
      const docs = await api.fetchDocuments();
      setDocuments(docs || []);
      const met = await api.fetchDashboardMetrics();
      setMetrics(met || {});
    } catch (err) {
      console.error('Error loading app data:', err);
    }
  };

  useEffect(() => {
    loadAppData();
  }, [activeTab]);

  const handleUploadSuccess = async () => {
    await loadAppData();
  };

  const handleDeleteDocument = async (docId) => {
    await api.deleteDocument(docId);
    await loadAppData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documentCount={documents.length}
      />

      {/* Main Body View Switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <MetricsDashboard
            metrics={metrics}
            documents={documents}
            onUploadSuccess={handleUploadSuccess}
            onDeleteDocument={handleDeleteDocument}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'graph' && <KnowledgeGraph />}

        {activeTab === 'chat' && <ChatInterface documentCount={documents.length} />}
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500 font-medium">
        DocInsight AI MVP • Powered by Python FastAPI, ChromaDB, LangChain & React Flow
      </footer>
    </div>
  );
}

export default App;
