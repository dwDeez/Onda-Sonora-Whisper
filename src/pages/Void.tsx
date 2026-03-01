import { useState, useEffect, useRef } from 'react';
import { OllamaAudioSession } from '../services/ollamaSession';
import { WhisperAudioSession } from '../services/whisperSession';
import { ollama } from '../services/ollamaApi';
import { useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useInteractionTimer } from '../hooks/useInteractionTimer';

interface Issue {
  id?: number;
  type: string;
  description: string;
}

type VoiceMode = 'default' | 'whisper';

export default function Void() {
  const { currentUser } = useUser();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('Starting practice session...');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [sessionState, setSessionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);
  const [isInstructorSpeaking, setIsInstructorSpeaking] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(
    () => (localStorage.getItem('voice_mode') as VoiceMode) || 'default'
  );
  const { activeSeconds, resetTimer } = useInteractionTimer();
  const sessionRef = useRef<OllamaAudioSession | WhisperAudioSession | null>(null);
  const userTranscriptsRef = useRef<{ role: string; content: string }[]>([]);
  const location = useLocation();
  const context = (location.state as any)?.context || 'CASUAL';

  const cycleVoiceMode = () => {
    if (sessionState === 'connected' || sessionState === 'connecting') return;
    const next: VoiceMode = voiceMode === 'default' ? 'whisper' : 'default';
    setVoiceMode(next);
    localStorage.setItem('voice_mode', next);
  };

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
    };
  }, []);

  const analyzeTranscript = async (text: string) => {
    try {
      const result = await ollama.analyzeTranscript(text);
      if (result === 'PERFECT') return;

      const analysis = result;
      if (analysis) {
        setIssues(prev => [...prev, { type: analysis.type, description: analysis.description }]);
        setLatestAnalysis(analysis);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  const toggleSession = async () => {
    if (sessionState === 'connected' || sessionState === 'connecting') {
      sessionRef.current?.disconnect();
      setSessionState('disconnected');
      setIsRecording(false);
      setTranscript('Session ended. Saving log...');

      // Save session with AI analysis
      try {
        if (!currentUser) return;
        setTranscript('Analyzing session...');

        // Use accumulated transcripts for holistic analysis
        const messages = userTranscriptsRef.current;
        let score = Math.max(100 - (issues.length * 5), 70);
        let sessionTitle = `${context} Practice`;
        let sessionIssues = issues;

        if (messages.filter(m => m.role === 'user').length > 0) {
          try {
            const analysis = await ollama.analyzeWritingSession(messages, context);
            score = analysis.score;
            sessionTitle = analysis.title;
            sessionIssues = analysis.issues.length > 0 ? analysis.issues : issues;
          } catch (analysisErr) {
            console.warn('Full analysis failed, using per-utterance issues:', analysisErr);
            // Fallback to per-utterance score
          }
        }

        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.id,
            title: sessionTitle,
            context: context,
            score: score,
            practice_type: 'VOICE',
            duration: activeSeconds,
            issues: sessionIssues
          })
        });
        setTranscript('Session saved to Archive.');
        setIssues([]);
        userTranscriptsRef.current = [];
      } catch (err) {
        console.error('Failed to save session:', err);
        setTranscript('Session ended. Failed to save to log.');
      }

    } else {
      console.log('toggleSession: Context:', context);

      setIssues([]);
      setLatestAnalysis(null);
      userTranscriptsRef.current = [];
      resetTimer();

      const session = voiceMode === 'whisper'
        ? new WhisperAudioSession(context)
        : new OllamaAudioSession(context);
      sessionRef.current = session;

      session.onStateChange = (state) => {
        console.log('Session State Change:', state);
        setSessionState(state);
        if (state === 'connected') {
          setIsRecording(true);
          setTranscript('Ready to speak. Connection established.');
        } else if (state === 'connecting') {
          setTranscript('Initializing Voice Engine... Syncing context.');
        } else if (state === 'error') {
          setTranscript('Connection error. Verify services (Ollama/Whisper) are active.');
          setIsRecording(false);
        } else if (state === 'disconnected') {
          setIsRecording(false);
          setTranscript('Session terminated. Connection closed.');
        }
      };

      session.onTranscript = (text, isUser) => {
        setTranscript(text);
        if (isUser) {
          analyzeTranscript(text);
          userTranscriptsRef.current.push({ role: 'user', content: text });
        } else {
          userTranscriptsRef.current.push({ role: 'assistant', content: text });
        }
      };

      session.onSpeakingWord = () => {
        setIsInstructorSpeaking(true);
        setTimeout(() => setIsInstructorSpeaking(false), 150); // 150ms quick pulse
      };

      await session.connect();
    }
  };

  return (
    <div className="relative flex-grow flex flex-col items-center justify-center z-10 w-full h-full px-4 bg-background-dark text-text-main font-display selection:bg-primary selection:text-void">
      <div className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-300 ${isInstructorSpeaking ? 'opacity-40 scale-110 shadow-[inset_0_0_100px_rgba(6,249,148,0.3)]' : 'opacity-20 scale-100'} ambient-glow`}></div>
      <div className="fixed inset-0 pointer-events-none z-0 bg-grid-pattern opacity-20"></div>

      <header className="fixed top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined ${sessionState === 'connected' ? 'text-primary animate-pulse' : 'text-muted'} text-[12px]`}>fiber_manual_record</span>
            <h1 className="font-mono text-xs tracking-[0.2em] text-primary/80 uppercase">
              {sessionState === 'connected' ? 'System Active' : 'System Standby'}
            </h1>
          </div>
          <div className="font-mono text-[10px] tracking-widest text-muted pl-6">
            SESSION_ID: 2026-ACTIVE • STABLE_LATENCY
          </div>
        </div>
        <div className="hidden md:flex gap-8 font-mono text-[10px] tracking-widest text-muted uppercase items-center">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-muted"></span>
            <span>Context: {
              context === 'BUSINESS' ? 'Negotiation' :
                context === 'ACADEMIC' ? 'Defense' :
                  context === 'TECHNICAL' ? 'Technical' :
                    context === 'SHOPPING' ? 'Shopping' :
                      context === 'TRAVEL' ? 'Travel' :
                        context === 'INTERVIEW' ? 'Interview' :
                          context === 'MEDICAL' ? 'Medical' :
                            context === 'SOCIAL' ? 'Social' : 'Casual'
            }</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-muted"></span>
            <span>Microphone: Array_01</span>
          </div>
          {/* Voice mode toggle pill */}
          <button
            onClick={cycleVoiceMode}
            disabled={sessionState === 'connected' || sessionState === 'connecting'}
            title={sessionState === 'connected' ? 'End session to switch mode' : 'Switch voice input mode'}
            className={`flex items-center gap-0 rounded-full border text-[9px] overflow-hidden transition-all duration-300 ${sessionState === 'connected' || sessionState === 'connecting'
              ? 'opacity-40 cursor-not-allowed border-muted/20'
              : 'border-muted/40 hover:border-primary/60 cursor-pointer'
              }`}
          >
            <span className={`px-2.5 py-1 transition-colors duration-200 ${voiceMode === 'default' ? 'bg-primary/20 text-primary' : 'text-muted'
              }`}>DEFAULT</span>
            <span className={`px-2.5 py-1 transition-colors duration-200 ${voiceMode === 'whisper' ? 'bg-primary/20 text-primary' : 'text-muted'
              }`}>WHISPER</span>
          </button>
        </div>
      </header>

      <main className="relative flex-grow flex flex-col items-center justify-center z-10 w-full max-w-7xl mx-auto px-4">
        <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center mb-12 group">
          <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute inset-0 border border-muted/20 rounded-full scale-110 opacity-30"></div>
          <div className="absolute inset-0 border border-muted/10 rounded-full scale-125 opacity-20 border-dashed animate-[spin_60s_linear_infinite]"></div>

          <div className="relative w-full h-full flex items-center justify-center animate-breathe">
            <div className={`w-32 h-32 rounded-full border ${isRecording ? 'border-accent/50 shadow-glow-accent' : 'border-primary/30 shadow-glow-primary'} flex items-center justify-center relative bg-void/50 backdrop-blur-sm transition-all duration-500`}>
              <div className={`w-24 h-24 rounded-full border ${isRecording ? 'border-accent/50' : 'border-primary/50'} opacity-50 absolute animate-[spin_10s_linear_infinite_reverse] transition-colors duration-500`}></div>
              <div className={`w-24 h-24 rounded-full border ${isRecording ? 'border-accent/50' : 'border-primary/50'} opacity-50 absolute rotate-45 animate-[spin_15s_linear_infinite] transition-colors duration-500`}></div>
              <div className={`w-24 h-24 rounded-full border ${isRecording ? 'border-accent/50' : 'border-primary/50'} opacity-50 absolute rotate-90 animate-[spin_20s_linear_infinite_reverse] transition-colors duration-500`}></div>
              <div className={`w-2 h-2 ${isRecording ? 'bg-accent shadow-glow-accent' : 'bg-primary shadow-glow-primary'} rounded-full transition-colors duration-500`}></div>
            </div>

            <svg className={`absolute inset-0 w-full h-full ${isRecording ? 'text-accent/20' : 'text-primary/20'} animate-[spin_30s_linear_infinite] transition-colors duration-500`} fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="48" stroke="currentColor" strokeDasharray="4 4" strokeWidth="0.5"></circle>
            </svg>
            <svg className={`absolute inset-0 w-full h-full ${isRecording ? 'text-accent/10' : 'text-primary/10'} animate-[spin_40s_linear_infinite_reverse] transition-colors duration-500`} fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="38" stroke="currentColor" strokeDasharray="10 10" strokeWidth="0.5"></circle>
            </svg>
          </div>
        </div>

        <div className="w-full max-w-5xl flex flex-col items-center gap-8 relative min-h-[220px] px-8">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-light leading-relaxed tracking-tight text-white/90">
              <span className="opacity-80">{transcript}</span>
              <span className="w-2 h-8 bg-primary/50 inline-block align-middle ml-1 cursor-blink"></span>
            </p>
          </div>

          {/* Example Analysis Hint - Mocked for visual fidelity */}
          {transcript.includes('much moneys') && (
            <div className="absolute top-full mt-4 opacity-100 animate-[fadeIn_0.5s_ease-out_forwards_0.5s]">
              <div className="h-0 overflow-hidden group-hover:h-auto group-hover:mt-3 transition-all duration-300">
                <button className="text-xs font-mono text-white border border-white/20 px-3 py-1.5 rounded hover:bg-white/10 hover:border-primary/50 flex items-center gap-2 transition-colors">
                  <span>FULL ANALYSIS</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-8 right-8 z-50 group flex flex-col items-end gap-3">
        <div className="flex flex-col gap-2 opacity-0 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 ease-out origin-bottom-right mb-2">
          <button className="flex items-center justify-end gap-3 text-right group/btn" onClick={() => setShowAnalysis(true)}>
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase opacity-0 group-hover/btn:opacity-100 transition-opacity bg-surface/80 backdrop-blur px-2 py-1 rounded">Analysis View</span>
            <div className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white hover:text-primary hover:border-primary/50 transition-all shadow-lg hover:shadow-glow-primary">
              <span className="material-symbols-outlined text-[20px]">analytics</span>
            </div>
          </button>
          <button className="flex items-center justify-end gap-3 text-right group/btn" onClick={toggleSession}>
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase opacity-0 group-hover/btn:opacity-100 transition-opacity bg-surface/80 backdrop-blur px-2 py-1 rounded">
              {sessionState === 'connected' ? 'End Session' : 'Start Session'}
            </span>
            <div className={`w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white transition-all shadow-lg ${sessionState === 'connected' ? 'hover:text-accent hover:border-accent/50 hover:shadow-glow-accent' : 'hover:text-primary hover:border-primary/50 hover:shadow-glow-primary'}`}>
              <span className="material-symbols-outlined text-[20px]">{sessionState === 'connected' ? 'power_settings_new' : 'mic'}</span>
            </div>
          </button>
        </div>
        <button className="w-12 h-12 rounded-full bg-surface/50 backdrop-blur-md border border-white/5 hover:border-white/20 flex items-center justify-center text-muted hover:text-white transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-primary/20">
          <span className="material-symbols-outlined">more_horiz</span>
        </button>
      </div>

      <div className="fixed bottom-8 left-8 hidden md:block opacity-30">
        <svg fill="none" height="40" viewBox="0 0 40 40" width="40" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1V10" stroke="currentColor" strokeWidth="1"></path>
          <path d="M1 1H10" stroke="currentColor" strokeWidth="1"></path>
        </svg>
      </div>
      <div className="fixed top-8 right-8 hidden md:block opacity-30">
        <svg fill="none" height="40" viewBox="0 0 40 40" width="40" xmlns="http://www.w3.org/2000/svg">
          <path d="M39 1V10" stroke="currentColor" strokeWidth="1"></path>
          <path d="M39 1H30" stroke="currentColor" strokeWidth="1"></path>
        </svg>
      </div>

      {showAnalysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background-dark/80 backdrop-blur-sm">
          <div className="relative z-20 w-full max-w-[600px] mx-4 animate-fade-in-up">
            <div className="group relative flex flex-col bg-surface/80 dark:bg-[#121212]/90 backdrop-blur-xl border border-text-muted/30 rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/5">
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">terminal</span>
                  <h2 className="text-sm font-bold tracking-[0.15em] text-text-muted uppercase">Learning Analysis // FEEDBACK</h2>
                </div>
                <button className="text-text-muted hover:text-primary transition-colors duration-200" onClick={() => setShowAnalysis(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-mono text-muted uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                    Issues Detected
                  </h3>

                  {issues.length === 0 ? (
                    <div className="p-4 rounded-lg bg-[#1a0f14] border border-accent/20">
                      <div className="flex items-start gap-4">
                        <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">check_circle</span>
                        <div>
                          <p className="text-sm font-bold text-white mb-1">Perfect so far!</p>
                          <p className="text-xs text-muted/80 leading-relaxed font-mono">No grammatical or vocabulary issues found in the transcript.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    issues.map((issue, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-[#1a0f14] border border-accent/20">
                        <div className="flex items-start gap-4">
                          <span className="material-symbols-outlined text-accent text-[20px] mt-0.5">error</span>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold tracking-wider uppercase font-mono">{issue.type}</span>
                              <span className="text-xs text-muted font-mono">{idx + 1}</span>
                            </div>
                            <p className="text-sm font-bold text-white mb-1">{issue.description}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
