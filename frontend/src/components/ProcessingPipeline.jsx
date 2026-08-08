import React from 'react';
import { Upload, FileText, Scissors, Cpu, Database, Network, Share2, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const STAGES = [
  { id: 1, label: 'Upload Documents', icon: Upload },
  { id: 2, label: 'Text Extraction', icon: FileText },
  { id: 3, label: 'Chunking', icon: Scissors },
  { id: 4, label: 'Embedding Gen', icon: Cpu },
  { id: 5, label: 'ChromaDB Store', icon: Database },
  { id: 6, label: 'Concept Extraction', icon: Network },
  { id: 7, label: 'Graph Generation', icon: Share2 },
  { id: 8, label: 'Ready for RAG', icon: CheckCircle2 },
];

export const ProcessingPipeline = ({ filename, currentStageIndex = 0, isProcessing = false, error = null }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-xl my-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            {isProcessing && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
            Document Processing Pipeline
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            File: <span className="text-cyan-300 font-semibold">{filename || 'Document'}</span>
          </p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
          error ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
          isProcessing ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse' :
          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }`}>
          {error ? 'Processing Failed' : isProcessing ? 'Processing...' : 'Indexed & Ready'}
        </span>
      </div>

      {/* Pipeline 8-Stage Progress Track */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 relative">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = idx < currentStageIndex || (!isProcessing && !error);
          const isCurrent = idx === currentStageIndex && isProcessing;
          const isPending = idx > currentStageIndex && isProcessing;

          return (
            <div
              key={stage.id}
              className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all duration-300 ${
                isCurrent
                  ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 ring-2 ring-cyan-500/30'
                  : isDone
                  ? 'bg-slate-800/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${
                isCurrent
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : isDone
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className="text-[11px] font-semibold leading-tight line-clamp-2">{stage.label}</span>
              <span className="text-[9px] mt-1 font-mono opacity-70">Stage {stage.id}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ProcessingPipeline;
