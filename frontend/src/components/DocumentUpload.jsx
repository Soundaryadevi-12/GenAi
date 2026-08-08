import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, Trash2, CheckCircle2, FileText, FileSpreadsheet, AlertCircle, RefreshCw } from 'lucide-react';
import { ProcessingPipeline } from './ProcessingPipeline';
import api from '../services/api';

export const DocumentUpload = ({ documents, onUploadSuccess, onDeleteDocument }) => {
  const [uploading, setUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState('');
  const [pipelineStage, setPipelineStage] = useState(0);
  const [error, setError] = useState(null);

  const handleUpload = async (fileList) => {
    setUploading(true);
    setError(null);
    setCurrentFile(fileList.map(f => f.name).join(', '));
    setPipelineStage(0);

    try {
      // Optimistically animate stages 1-3 (fast local ops) while upload sends
      setPipelineStage(1);
      await new Promise((r) => setTimeout(r, 250));
      setPipelineStage(2);

      // Perform actual upload — backend runs all 7 stages synchronously
      const result = await api.uploadDocuments(fileList);

      // Animate through remaining stages after completion
      for (let stage = 3; stage <= 7; stage++) {
        setPipelineStage(stage);
        await new Promise((r) => setTimeout(r, 180));
      }

      // Notify parent to refresh document list & metrics
      await onUploadSuccess();
      setPipelineStage(8); // "Ready for RAG" — final stage
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles);
      }
    },
  });

  const getFileIcon = (type) => {
    switch (type?.toUpperCase()) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-rose-400" />;
      case 'DOCX':
        return <File className="w-5 h-5 text-blue-400" />;
      case 'CSV':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      default:
        return <FileText className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Upload Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-cyan-500 bg-cyan-950/30 scale-[1.01]'
            : 'border-slate-800 bg-slate-900/40 hover:border-cyan-500/50 hover:bg-slate-900/80'
        }`}
      >
        <input {...getInputProps()} />
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-200 mb-1">
          {isDragActive ? 'Drop your documents here' : 'Drag & Drop Documents to Index'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
          Upload PDF, DOCX, CSV, or TXT files. Automatic chunking, OpenAI embeddings, ChromaDB indexing, and Knowledge Graph extraction will run instantly.
        </p>
        <div className="flex justify-center items-center gap-2">
          {['PDF', 'DOCX', 'CSV', 'TXT'].map((ext) => (
            <span key={ext} className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              .{ext.toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      {/* 7-Stage Visible Pipeline */}
      {(uploading || pipelineStage > 0 || error) && (
        <ProcessingPipeline
          filename={currentFile}
          currentStageIndex={pipelineStage}
          isProcessing={uploading}
          error={error}
        />
      )}

      {/* Uploaded Documents List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
        <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
          <span>Uploaded Knowledge Sources ({documents.length})</span>
          <span className="text-xs font-normal text-slate-400">Indexed in ChromaDB</span>
        </h4>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No documents uploaded yet. Upload a PDF, DOCX, CSV, or TXT file above to start.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {documents.map((doc) => (
              <div key={doc.id} className="py-3 flex items-center justify-between group hover:bg-slate-800/30 px-2 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-200">{doc.filename}</h5>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-0.5">
                      <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span className="text-cyan-400">{doc.chunk_count} Chunks</span>
                      <span>•</span>
                      <span className="text-emerald-400">Status: {doc.status}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteDocument(doc.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Delete Document & Remove from ChromaDB/Graph"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
