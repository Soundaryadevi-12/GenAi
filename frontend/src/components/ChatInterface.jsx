import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, ChevronDown, ChevronUp, Sparkles, Loader2, BookOpen } from 'lucide-react';
import api from '../services/api';

export const ChatInterface = ({ documentCount }) => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am DocInsight AI. Ask me questions about your uploaded documents. I will retrieve context from ChromaDB and provide exact source citations.',
      citations: [],
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [openCitationIdx, setOpenCitationIdx] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (questionText = inputQuestion) => {
    const q = questionText.trim();
    if (!q || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.queryRAGChat(q, history);

      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.answer,
        citations: res.citations || [],
        usedMock: res.used_mock,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error retrieving answer: ${err.response?.data?.detail || err.message}. Make sure documents are uploaded.`,
        citations: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "What are the main concepts covered in the documents?",
    "Summarize the key timelines and requirements.",
    "Which technologies are referenced across the knowledge sources?",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>RAG Semantic Q&A Assistant</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">ChromaDB Store</span>
            </h3>
            <p className="text-[11px] text-slate-400">Grounded responses with inline source document citations</p>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          {documentCount} Document{documentCount !== 1 ? 's' : ''} Indexed
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/60">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 max-w-4xl ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white'
              }`}
            >
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            {/* Bubble content */}
            <div className={`space-y-3 max-w-2xl ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg'
                    : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-none shadow-lg'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {msg.usedMock && (
                  <div className="mt-2 text-[10px] text-cyan-400/80 italic font-mono">
                    * Extracted from grounded document context
                  </div>
                )}
              </div>

              {/* Source Citations Accordion */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden text-left">
                  <div className="px-3 py-2 bg-slate-900 flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-slate-800">
                    <span className="flex items-center space-x-1.5 text-cyan-400">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Retrieved Source Citations ({msg.citations.length})</span>
                    </span>
                  </div>
                  <div className="divide-y divide-slate-800/60">
                    {msg.citations.map((cite, idx) => (
                      <div key={idx} className="p-3 text-xs">
                        <div className="flex items-center justify-between font-medium text-slate-200">
                          <span className="flex items-center space-x-1.5 font-bold text-cyan-300">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cite.document_name}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                            {cite.page_or_row}
                          </span>
                        </div>
                        <p className="mt-1.5 text-slate-400 font-mono text-[11px] bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                          &ldquo;{cite.snippet}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-4 max-w-4xl">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-400 text-sm flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Querying ChromaDB vector store and generating answer...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>



      {/* Input Bar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Ask anything about your uploaded documents..."
            disabled={loading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputQuestion.trim() || loading}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-sm hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg shadow-cyan-500/20"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
