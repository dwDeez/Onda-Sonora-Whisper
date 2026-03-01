import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import VocabModal from '../components/VocabModal';
import VocabSuggestionModal from '../components/VocabSuggestionModal';
import CircularProgress from '../components/CircularProgress';
import FlashcardView from '../components/FlashcardView';
import { ollama } from '../services/ollamaApi';
import { useInteractionTimer } from '../hooks/useInteractionTimer';

interface Issue {
  id: number;
  type: string;
  description: string;
}

interface Session {
  id: number;
  title: string;
  context: string;
  date: string;
  score: number;
  practice_type: 'VOICE' | 'WRITING';
  duration: number;
  issues: Issue[];
}

interface Vocab {
  id: number;
  word: string;
  form: string;
  meaning: string;
  example: string;
}

export default function Archive() {
  const { currentUser, incrementReviewTime } = useUser();
  const { activeSeconds: flashcardActiveSeconds, resetTimer: resetFlashcardTimer } = useInteractionTimer();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [vocab, setVocab] = useState<Vocab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vocabFilter, setVocabFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVocabModalOpen, setIsVocabModalOpen] = useState(false);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
  const [selectedVocabWord, setSelectedVocabWord] = useState<Vocab | null>(null);

  const fetchData = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [sessionsRes, vocabRes] = await Promise.all([
        fetch(`/api/sessions?user_id=${currentUser.id}`),
        fetch(`/api/vocab?user_id=${currentUser.id}`)
      ]);

      if (!sessionsRes.ok || !vocabRes.ok) throw new Error('API request failed');

      const sessionsData = await sessionsRes.json();
      const vocabData = await vocabRes.json();
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setVocab(Array.isArray(vocabData) ? vocabData : []);
    } catch (err) {
      console.error('Failed to fetch archive data:', err);
      setSessions([]);
      setVocab([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const deleteSession = async (id: number) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const deleteVocabWord = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/vocab/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVocab(prev => prev.filter(v => v.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete vocab word:', err);
    }
  };

  const handleSaveWord = async (wordData: { word: string; form: string; meaning: string; example: string }) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, ...wordData })
      });
      if (res.ok) {
        const newWord: Vocab = await res.json();
        setVocab(prev => [newWord, ...prev]);
      }
    } catch (err) {
      console.error('Failed to save word:', err);
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'ALL' || session.context.toUpperCase() === activeFilter.toUpperCase();
    return matchesSearch && matchesFilter;
  });

  const filteredVocab = vocab.filter(v =>
    v.word.toLowerCase().includes(vocabFilter.toLowerCase()) ||
    v.meaning.toLowerCase().includes(vocabFilter.toLowerCase())
  );

  const openSessionDetails = (session: Session) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const openFlashcards = () => {
    if (filteredVocab.length === 0) return;
    resetFlashcardTimer();
    setIsFlashcardOpen(true);
  };

  const closeFlashcards = () => {
    if (flashcardActiveSeconds > 5) {
      incrementReviewTime(flashcardActiveSeconds);
    }
    setIsFlashcardOpen(false);
  };

  const openSingleFlashcard = (word: Vocab) => {
    setSelectedVocabWord(word);
  };

  const speakText = (text: string) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

      <header className="flex flex-shrink-0 items-center justify-between px-8 py-6 border-b border-[#1f2b25] bg-background-dark/80 backdrop-blur-md z-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold text-white tracking-tighter">ARCHIVE_LOG</h2>
          <div className="flex items-center gap-2 text-muted text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span>SESSION_HISTORY // TOTAL_ENTRIES: {sessions.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted material-symbols-outlined text-[18px]">search</span>
            <input
              className="bg-surface border border-[#333] text-white text-sm rounded-lg pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-muted font-mono transition-all"
              placeholder="SEARCH_LOGS..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

          {/* Metrics Hub */}
          {!isLoading && currentUser && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="bg-surface/50 border border-[#1f2b25] rounded-2xl p-6 flex items-center justify-between group hover:border-primary/30 transition-all">
                <div>
                  <h4 className="text-muted text-[10px] font-mono tracking-widest uppercase mb-1">Fluency_Avg</h4>
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.score, 0) / sessions.length) : 0}%
                  </p>
                  <p className="text-[10px] text-primary/60 font-mono mt-1">BASED ON {sessions.length} SESSIONS</p>
                </div>
                <CircularProgress
                  value={sessions.length > 0 ? sessions.reduce((acc, s) => acc + s.score, 0) / sessions.length : 0}
                  size={64}
                  strokeWidth={6}
                />
              </div>

              <div className="bg-surface/50 border border-[#1f2b25] rounded-2xl p-6 flex items-center justify-between group hover:border-primary/30 transition-all">
                <div>
                  <h4 className="text-muted text-[10px] font-mono tracking-widest uppercase mb-1">Vocab_Expansion</h4>
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {vocab.length} <span className="text-xs text-muted">/ 100</span>
                  </p>
                  <p className="text-[10px] text-primary/60 font-mono mt-1">WORDS MASTERED</p>
                </div>
                <CircularProgress
                  value={Math.min((vocab.length / 100) * 100, 100)}
                  size={64}
                  strokeWidth={6}
                  color="#bcff00"
                />
              </div>

              <div className="bg-surface/50 border border-[#1f2b25] rounded-2xl p-6 flex items-center justify-between group hover:border-primary/30 transition-all">
                <div>
                  <h4 className="text-muted text-[10px] font-mono tracking-widest uppercase mb-1">Practice_Volume</h4>
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {Math.floor((sessions.reduce((acc, s) => acc + s.duration, 0) + currentUser.total_review_seconds) / 60)} <span className="text-xs text-muted">MIN</span>
                  </p>
                  <p className="text-[10px] text-primary/60 font-mono mt-1">TOTAL ACTIVE TIME</p>
                </div>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/5 border border-primary/10">
                  <span className="material-symbols-outlined text-primary text-[24px]">timer</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-wrap gap-2">
              {['ALL', 'BUSINESS', 'ACADEMIC', 'TECHNICAL', 'SHOPPING', 'TRAVEL', 'INTERVIEW', 'MEDICAL', 'SOCIAL', 'CASUAL'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1 rounded text-xs font-mono border transition-all ${activeFilter === f ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted border-transparent hover:text-white'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-muted text-xs font-mono">
              <span>SORT_BY: DATE (DESC)</span>
              <span className="material-symbols-outlined text-[16px]">sort</span>
            </div>
          </div>

          {isLoading ? (
            <div className="w-full text-center py-24 border border-dashed border-primary/20 rounded-2xl bg-primary/5">
              <div className="flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-primary text-[40px] animate-spin">cycle</span>
                <span className="text-primary text-sm font-mono tracking-[0.3em] uppercase">Synchronizing_Logs...</span>
              </div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[#1f2b25] rounded-2xl bg-surface/30">
              <span className="material-symbols-outlined text-muted/30 text-[64px] mb-4">folder_off</span>
              <p className="text-white font-bold text-lg mb-2">NO_SESSIONS_RECORDED</p>
              <p className="text-muted font-mono text-xs uppercase tracking-widest max-w-xs mb-8">
                Your practice history is empty. Start a session in the Airlock to begin logging performance metrics.
              </p>
              <a
                href="/"
                className="px-8 py-3 bg-primary text-background-dark font-bold rounded-lg hover:bg-primary/90 transition-all font-mono text-xs tracking-widest"
              >
                GOTO_AIRLOCK
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => openSessionDetails(session)}
                  className="group relative bg-surface hover:bg-surface-highlight border border-[#333] hover:border-primary transition-all duration-300 rounded-xl p-6 cursor-pointer overflow-hidden hover:-translate-y-1 hover:shadow-neon"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-muted">
                          {session.practice_type === 'WRITING' ? 'terminal' : 'mic'}
                        </span>
                        <span className="text-primary text-[10px] font-mono font-bold tracking-wider uppercase">
                          {session.practice_type || 'VOICE'} // {session.date}
                        </span>
                      </div>
                      <h3 className="text-white text-xl font-bold tracking-tight">{session.title}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <CircularProgress
                        value={session.score}
                        size={48}
                        strokeWidth={4}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                        className="p-2 text-muted hover:text-accent transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="h-px w-full bg-[#333] mb-4 group-hover:bg-primary/20 transition-colors"></div>
                  <div className="flex flex-col gap-3">
                    <p className="text-muted text-xs font-mono uppercase tracking-wider mb-1">Detected Issues</p>
                    {session.issues.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No issues detected.</p>
                    ) : (
                      session.issues.map((issue) => (
                        <div key={issue.id} className="flex items-start gap-2 text-sm text-gray-400">
                          <span className="text-accent mt-1 material-symbols-outlined text-[14px]">error</span>
                          <span>{issue.type}: <span className="text-gray-500">{issue.description}</span></span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <span className="text-primary text-xs font-bold uppercase tracking-widest">View Analysis</span>
                    <span className="material-symbols-outlined text-primary text-[20px]">arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vocab Bank Sidebar */}
        <aside className="hidden xl:flex flex-col w-[320px] bg-[#0c120f] border-l border-[#1f2b25] shrink-0 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">book_2</span>
              <h3 className="text-white font-bold tracking-tight text-lg">VOCAB_BANK</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSuggestionModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-mono hover:bg-primary/20 transition-all"
                title="AI Suggestion"
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                SUGGEST
              </button>
              <button
                onClick={() => setIsVocabModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-mono hover:bg-primary/20 transition-all"
                title="Add new word"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                ADD
              </button>
            </div>
          </div>

          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted material-symbols-outlined text-[14px]">search</span>
            <input
              className="w-full bg-[#111815] border border-[#333] text-white text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-primary placeholder-muted font-mono transition-all"
              placeholder="FILTER_WORDS..."
              type="text"
              value={vocabFilter}
              onChange={(e) => setVocabFilter(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
            {filteredVocab.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <span className="material-symbols-outlined text-muted text-[32px]">book_2</span>
                <p className="text-muted text-xs font-mono uppercase tracking-wider">
                  {vocabFilter ? 'No words match' : 'No words yet'}
                </p>
                {!vocabFilter && (
                  <button
                    onClick={() => setIsVocabModalOpen(true)}
                    className="text-primary text-xs font-mono underline underline-offset-2 hover:text-primary/80 transition-colors"
                  >
                    Add your first word
                  </button>
                )}
              </div>
            ) : (
              filteredVocab.map((word) => (
                <div
                  key={word.id}
                  onClick={() => openSingleFlashcard(word)}
                  className="group relative p-4 bg-[#111815] border border-[#2a3830] rounded-lg hover:border-primary/50 transition-all cursor-pointer hover:shadow-neon-small active:scale-[0.98]"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-lg tracking-tight group-hover:text-primary transition-colors">{word.word}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted font-mono bg-[#1f2b25] px-2 py-0.5 rounded group-hover:bg-primary/20 group-hover:text-primary transition-all">{word.form}</span>
                      <button
                        onClick={(e) => deleteVocabWord(word.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted hover:text-accent transition-all pl-2"
                        title="Delete word"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 overflow-hidden max-h-0 group-hover:max-h-32 transition-all duration-300">
                    <p className="text-gray-400 text-sm italic mb-1.5">"{word.meaning}"</p>
                    <p className="text-primary text-xs font-mono">Ex: "{word.example}"</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={openFlashcards}
            disabled={filteredVocab.length === 0}
            className="mt-4 w-full py-3 bg-[#111815] border border-primary/20 text-primary hover:bg-primary hover:text-[#050505] text-xs font-bold rounded-lg transition-all font-mono uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">style</span>
            Review Flashcards ({filteredVocab.length})
          </button>
        </aside>
      </div>

      {/* Analysis Modal */}
      {isModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
          <div className="bg-surface border border-[#333] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
            <header className="p-6 border-b border-[#1f2b25] flex justify-between items-center bg-[#111815]">
              <div>
                <span className="text-primary text-xs font-mono font-bold tracking-wider">{selectedSession.date}</span>
                <h3 className="text-white text-2xl font-bold tracking-tight">{selectedSession.title}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-muted hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background-dark/20 text-gray-300">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-4 rounded-xl bg-[#111815] border border-[#1f2b25]">
                  <p className="text-muted text-xs font-mono uppercase tracking-widest mb-1">Session Context</p>
                  <p className="text-primary font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">
                      {selectedSession.practice_type === 'WRITING' ? 'terminal' : 'mic'}
                    </span>
                    {selectedSession.context} ({selectedSession.practice_type})
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#111815] border border-[#1f2b25]">
                  <p className="text-muted text-xs font-mono uppercase tracking-widest mb-1">Session Score</p>
                  <div className="flex items-center gap-4">
                    <CircularProgress value={selectedSession.score} size={60} strokeWidth={6} />
                    <div>
                      <p className="text-white font-bold text-xl">{selectedSession.score}%</p>
                      <p className="text-[10px] text-muted font-mono tracking-tighter uppercase">Rating: {selectedSession.score > 90 ? 'Perfect' : selectedSession.score > 70 ? 'Good' : 'Needs Review'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#111815] border border-[#1f2b25]">
                  <p className="text-muted text-xs font-mono uppercase tracking-widest mb-1">Active Duration</p>
                  <p className="text-primary font-bold text-xl">{Math.floor(selectedSession.duration / 60)}m {selectedSession.duration % 60}s</p>
                  <p className="text-[10px] text-muted font-mono uppercase tracking-tighter">Total Practice Time</p>
                </div>
              </div>
              <div className="mb-8">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-accent text-[20px]">assignment</span>
                  LINGUISTIC_ANALYSIS
                </h4>
                <div className="space-y-4">
                  {selectedSession.issues.length === 0 ? (
                    <p className="text-gray-500 italic bg-[#111815] p-4 rounded-lg border border-[#1f2b25]">Perfect performance. No major issues detected.</p>
                  ) : (
                    selectedSession.issues.map((issue) => (
                      <div key={issue.id} className="p-4 rounded-lg bg-[#111815] border border-[#1f2b25] flex gap-4">
                        <span className="text-accent material-symbols-outlined mt-0.5">error</span>
                        <div>
                          <p className="text-white font-bold text-sm uppercase tracking-wider mb-1">{issue.type}</p>
                          <p className="text-gray-400 text-sm">{issue.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">lightbulb</span>
                  IMPROVEMENT_SUGGESTIONS
                </h4>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Based on this session, focus on expanding your vocabulary related to {selectedSession.context.toLowerCase()} scenarios.
                    Your fluency is improving, but pay attention to the specific patterns identified above.
                  </p>
                </div>
              </div>
            </div>
            <footer className="p-6 border-t border-[#1f2b25] bg-[#111815] flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-primary text-background-dark font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                CLOSE_ANALYSIS
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Add Word Modal */}
      {isVocabModalOpen && currentUser && (
        <VocabModal
          userId={currentUser.id}
          onClose={() => setIsVocabModalOpen(false)}
          onSave={handleSaveWord}
        />
      )}

      {/* AI Suggestion Modal */}
      {isSuggestionModalOpen && currentUser && (
        <VocabSuggestionModal
          userId={currentUser.id}
          context={activeFilter === 'ALL' ? 'General Language Learning' : activeFilter}
          onClose={() => setIsSuggestionModalOpen(false)}
          onSave={async (wordData) => {
            await handleSaveWord(wordData);
          }}
        />
      )}

      {/* Flashcard Modal (Review Session) */}
      {isFlashcardOpen && filteredVocab.length > 0 && (
        <FlashcardView
          words={filteredVocab}
          onClose={closeFlashcards}
          speakText={speakText}
        />
      )}

      {/* Single Flashcard View */}
      {selectedVocabWord && (
        <FlashcardView
          words={[selectedVocabWord]}
          isSingleMode={true}
          onClose={() => setSelectedVocabWord(null)}
          speakText={speakText}
        />
      )}
    </div>
  );
}
