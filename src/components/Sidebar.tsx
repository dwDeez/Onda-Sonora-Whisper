import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import CircularProgress from './CircularProgress';

export default function Sidebar() {
  const location = useLocation();
  const { currentUser, logout } = useUser();
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);

  useEffect(() => {
    if (!currentUser) return;

    const fetchWeeklyProgress = async () => {
      try {
        const res = await fetch(`/api/sessions?user_id=${currentUser.id}`);
        const sessions = await res.json();

        // Filter sessions from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentSessions = sessions.filter((s: any) => new Date(s.date) >= sevenDaysAgo);
        const sessionSeconds = recentSessions.reduce((acc: number, s: any) => acc + (s.duration || 0), 0);

        // Combine session time with total review time (simplification for demo)
        setWeeklyMinutes(Math.floor((sessionSeconds + (currentUser.total_review_seconds || 0)) / 60));
      } catch (err) {
        console.error('Failed to fetch weekly progress:', err);
      }
    };

    fetchWeeklyProgress();
  }, [currentUser]);

  const navItems = [
    { path: '/', label: 'THE AIRLOCK', icon: 'home' },
    { path: '/void', label: 'THE VOID', icon: 'mic' },
    { path: '/archive', label: 'THE ARCHIVE', icon: 'history' },
    { path: '/terminal', label: 'THE TERMINAL', icon: 'terminal' },
    { path: '/studio', label: 'THE STUDIO', icon: 'tune' },
    { path: '/profile', label: 'THE PROFILE', icon: 'person' },
  ];

  if (currentUser?.role === 'ADMIN') {
    navItems.push({ path: '/admin', label: 'ADMIN PANEL', icon: 'admin_panel_settings' });
  }

  const currentContext = location.state?.context;

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="hidden md:flex flex-col w-[280px] h-full bg-[#111815] border-r border-[#1f2b25] shrink-0 z-20">
      <div className="flex flex-col h-full justify-between p-6">
        <div className="flex flex-col gap-8">
          <div className="flex gap-4 items-center">
            <div className="relative">
              <div
                className="bg-center bg-no-repeat bg-cover rounded-full size-12 ring-2 ring-[#06f994]/30"
                style={{ backgroundImage: `url("${currentUser?.avatar}")` }}
              ></div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-[#111815]"></div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-white text-lg font-bold tracking-tight">{currentUser?.name}</h1>
              </div>
              <p className="text-primary text-xs font-mono tracking-wider">ONLINE // SYNCED</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  state={{ context: currentContext }}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${isActive
                    ? 'bg-[#1f2b25] border border-primary/20 shadow-neon text-white'
                    : 'hover:bg-[#1f2b25] text-[#9bbbae] hover:text-white'
                    }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-primary' : 'group-hover:text-primary transition-colors'}`}>
                    {item.icon}
                  </span>
                  <span className={`text-sm tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          {currentUser && (
            <div className="px-4 py-4 rounded-xl bg-gradient-to-br from-[#1f2b25] to-transparent border border-[#2a3830]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-mono text-muted uppercase tracking-widest leading-none mb-1">Weekly_Goal</p>
                  <h4 className="text-white font-bold text-sm leading-none">{weeklyMinutes} / {currentUser.weekly_goal} m</h4>
                </div>
                <CircularProgress
                  value={currentUser.weekly_goal > 0 ? Math.min((weeklyMinutes / currentUser.weekly_goal) * 100, 100) : 0}
                  size={36}
                  strokeWidth={4}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#111815] border border-[#1f2b25] flex items-center justify-center overflow-hidden shrink-0 group-hover:border-primary/30 transition-colors">
                  <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold truncate tracking-tight">{currentUser.name}</p>
                  <p className="text-[9px] font-mono text-primary/60 uppercase tracking-tighter">Active_Member</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl h-10 px-4 bg-[#1f2b25] hover:bg-[#2a3830] text-[#9bbbae] hover:text-white text-sm font-bold tracking-wide transition-all border border-transparent hover:border-[#3a4d42]"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>DISCONNECT</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
