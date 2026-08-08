import React from 'react';
import { Network, Database, MessageSquare, LayoutDashboard, FileText, CheckCircle2 } from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab, documentCount }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'graph', label: 'Knowledge Graph', icon: Network },
    { id: 'chat', label: 'RAG Chat Q&A', icon: MessageSquare },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Network className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-white">DocInsight</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">AI</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Multi-Doc Graph & RAG Explorer</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* System Status Badge */}
        <div className="hidden md:flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <Database className="w-3.5 h-3.5" />
            <span>ChromaDB Active</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>{documentCount} Docs</span>
          </div>
        </div>

      </div>
    </header>
  );
};

export default Navbar;
