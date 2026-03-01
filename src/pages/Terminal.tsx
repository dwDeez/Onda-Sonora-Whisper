import { useState, useRef, useEffect } from 'react';
import { ollama } from '../services/ollamaApi';
import { useLocation } from 'react-router-dom';
import { promptService } from '../services/promptService';
import { useUser } from '../contexts/UserContext';
import { useInteractionTimer } from '../hooks/useInteractionTimer';

export default function Terminal() {
  const { currentUser } = useUser();
  const location = useLocation();
  const context = (location.state as any)?.context || 'CASUAL';
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, timestamp: Date }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const { activeSeconds, resetTimer } = useInteractionTimer();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    inputRef.current?.focus();

    if (messages.length === 0) {
      resetTimer();
    }

    setMessages(prev => [...prev, { role: 'user', text: userMessage, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      const ollamaMessages = messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text
      }));
      ollamaMessages.push({ role: 'user', content: userMessage });

      const systemInstruction = promptService.getSystemInstruction(context);
      const responseText = await ollama.generateChatResponse(ollamaMessages, systemInstruction);

      setMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: new Date() }]);
    } catch (error: any) {
      console.error('Error generating response:', error);
      const errorMsg = error.message || 'Connection to AI core failed.';
      setMessages(prev => [...prev, { role: 'model', text: `⚠ ${errorMsg}`, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveChat = async () => {
    if (!currentUser || messages.length === 0 || isArchiving) return;
    setIsArchiving(true);
    setArchiveStatus('analyzing');

    try {
      const ollamaMessages = messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text
      }));

      const analysis = await ollama.analyzeWritingSession(ollamaMessages, context);

      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          title: analysis.title,
          context: context,
          score: analysis.score,
          practice_type: 'WRITING',
          duration: activeSeconds,
          issues: analysis.issues
        })
      });

      setArchiveStatus('done');
      setTimeout(() => setArchiveStatus('idle'), 4000);
    } catch (err) {
      console.error('Failed to archive terminal session:', err);
      setArchiveStatus('error');
      setTimeout(() => setArchiveStatus('idle'), 3000);
    } finally {
      setIsArchiving(false);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const userMsgCount = messages.filter(m => m.role === 'user').length;

  const archiveBtnLabel = {
    idle: 'ANALYZE & SAVE',
    analyzing: 'ANALYZING...',
    done: 'SESSION_SAVED ✓',
    error: 'SAVE_FAILED',
  }[archiveStatus];

  const archiveBtnClass = {
    idle: 'bg-surface border-[#333] text-muted hover:text-white hover:border-primary/50',
    analyzing: 'bg-primary/10 border-primary/50 text-primary animate-pulse',
    done: 'bg-primary/20 border-primary text-primary',
    error: 'bg-accent/10 border-accent text-accent',
  }[archiveStatus];

  return (
    <div className="flex flex-col h-full w-full">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

      <header className="flex flex-shrink-0 items-center justify-between px-8 py-6 border-b border-[#1f2b25] bg-background-dark/80 backdrop-blur-md z-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold text-white tracking-tighter">THE_TERMINAL</h2>
          <div className="flex items-center gap-4 text-muted text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span>AI_CORE // CONTEXT: {context}</span>
            </div>
            {userMsgCount > 0 && (
              <div className="flex items-center gap-2 border-l border-[#1f2b25] pl-4">
                <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
                <span>{userMsgCount} EXCHANGE{userMsgCount !== 1 ? 'S' : ''}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={saveChat}
              disabled={isArchiving || archiveStatus === 'done'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all font-mono text-xs ${archiveBtnClass}`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {archiveStatus === 'done' ? 'done' : archiveStatus === 'analyzing' ? 'psychology' : archiveStatus === 'error' ? 'error' : 'archive'}
              </span>
              {archiveBtnLabel}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <span className="material-symbols-outlined text-primary/30 text-[64px]">terminal</span>
            <p className="text-muted font-mono text-sm tracking-widest uppercase">AWAITING_INPUT</p>
            <p className="text-muted/50 text-xs font-mono max-w-sm">
              Start typing to begin your {context.toLowerCase()} practice session. Your AI partner is ready.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[78%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 opacity-40">
                <span className="material-symbols-outlined text-[12px]">
                  {msg.role === 'user' ? 'person' : 'smart_toy'}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest">
                  {msg.role === 'user' ? 'YOU' : 'AI_PARTNER'} · {formatTime(msg.timestamp)}
                </span>
              </div>
              <div className={`rounded-xl px-5 py-3.5 text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-primary/10 border border-primary/30 text-white rounded-tr-sm'
                  : 'bg-surface border border-[#2a3830] text-gray-300 rounded-tl-sm'
                }`}>
                <div className="whitespace-pre-wrap font-light">
                  {msg.text}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="flex flex-col gap-1 items-start">
              <div className="flex items-center gap-2 opacity-40">
                <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                <span className="text-[10px] font-mono uppercase tracking-widest">AI_PARTNER</span>
              </div>
              <div className="rounded-xl rounded-tl-sm px-5 py-4 bg-surface border border-primary/20 text-primary">
                <div className="flex gap-1.5 items-center h-4">
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 bg-background-dark border-t border-[#1f2b25]">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary material-symbols-outlined pointer-events-none">chevron_right</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="ENTER_MESSAGE..."
              maxLength={500}
              className="w-full bg-surface border border-[#333] text-white rounded-xl pl-12 pr-16 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-muted font-mono text-sm transition-all"
            />
            {input.length > 0 && (
              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono ${input.length > 450 ? 'text-accent' : 'text-muted/50'}`}>
                {input.length}/500
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-background-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
        {userMsgCount === 0 && (
          <p className="text-muted/40 text-[10px] font-mono mt-2 pl-1 uppercase tracking-widest">
            Tip: Practice for a few exchanges, then click ANALYZE &amp; SAVE to get AI feedback.
          </p>
        )}
      </div>
    </div>
  );
}
