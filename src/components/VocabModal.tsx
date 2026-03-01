import { useState } from 'react';
import { ollama } from '../services/ollamaApi';

interface VocabModalProps {
    userId: number;
    onClose: () => void;
    onSave: (word: { word: string; form: string; meaning: string; example: string }) => void;
}

const WORD_FORMS = ['NOUN', 'VERB', 'ADJ', 'ADV', 'PHRASE', 'IDIOM'];

export default function VocabModal({ userId, onClose, onSave }: VocabModalProps) {
    const [word, setWord] = useState('');
    const [form, setForm] = useState('NOUN');
    const [meaning, setMeaning] = useState('');
    const [example, setExample] = useState('');
    const [isDefining, setIsDefining] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [defineError, setDefineError] = useState('');

    const handleDefine = async () => {
        if (!word.trim()) return;
        setIsDefining(true);
        setDefineError('');
        try {
            const result = await ollama.defineWord(word.trim());
            setForm(result.form.toUpperCase());
            setMeaning(result.meaning);
            setExample(result.example);
        } catch {
            setDefineError('AI definition failed. Fill manually.');
        } finally {
            setIsDefining(false);
        }
    };

    const handleSave = async () => {
        if (!word.trim() || !meaning.trim() || !example.trim()) return;
        setIsSaving(true);
        try {
            await onSave({ word: word.trim(), form, meaning: meaning.trim(), example: example.trim() });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-surface border border-[#333] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative p-6 border-b border-[#1f2b25] bg-[#111815]">
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-[20px]">book_2</span>
                            <div>
                                <h2 className="text-white font-bold tracking-tight">ADD_WORD</h2>
                                <p className="text-muted text-xs font-mono">New entry for VOCAB_BANK</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-muted hover:text-white transition-colors p-1">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-5">
                    {/* Word Input + AI Button */}
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-muted text-xs font-mono uppercase tracking-wider mb-1.5 block">Word / Phrase</label>
                            <input
                                className="w-full bg-[#111815] border border-[#333] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-muted font-mono text-sm transition-all"
                                placeholder="e.g. Ephemeral"
                                value={word}
                                onChange={(e) => setWord(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleDefine()}
                                autoFocus
                            />
                        </div>
                        <div className="self-end">
                            <button
                                onClick={handleDefine}
                                disabled={!word.trim() || isDefining}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-mono hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Auto-define with AI"
                            >
                                {isDefining ? (
                                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                )}
                                <span className="hidden sm:block">AI Fill</span>
                            </button>
                        </div>
                    </div>

                    {defineError && (
                        <p className="text-accent text-xs font-mono">{defineError}</p>
                    )}

                    {/* Word Form */}
                    <div>
                        <label className="text-muted text-xs font-mono uppercase tracking-wider mb-1.5 block">Word Form</label>
                        <div className="flex flex-wrap gap-2">
                            {WORD_FORMS.map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setForm(f)}
                                    className={`px-3 py-1 rounded text-xs font-mono border transition-all ${form === f
                                            ? 'bg-primary/10 text-primary border-primary/40'
                                            : 'text-muted border-[#333] hover:text-white hover:border-[#555]'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Meaning */}
                    <div>
                        <label className="text-muted text-xs font-mono uppercase tracking-wider mb-1.5 block">Meaning</label>
                        <textarea
                            className="w-full bg-[#111815] border border-[#333] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-muted text-sm transition-all resize-none"
                            placeholder="Short, clear definition..."
                            rows={2}
                            value={meaning}
                            onChange={(e) => setMeaning(e.target.value)}
                        />
                    </div>

                    {/* Example */}
                    <div>
                        <label className="text-muted text-xs font-mono uppercase tracking-wider mb-1.5 block">Example Sentence</label>
                        <textarea
                            className="w-full bg-[#111815] border border-[#333] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-muted text-sm transition-all resize-none"
                            placeholder="A natural sentence using this word..."
                            rows={2}
                            value={example}
                            onChange={(e) => setExample(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg text-muted border border-[#333] hover:text-white hover:border-[#555] text-sm font-mono transition-all"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!word.trim() || !meaning.trim() || !example.trim() || isSaving}
                        className="px-5 py-2 rounded-lg bg-primary text-background-dark font-bold text-sm font-mono hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving ? (
                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined text-[18px]">add</span>
                        )}
                        SAVE_WORD
                    </button>
                </div>
            </div>
        </div>
    );
}
