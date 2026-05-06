import { useState, FormEvent, useEffect } from 'react';
import { Search, Loader2, Globe, ArrowRight, Sparkles, ExternalLink, Copy, Check, Share2, CornerDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Source {
  title: string;
  url: string;
}

interface SearchResult {
  answer: string;
  sources: Source[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.content }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal melakukan pencarian');
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 selection:bg-blue-100 font-sans flex flex-col">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-b border-neutral-100 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-neutral-800">Andri AI</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="px-3 py-1 rounded-full bg-green-50 text-[10px] font-bold text-green-600 uppercase tracking-widest border border-green-100">
                Online
             </div>
          </div>
        </div>
      </nav>

      {/* Area Chat Utama */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 pt-24 pb-48 space-y-12">
        {messages.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-[50vh] flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
              <Sparkles className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter text-neutral-900 sm:text-5xl">
              Halo! Saya <span className="text-blue-600">Andri AI</span>
            </h1>
            <p className="text-neutral-500 max-w-sm mx-auto">
              Tanyakan apa saja pada saya. Saya siap membantu mencari informasi untuk Anda.
            </p>
          </motion.div>
        )}

        <div className="flex flex-col gap-8">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`relative max-w-[85%] sm:max-w-[75%] px-6 py-5 rounded-[2rem] shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-neutral-100 text-neutral-800 rounded-tl-none'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-between mb-4 border-b border-neutral-50 pb-3">
                    <div className="flex items-center gap-2">
                       <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                       <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Andri AI Respons</span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="p-1 px-2 rounded-lg hover:bg-neutral-50 text-neutral-400 transition-all flex items-center gap-1"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      <span className="text-[9px] uppercase font-bold tracking-tighter">{copiedId === msg.id ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                )}
                
                <div className={`markdown-container ${msg.role === 'user' ? 'text-white' : ''}`}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({children}) => <p className="mb-2 last:mb-0 leading-relaxed text-[1.05rem]">{children}</p>,
                      h1: ({children}) => <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>,
                      h2: ({children}) => <h2 className="text-lg font-bold mb-2 mt-4">{children}</h2>,
                      ul: ({children}) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                      code: ({children}) => <code className={`${msg.role === 'user' ? 'bg-blue-500' : 'bg-neutral-100'} px-1 rounded text-sm`}>{children}</code>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-neutral-100 rounded-[2rem] rounded-tl-none px-6 py-4 shadow-sm flex items-center gap-3">
                <div className="flex gap-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-blue-600/30 animate-bounce [animation-delay:-0.3s]" />
                   <span className="w-1.5 h-1.5 rounded-full bg-blue-600/60 animate-bounce [animation-delay:-0.15s]" />
                   <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
                </div>
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Andri AI sedang berpikir</span>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="flex justify-center p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#fafafa] via-[#fafafa] to-transparent">
        <div className="max-w-3xl mx-auto">
          <form 
            onSubmit={handleSearch}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-0 group-focus-within:opacity-10 transition duration-500" />
            
            <div className="relative bg-white border border-neutral-200 rounded-3xl flex items-center p-2 shadow-2xl shadow-blue-900/5 transition-all group-focus-within:border-blue-400">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik pesan di sini..."
                className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3.5 text-neutral-800 placeholder:text-neutral-400"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="bg-neutral-900 text-white p-3.5 rounded-2xl hover:bg-black disabled:opacity-20 transition-all flex items-center justify-center shrink-0"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </form>

          <footer className="mt-4 flex justify-between items-center px-2 text-[9px] text-neutral-400 font-bold uppercase tracking-[0.2em]">
            <p>© 2026 Andri AI oleh Andrison</p>
            <p className="hidden sm:block">Dibuat dengan Cerdas</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
