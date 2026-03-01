import { useState, useEffect } from 'react';
import { ollama } from '../services/ollamaApi';

interface Suggestion {
    word: string;
    form: string;
    meaning: string;
    example: string;
}

interface VocabSuggestionModalProps {
    context: string;
    userId: number;
    onClose: () => void;
    onSave: (word: { word: string; form: string; meaning: string; example: string }) => Promise<void>;
}

export default function VocabSuggestionModal({ context, userId, onClose, onSave }: VocabSuggestionModalProps) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');

    const fetchSuggestions = async (ignoreFlag: { current: boolean } = { current: false }) => {
        setIsLoading(true);
        setError('');
        try {
            const data = await ollama.suggestVocabulary(context, 6);
            if (!ignoreFlag.current) {
                setSuggestions(data);
            }
        } catch (err) {
            if (!ignoreFlag.current) {
                console.error('Failed to get suggestions:', err);
                setError('Failed to fetch suggestions. Please try again.');
            }
        } finally {
            if (!ignoreFlag.current) {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        const ignoreFlag = { current: false };
        fetchSuggestions(ignoreFlag);
        return () => {
            ignoreFlag.current = true;
        };
    }, [context]);

    const handleSave = async (s: Suggestion) => {
        if (savedWords.has(s.word)) return;
        try {
            await onSave(s);
            setSavedWords(prev => new Set([...prev, s.word]));
        } catch (err) {
            console.error('Failed to save suggested word:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-md" onClick={onClose}>
            <div
                className="bg-surface border border-[#333] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative p-6 border-b border-[#1f2b25] bg-[#111815]">
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-[24px]">auto_awesome</span>
                            <div>
                                <h2 className="text-white font-bold tracking-tight text-xl">AI_VOCAB_SUGGESTIONS</h2>
                                <p className="text-muted text-xs font-mono uppercase tracking-widest">Context: {context}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-muted hover:text-white transition-colors p-1">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-background-dark/20">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-6 bg-primary/40 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-6 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                <div className="w-1.5 h-6 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                            <p className="text-muted font-mono text-sm tracking-widest animate-pulse uppercase">Generating recommendations...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-accent font-mono mb-4">{error}</p>
                            <button
                                onClick={() => fetchSuggestions()}
                                className="px-4 py-2 border border-primary/30 text-primary text-sm font-mono rounded-lg hover:bg-primary/10"
                            >
                                RETRY_SYNC
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {suggestions.map((s, idx) => {
                                const isSaved = savedWords.has(s.word);
                                return (
                                    <div
                                        key={idx}
                                        className="group relative p-4 bg-[#111815] border border-[#2a3830] rounded-xl hover:border-primary/40 transition-all duration-300"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="text-white font-bold text-lg">{s.word}</h4>
                                                <span className="text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                    {s.form}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleSave(s)}
                                                disabled={isSaved}
                                                className={`p-2 rounded-lg transition-all ${isSaved
                                                    ? 'text-primary bg-primary/10'
                                                    : 'text-muted hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/30'}`}
                                            >
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {isSaved ? 'check_circle' : 'add_circle'}
                                                </span>
                                            </button>
                                        </div>
                                        <p className="text-gray-400 text-sm italic mb-2 leading-snug">"{s.meaning}"</p>
                                        <p className="text-muted text-[11px] font-mono leading-relaxed border-l border-[#2a3830] pl-3 italic">
                                            {s.example}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#1f2b25] bg-[#111815] flex justify-between items-center">
                    <p className="text-muted text-[10px] font-mono tracking-wider max-w-[280px]">
                        AI recommendations are based on your active session contexts and language level.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => fetchSuggestions()}
                            disabled={isLoading}
                            className="px-4 py-2 rounded-lg text-muted hover:text-white text-sm font-mono transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                            REGENERATE
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-primary text-background-dark font-bold rounded-lg hover:bg-primary/90 transition-all font-mono text-sm uppercase tracking-widest"
                        >
                            DONE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
