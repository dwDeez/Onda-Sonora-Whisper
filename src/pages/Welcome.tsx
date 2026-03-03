import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, User } from '../contexts/UserContext';
import LoginModal from '../components/LoginModal';

export default function Welcome() {
    const { users, setCurrentUser, refreshUsers, availableModels, selectedModel, setSelectedModel } = useUser();
    const navigate = useNavigate();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [pendingUserId, setPendingUserId] = useState<number | null>(null);

    const handleSelectUser = (user: User) => {
        if (user.has_password) {
            setPendingUserId(user.id);
            setIsLoginOpen(true);
        } else {
            setCurrentUser(user);
            navigate('/');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserName.trim() || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newUserName,
                    password: newUserPassword || null,
                    avatar: `https://picsum.photos/seed/${newUserName}/100/100`,
                    weekly_goal: 0
                })
            });

            const data = await response.json();
            if (response.ok) {
                await refreshUsers();
                setCurrentUser(data);
                navigate('/');
            } else {
                setError(data.detail || 'IDENTITY_ESTABLISHMENT_FAILED');
            }
        } catch (error) {
            console.error('Failed to create user:', error);
            setError('CONNECTION_ERROR');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-background-dark overflow-hidden selection:bg-primary selection:text-background-dark">
            {/* Background elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-background-dark/50 to-background-dark"></div>
            </div>

            <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center gap-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <header className="space-y-4">
                    <div className="flex items-center justify-center gap-4 select-none">
                        <span className="text-white font-bold text-6xl tracking-tighter md:text-8xl">ONDA</span>
                        <span className="text-outline font-bold text-6xl tracking-tighter md:text-8xl">SONORA</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 text-primary text-sm tracking-[0.3em] font-mono">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        <span>SMART_LANGUAGE_TUTOR_AUTO_V2.6</span>
                    </div>
                </header>

                <section className="max-w-2xl text-gray-400 font-light leading-relaxed text-lg md:text-xl">
                    Experience the future of language learning.
                    Practice conversation with real-time feedback and intelligent tutoring.
                    Progress is saved automatically to your profile.
                </section>

                <div className="w-full max-w-2xl bg-surface/30 backdrop-blur-md border border-[#1f2b25] rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

                    <div className="mb-12 space-y-4">
                        <h2 className="text-white font-mono text-xs tracking-widest uppercase">Select AI Engine</h2>
                        <div className="grid grid-cols-3 gap-3">
                            {availableModels.map(model => (
                                <button
                                    key={model}
                                    onClick={() => setSelectedModel(model)}
                                    className={`py-3 px-2 rounded-xl border font-mono text-[10px] tracking-tighter transition-all duration-300 ${selectedModel === model
                                        ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(6,249,148,0.2)]'
                                        : 'bg-[#111815] border-[#1f2b25] text-muted hover:border-primary/30'
                                        }`}
                                >
                                    {model.replace(':latest', '').toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!showCreateForm ? (
                        <div className="space-y-8">
                            <h2 className="text-white font-mono text-xs tracking-widest uppercase">Select Identity</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {users.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectUser(user)}
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-[#111815] border border-[#1f2b25] hover:border-primary/50 transition-all duration-300 group/item hover:bg-[#1a2b25]"
                                    >
                                        <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border border-primary/20 group-hover/item:border-primary/50 transition-colors" />
                                        <div className="text-left">
                                            <p className="text-white font-bold tracking-tight">{user.name}</p>
                                            <p className="text-primary text-[10px] font-mono tracking-widest uppercase">Synced // {user.weekly_goal}% Goal</p>
                                        </div>
                                    </button>
                                ))}

                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="flex items-center justify-center gap-4 p-4 rounded-2xl border-2 border-dashed border-[#1f2b25] hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 text-muted hover:text-primary group/new"
                                >
                                    <span className="material-symbols-outlined group-hover/new:scale-110 transition-transform">add_circle</span>
                                    <span className="font-mono text-xs tracking-widest uppercase">New Identity</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between">
                                <h2 className="text-white font-mono text-xs tracking-widest uppercase">Establish New Identity</h2>
                                <button onClick={() => setShowCreateForm(false)} className="text-muted hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleCreateUser} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2 text-left">
                                        <label className="text-muted text-[10px] font-mono tracking-widest uppercase pl-1">Handle_ID</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            autoComplete="username"
                                            value={newUserName}
                                            onChange={(e) => setNewUserName(e.target.value)}
                                            placeholder="Enter Identification..."
                                            className="w-full bg-background-dark border border-[#1f2b25] rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-muted text-[10px] font-mono tracking-widest uppercase pl-1">Access_Shield (Optional)</label>
                                        <input
                                            type="password"
                                            autoComplete="new-password"
                                            value={newUserPassword}
                                            onChange={(e) => setNewUserPassword(e.target.value)}
                                            placeholder="Create secure key..."
                                            className="w-full bg-background-dark border border-[#1f2b25] rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-mono text-sm"
                                        />
                                    </div>
                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-500 text-[10px] font-mono flex items-center gap-2 animate-pulse">
                                            <span className="material-symbols-outlined text-sm">warning</span>
                                            <span>{error}</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={!newUserName.trim() || isSubmitting}
                                    className="w-full py-4 bg-primary text-background-dark font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed font-mono tracking-widest uppercase text-xs flex items-center justify-center gap-2"
                                >
                                    {isSubmitting && <span className="w-3 h-3 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin"></span>}
                                    {isSubmitting ? 'Initializing Identity...' : 'Confirm Identity'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <footer className="mt-12 opacity-30 text-[10px] font-mono tracking-[0.4em] uppercase text-muted">
                    Onda Sonora // Modern Language Learning // 2026
                </footer>
            </div>
            {pendingUserId && (
                <LoginModal
                    isOpen={isLoginOpen}
                    onClose={() => {
                        setIsLoginOpen(false);
                        setPendingUserId(null);
                    }}
                    userId={pendingUserId}
                    onSuccess={() => navigate('/')}
                />
            )}
        </div>
    );
}
