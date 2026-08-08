import React from 'react';
import { FileText, Layers, Network, Share2, HardDrive, ArrowRight, Upload, Sparkles } from 'lucide-react';
import { DocumentUpload } from './DocumentUpload';

export const MetricsDashboard = ({
  metrics,
  documents,
  onUploadSuccess,
  onDeleteDocument,
  onNavigateTab
}) => {
  const statCards = [
    {
      title: 'Total Documents',
      value: metrics.total_documents || 0,
      sub: `${(metrics.storage_size_kb || 0).toFixed(1)} KB Storage`,
      icon: FileText,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'ChromaDB Chunks',
      value: metrics.total_chunks || 0,
      sub: 'Text vectors indexed',
      icon: Layers,
      color: 'from-cyan-500 to-teal-600',
    },
    {
      title: 'Extracted Concepts',
      value: metrics.total_concepts || 0,
      sub: 'Graph entities',
      icon: Network,
      color: 'from-amber-500 to-orange-600',
    },
    {
      title: 'Relationships',
      value: metrics.total_relationships || 0,
      sub: 'Concept linkages',
      icon: Share2,
      color: 'from-emerald-500 to-green-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Intelligent Knowledge Graph & Multi-Doc RAG</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            DocInsight AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Explorer</span>
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Upload PDF, DOCX, CSV, or TXT documents. Watch as text is parsed into overlapping chunks, indexed into <strong className="text-cyan-300">ChromaDB</strong>, and automatically synthesized into an interactive <strong className="text-indigo-300">React Flow Knowledge Graph</strong>.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigateTab('graph')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs hover:from-cyan-400 hover:to-indigo-500 flex items-center space-x-2 shadow-lg shadow-cyan-500/20"
            >
              <span>Explore Knowledge Graph</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateTab('chat')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 hover:text-white border border-slate-700 flex items-center space-x-2"
            >
              <span>Ask Questions in Chat</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md hover:border-slate-700 transition-all shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{card.title}</span>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-md`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-white">{card.value}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">{card.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Document Upload Widget & List */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Knowledge Source Management</h3>
        <DocumentUpload
          documents={documents}
          onUploadSuccess={onUploadSuccess}
          onDeleteDocument={onDeleteDocument}
        />
      </div>
    </div>
  );
};

export default MetricsDashboard;
