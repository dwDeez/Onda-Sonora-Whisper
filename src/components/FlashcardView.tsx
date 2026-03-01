import { useState, useEffect } from 'react';
import { ollama } from '../services/ollamaApi';

interface VocabWord {
    id: number;
    word: string;
    form: string;
    meaning: string;
    example: string;
}

interface FlashcardViewProps {
    words: VocabWord[];
    initialIndex?: number;
    isSingleMode?: boolean;
    onClose: () => void;
    onNavigate?: (index: number) => void;
    speakText: (text: string) => void;
}

export default function FlashcardView({
    words,
    initialIndex = 0,
    isSingleMode = false,
    onClose,
    onNavigate,
    speakText
}: FlashcardViewProps) {
    const [index, setIndex] = useState(initialIndex);
    const [flipped, setFlipped] = useState(false);
    const [isInterlinear, setIsInterlinear] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translations, setTranslations] = useState<Record<number, { meaning: string, example: string }>>({});

    const currentWord = words[index];

    const handleTranslate = async () => {
        if (!currentWord || translations[currentWord.id]) return;

        setIsTranslating(true);
        try {
            const [meaningEs, exampleEs] = await Promise.all([
                ollama.translate(currentWord.meaning, 'en-es'),
                ollama.translate(currentWord.example, 'en-es')
            ]);
            setTranslations(prev => ({
                ...prev,
                [currentWord.id]: { meaning: meaningEs, example: exampleEs }
            }));
        } catch (err) {
            console.error('Flashcard translation failed:', err);
        } finally {
            setIsTranslating(false);
        }
    };

    useEffect(() => {
        if (isInterlinear) {
            handleTranslate();
        }
    }, [index, isInterlinear]);

    const next = () => {
        setFlipped(false);
        const newIndex = (index + 1) % words.length;
        setTimeout(() => {
            setIndex(newIndex);
            onNavigate?.(newIndex);
        }, 150);
    };

    const prev = () => {
        setFlipped(false);
        const newIndex = (index - 1 + words.length) % words.length;
        setTimeout(() => {
            setIndex(newIndex);
            onNavigate?.(newIndex);
        }, 150);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-dark/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-2xl flex flex-col items-center gap-6">
                {/* Header */}
                <div className="w-full flex items-center justify-between">
                    <span className="text-muted text-xs font-mono uppercase tracking-widest">
                        {isSingleMode ? 'WORD_DETAIL' : `FLASHCARD ${index + 1} / ${words.length}`}
                    </span>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsInterlinear(!isInterlinear)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all font-mono text-[10px] ${isInterlinear ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-[#333] text-muted hover:text-white'}`}
                            title="Toggle Interlinear Mode (ES/EN)"
                        >
                            <span className="material-symbols-outlined text-[16px]">translate</span>
                            INTERLINEAR_{isInterlinear ? 'ON' : 'OFF'}
                        </button>
                        <button onClick={onClose} className="text-muted hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                {!isSingleMode && (
                    <div className="w-full h-0.5 bg-[#333] rounded-full">
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${((index + 1) / words.length) * 100}%` }}
                        />
                    </div>
                )}

                {/* Card */}
                <div
                    className="relative w-full cursor-pointer"
                    onClick={() => setFlipped(f => !f)}
                    style={{ perspective: '1000px' }}
                >
                    <div
                        className="relative w-full transition-transform duration-500"
                        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                    >
                        {/* Front */}
                        <div
                            className="w-full p-10 bg-surface border border-[#333] rounded-2xl flex flex-col items-center justify-center gap-4 min-h-[400px] shadow-2xl"
                            style={{ backfaceVisibility: 'hidden' }}
                        >
                            <div className="absolute top-4 right-4">
                                <span className="text-xs text-muted font-mono bg-[#1f2b25] px-2 py-0.5 rounded">
                                    {currentWord.form}
                                </span>
                            </div>
                            <p className="text-muted text-xs font-mono uppercase tracking-widest mb-2">WORD</p>
                            <div className="flex items-center gap-4">
                                <h2 className="text-4xl font-bold text-white tracking-tight text-center">
                                    {currentWord.word}
                                </h2>
                                <button
                                    onClick={(e) => { e.stopPropagation(); speakText(currentWord.word); }}
                                    className="p-1 text-primary hover:text-white transition-all duration-300 hover:scale-110 active:scale-95 drop-shadow-neon"
                                    title="Speak word"
                                >
                                    <span className="material-symbols-outlined text-[24px]">volume_up</span>
                                </button>
                            </div>
                            <p className="text-muted text-xs font-mono mt-4 animate-pulse">tap to reveal</p>
                        </div>
                        {/* Back */}
                        <div
                            className="absolute inset-0 w-full p-10 bg-[#111815] border border-primary/30 rounded-2xl flex flex-col items-center justify-center gap-4 min-h-[400px] shadow-2xl"
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-bold text-white tracking-tight text-center">
                                    {currentWord.word}
                                </h2>
                                <button
                                    onClick={(e) => { e.stopPropagation(); speakText(currentWord.word); }}
                                    className="p-1 text-primary hover:text-white transition-all duration-300 hover:scale-110 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">volume_up</span>
                                </button>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-gray-300 text-base text-center italic">
                                    "{currentWord.meaning}"
                                </p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); speakText(currentWord.meaning); }}
                                    className="p-1 text-primary/40 hover:text-white transition-all duration-300 hover:scale-110 active:scale-95"
                                    title="Speak meaning"
                                >
                                    <span className="material-symbols-outlined text-[16px]">volume_up</span>
                                </button>
                            </div>
                            {isInterlinear && (
                                <p className="text-primary/60 text-sm text-center italic -mt-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                    {isTranslating && !translations[currentWord.id] ? 'translating...' : `"${translations[currentWord.id]?.meaning}"`}
                                </p>
                            )}
                            <div className="h-px w-16 bg-primary/30 my-1" />
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-primary text-sm font-mono text-center">
                                    "{currentWord.example}"
                                </p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); speakText(currentWord.example); }}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-primary hover:text-white hover:bg-primary/10 transition-all text-[10px] font-mono border border-transparent hover:border-primary/20"
                                >
                                    <span className="material-symbols-outlined text-[14px]">volume_up</span>
                                    PRONOUNCE
                                </button>
                            </div>
                            {isInterlinear && (
                                <p className="text-primary/40 text-[11px] font-mono text-center -mt-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                    {isTranslating && !translations[currentWord.id] ? 'translating...' : `"${translations[currentWord.id]?.example}"`}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                {!isSingleMode && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={prev}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface border border-[#333] text-muted hover:text-white hover:border-[#555] transition-all font-mono text-sm"
                        >
                            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                            PREV
                        </button>
                        <button
                            onClick={() => setFlipped(f => !f)}
                            className="px-5 py-2.5 rounded-xl border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-all font-mono text-sm"
                        >
                            FLIP
                        </button>
                        <button
                            onClick={next}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface border border-[#333] text-muted hover:text-white hover:border-[#555] transition-all font-mono text-sm"
                        >
                            NEXT
                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </button>
                    </div>
                )}

                {isSingleMode && (
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-primary text-background-dark font-bold rounded-xl hover:bg-primary/90 transition-all font-mono text-sm uppercase tracking-widest"
                    >
                        DONE
                    </button>
                )}
            </div>
        </div>
    );
}
