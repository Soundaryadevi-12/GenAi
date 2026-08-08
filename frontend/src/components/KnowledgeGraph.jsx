import React, { useState, useEffect } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network, FileText, Share2, Info, X, Layers, Sparkles } from 'lucide-react';
import api from '../services/api';

export const KnowledgeGraph = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [nodeDetail, setNodeDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadGraph = async () => {
    try {
      setLoading(true);
      const data = await api.fetchGraphData();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (err) {
      console.error('Error fetching graph data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, []);

  const handleNodeClick = async (_, node) => {
    setSelectedNodeId(node.id);
    try {
      const detail = await api.fetchNodeDetails(node.id);
      setNodeDetail(detail);
    } catch (err) {
      console.error('Error fetching node details:', err);
      // Fallback inspector detail from node data
      setNodeDetail({
        node: {
          id: node.id,
          label: node.data?.label || node.id,
          category: node.data?.category || 'Concept',
          description: node.data?.description || 'Extracted concept node',
          doc_sources: node.data?.doc_sources || []
        },
        connected_nodes: [],
        related_documents: []
      });
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-120px)] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header bar overlay */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
          <Network className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-200">Interactive Concept Knowledge Graph</h3>
          <p className="text-[11px] text-slate-400">Click any node to inspect connected concepts & documents</p>
        </div>
        <button
          onClick={loadGraph}
          className="ml-4 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          Refresh Graph
        </button>
      </div>

      {/* Category Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-4 py-3 rounded-xl text-xs space-y-1.5 shadow-xl">
        <span className="font-bold text-slate-300 text-[11px] block uppercase tracking-wider mb-1">Concept Categories</span>
        {[
          { label: 'Concept',      color: '#6366f1' },
          { label: 'Technology',   color: '#06b6d4' },
          { label: 'Organization', color: '#f59e0b' },
          { label: 'Process',      color: '#10b981' },
          { label: 'Document',     color: '#a855f7' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-slate-300">{label}</span>
          </div>
        ))}
      </div>

      {/* React Flow Canvas */}
      {loading ? (
        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
          Loading Knowledge Graph Canvas...
        </div>
      ) : nodes.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-sm space-y-3">
          <Share2 className="w-12 h-12 text-slate-600 animate-pulse" />
          <p className="font-medium">No Knowledge Graph generated yet.</p>
          <p className="text-xs text-slate-500 max-w-sm text-center">
            Upload PDF, DOCX, CSV, or TXT documents on the Dashboard to automatically extract concepts and build relationships.
          </p>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          colorMode="dark"
        >
          <Background color="#1e293b" gap={16} />
          <Controls />
        </ReactFlow>
      )}

      {/* Requirement #3: Node Inspector Drawer */}
      {nodeDetail && (
        <div className="absolute top-0 right-0 w-80 sm:w-96 h-full bg-slate-900/95 border-l border-slate-800 backdrop-blur-xl p-6 overflow-y-auto z-20 shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h4 className="font-extrabold text-slate-100 text-sm">Node Inspector</h4>
            </div>
            <button
              onClick={() => setNodeDetail(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-5 space-y-6">
            {/* Target Node Overview */}
            {(() => {
              const BADGE_STYLES = {
                Concept:      { bg: 'rgba(99,102,241,0.15)',  border: '#6366f1', color: '#a5b4fc' },
                Technology:   { bg: 'rgba(6,182,212,0.15)',   border: '#06b6d4', color: '#67e8f9' },
                Organization: { bg: 'rgba(245,158,11,0.15)',  border: '#f59e0b', color: '#fcd34d' },
                Process:      { bg: 'rgba(16,185,129,0.15)',  border: '#10b981', color: '#6ee7b7' },
                Document:     { bg: 'rgba(168,85,247,0.15)',  border: '#a855f7', color: '#d8b4fe' },
              };
              const bs = BADGE_STYLES[nodeDetail.node.category] || { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', color: '#93c5fd' };
              return (
                <div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                    style={{ backgroundColor: bs.bg, border: `1px solid ${bs.border}`, color: bs.color }}
                  >
                    {nodeDetail.node.category}
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-2">{nodeDetail.node.label}</h3>
                  <p className="text-xs text-slate-400 mt-1">{nodeDetail.node.description || 'Extracted graph concept.'}</p>
                </div>
              );
            })()}

            {/* Connected Concepts */}
            <div>
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Connected Concepts ({nodeDetail.connected_nodes?.length || 0})</span>
              </h5>
              {nodeDetail.connected_nodes?.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No connected neighbor concepts.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {nodeDetail.connected_nodes.map((c) => (
                    <span
                      key={c.id}
                      className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700"
                    >
                      {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Related Source Documents */}
            <div>
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Source Documents ({nodeDetail.related_documents?.length || nodeDetail.node.doc_sources?.length || 0})</span>
              </h5>
              {(nodeDetail.related_documents?.length === 0 && nodeDetail.node.doc_sources?.length === 0) ? (
                <p className="text-xs text-slate-500 italic">Associated with ingested text chunks.</p>
              ) : nodeDetail.related_documents?.length > 0 ? (
                <div className="space-y-2">
                  {nodeDetail.related_documents.map((doc) => (
                    <div key={doc.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="text-slate-200 font-semibold truncate flex-1">{doc.filename}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          {doc.file_type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-[10px] text-slate-500 pl-6">
                        <span>{doc.chunk_count} chunks</span>
                        <span>•</span>
                        <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback: show raw doc IDs if related_documents not available
                <div className="space-y-2">
                  {nodeDetail.node.doc_sources.map((sourceId) => (
                    <div key={sourceId} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-slate-400 font-mono truncate">{sourceId}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraph;
