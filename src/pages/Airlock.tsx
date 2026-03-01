import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import CircularProgress from '../components/CircularProgress';

interface Session {
  id: number;
  title: string;
  context: string;
  date: string;
  score: number;
}

export default function Airlock() {
  const { currentUser, availableModels, selectedModel, setSelectedModel } = useUser();
  const navigate = useNavigate();
  const [context, setContext] = useState('CASUAL');
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({ totalVocab: 0, totalTime: 0 });

  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        const [sessionsRes, vocabRes] = await Promise.all([
          fetch(`/api/sessions?user_id=${currentUser.id}`),
          fetch(`/api/vocab?user_id=${currentUser.id}`)
        ]);
        const sessionsData = await sessionsRes.json();
        const vocabData = await vocabRes.json();

        setRecentSessions(sessionsData.slice(0, 3));
        setStats({
          totalVocab: vocabData.length,
          totalTime: Math.floor((sessionsData.reduce((acc: number, s: any) => acc + s.duration, 0) + currentUser.total_review_seconds) / 60)
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleInitialize = () => {
    navigate('/void', { state: { context } });
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display overflow-y-auto selection:bg-primary selection:text-background-dark custom-scrollbar pb-12">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]"></div>
      </div>

      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-12 flex flex-col gap-8 animate-[fadeIn_0.8s_ease-out]">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3 select-none">
              <span className="text-text-main font-bold text-4xl tracking-tighter">ONDA</span>
              <span className="text-outline font-bold text-4xl tracking-tighter">SONORA</span>
            </div>
            <div className="flex items-center gap-2 text-primary text-[10px] tracking-[0.2em] font-mono">
              <span className="material-symbols-outlined text-[12px] animate-pulse">wifi_tethering</span>
              <span>COMM_LINK ESTABLISHED // WELCOME, {currentUser?.name.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-text-muted text-[10px] font-mono tracking-widest uppercase">Weekly_Goal</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-1.5 bg-surface rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-primary shadow-glow-primary transition-all duration-1000"
                    style={{ width: `${Math.min((stats.totalTime / (currentUser?.weekly_goal || 80)) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-text-main font-mono text-xs font-bold">{stats.totalTime} / {currentUser?.weekly_goal}m</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Stats & Recent */}
          <div className="lg:col-span-8 space-y-8">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface/40 border border-[#1f2b25] rounded-xl p-5 hover:border-primary/30 transition-all flex items-center justify-between group">
                <div>
                  <h4 className="text-text-muted text-[10px] font-mono tracking-widest uppercase mb-1">Words_Mastered</h4>
                  <p className="text-3xl font-bold text-text-main tracking-tight group-hover:text-primary transition-colors">{stats.totalVocab}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary group-hover:shadow-glow-primary transition-all">
                  <span className="material-symbols-outlined">book_2</span>
                </div>
              </div>
              <div className="bg-surface/40 border border-[#1f2b25] rounded-xl p-5 hover:border-primary/30 transition-all flex items-center justify-between group">
                <div>
                  <h4 className="text-text-muted text-[10px] font-mono tracking-widest uppercase mb-1">Total_Practice</h4>
                  <p className="text-3xl font-bold text-text-main tracking-tight group-hover:text-primary transition-colors">{stats.totalTime}<span className="text-sm text-text-muted ml-1 uppercase">min</span></p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary group-hover:shadow-glow-primary transition-all">
                  <span className="material-symbols-outlined">timer</span>
                </div>
              </div>
            </div>

            {/* Recent Performance */}
            <div className="bg-surface/30 border border-[#1f2b25] rounded-xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-4 border-b border-[#1f2b25] flex justify-between items-center bg-primary/5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">history</span>
                  <h3 className="text-text-main font-bold text-sm tracking-widest uppercase font-mono">Recent_Performance</h3>
                </div>
                <a href="/archive" className="text-primary text-[10px] font-mono hover:underline uppercase tracking-tighter">View_Full_Archive</a>
              </div>
              <div className="p-4 space-y-3">
                {recentSessions.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-text-muted font-mono text-xs uppercase italic">No sessions recorded yet.</p>
                  </div>
                ) : (
                  recentSessions.map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-background-dark/50 border border-white/5 rounded-lg hover:border-primary/20 transition-all group">
                      <div className="flex items-center gap-4">
                        <CircularProgress value={session.score} size={40} strokeWidth={4} />
                        <div>
                          <p className="text-text-main font-bold text-sm tracking-tight">{session.title}</p>
                          <p className="text-text-muted text-[10px] font-mono uppercase">{session.context} // {session.date}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors">chevron_right</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Launcher */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface/50 border border-primary/20 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[100px] text-primary">bolt</span>
              </div>

              <h3 className="text-primary font-bold tracking-[0.2em] font-mono text-xs mb-8 uppercase">Initialize_Session</h3>

              <div className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="block text-text-muted text-[10px] font-mono tracking-widest uppercase pl-1 transition-colors duration-300">
                    AI Engine
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {availableModels.map(model => (
                      <button
                        key={model}
                        onClick={() => setSelectedModel(model)}
                        className={`py-3 px-4 rounded-lg border font-mono text-[10px] tracking-tight transition-all duration-300 flex justify-between items-center ${selectedModel === model
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-background-dark/50 border-white/10 text-text-muted hover:border-primary/30'
                          }`}
                      >
                        <span>{model.split(':')[0].toUpperCase()}</span>
                        {selectedModel === model && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-text-muted text-[10px] font-mono tracking-widest uppercase pl-1" htmlFor="context">
                    Session Context
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-background-dark/50 border border-white/10 text-text-main text-sm font-display rounded-lg py-3 px-4 focus:border-primary focus:outline-none transition-all cursor-pointer appearance-none hover:border-text-main/50"
                      id="context"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                    >
                      <option className="bg-surface" value="BUSINESS">BUSINESS MEETING</option>
                      <option className="bg-surface" value="CASUAL">CASUAL CONVERSATION</option>
                      <option className="bg-surface" value="TECHNICAL">TECHNICAL INTERVIEW</option>
                      <option className="bg-surface" value="TRAVEL">AIRPORT / TRAVEL</option>
                      <option className="bg-surface" value="INTERVIEW">JOB INTERVIEW</option>
                      <option className="bg-surface" value="MEDICAL">MEDICAL CHECKUP</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                      <span className="material-symbols-outlined text-[18px]">expand_more</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleInitialize}
                  className="w-full relative group/btn overflow-hidden rounded-lg bg-primary py-4 transition-all duration-500 hover:shadow-[0_0_30px_rgba(0,255,148,0.4)] focus:outline-none mt-4"
                >
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    <span className="text-background-dark font-black tracking-widest text-xs font-mono">LAUNCH_VOID</span>
                    <span className="material-symbols-outlined text-background-dark text-[18px] group-hover:translate-x-1 transition-transform">rocket_launch</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="p-4 border border-white/5 rounded-xl bg-primary/5 flex items-center justify-between text-[10px] font-mono text-text-muted tracking-widest">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
                <span>SYSTEM_STATUS: OK</span>
              </div>
              <span className="opacity-50">V.2.1.0</span>
            </div>
          </div>
        </div>
      </main>


    </div>
  );
}
