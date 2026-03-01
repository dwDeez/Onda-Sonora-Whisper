import { useState } from 'react';
import { useUser, User } from '../contexts/UserContext';

export default function AdminPanel() {
    const { users, addUser, updateUser, deleteUser, currentUser } = useUser();
    const [isEditing, setIsEditing] = useState<number | null>(null);
    const [formData, setFormData] = useState<Omit<User, 'id'>>({
        name: '',
        avatar: 'https://picsum.photos/seed/new/100/100',
        weekly_goal: 80,
        role: 'USER'
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="text-center space-y-4 max-w-md bg-surface border border-accent/30 p-8 rounded-xl">
                    <span className="material-symbols-outlined text-accent text-5xl">gpp_maybe</span>
                    <h2 className="text-2xl font-bold text-white tracking-tighter uppercase">Access Denied</h2>
                    <p className="text-text-muted font-mono text-sm leading-relaxed">
                        CRITICAL_ERROR: Unauthorized access detected. Administrative privileges are required to access this terminal.
                    </p>
                </div>
            </div>
        );
    }

    const resetForm = () => {
        setFormData({
            name: '',
            avatar: `https://picsum.photos/seed/${Math.random()}/100/100`,
            weekly_goal: 80,
            role: 'USER'
        });
        setIsEditing(null);
    };

    const handleEdit = (user: User) => {
        setIsEditing(user.id);
        setFormData({
            name: user.name,
            avatar: user.avatar,
            weekly_goal: user.weekly_goal,
            role: user.role
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) {
            await updateUser(isEditing, formData);
        } else {
            await addUser(formData);
        }
        resetForm();
    };

    return (
        <div className="flex flex-col h-full w-full">
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

            <header className="flex flex-shrink-0 items-center justify-between px-8 py-6 border-b border-[#1f2b25] bg-background-dark/80 backdrop-blur-md z-10">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-bold text-white tracking-tighter uppercase">Admin_Portal</h2>
                    <div className="flex items-center gap-2 text-muted text-xs font-mono">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        <span>USER_MANAGEMENT_UNIT</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <div className="bg-surface border border-[#333] rounded-xl p-6 shadow-2xl sticky top-0">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="material-symbols-outlined text-primary">
                                {isEditing ? 'edit_square' : 'person_add'}
                            </span>
                            <h3 className="text-white text-xl font-bold tracking-tight">
                                {isEditing ? 'Edit Subject' : 'Register New Subject'}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="group">
                                <label className="block text-text-muted text-[10px] font-mono tracking-widest mb-1 uppercase pl-1 transition-colors group-focus-within:text-primary">
                                    Identity Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-background-dark border border-[#333] text-white rounded-lg p-3 focus:outline-none focus:border-primary font-mono text-sm"
                                    placeholder="Subject name..."
                                />
                            </div>

                            <div className="group">
                                <label className="block text-text-muted text-[10px] font-mono tracking-widest mb-1 uppercase pl-1 transition-colors group-focus-within:text-primary">
                                    Neural Goal (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    required
                                    value={formData.weekly_goal}
                                    onChange={e => setFormData({ ...formData, weekly_goal: parseInt(e.target.value) })}
                                    className="w-full bg-background-dark border border-[#333] text-white rounded-lg p-3 focus:outline-none focus:border-primary font-mono text-sm"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-text-muted text-[10px] font-mono tracking-widest mb-1 uppercase pl-1 transition-colors group-focus-within:text-primary">
                                    Access Level
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'USER' })}
                                    className="w-full bg-background-dark border border-[#333] text-white rounded-lg p-3 focus:outline-none focus:border-primary font-mono text-sm appearance-none"
                                >
                                    <option value="USER">GENERIC_USER</option>
                                    <option value="ADMIN">SYS_ADMIN</option>
                                </select>
                            </div>

                            <div className="group">
                                <label className="block text-text-muted text-[10px] font-mono tracking-widest mb-1 uppercase pl-1 transition-colors group-focus-within:text-primary">
                                    Avatar Link
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.avatar}
                                    onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                                    className="w-full bg-background-dark border border-[#333] text-white rounded-lg p-3 focus:outline-none focus:border-primary font-mono text-xs"
                                />
                            </div>

                            <div className="pt-4 flex gap-2">
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-background-dark text-xs font-bold rounded-lg transition-all uppercase tracking-widest"
                                >
                                    {isEditing ? 'Commit Changes' : 'Initialize Subject'}
                                </button>
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-4 py-3 bg-surface border border-[#333] text-text-muted hover:text-white rounded-lg transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-text-muted text-xs font-mono tracking-[0.2em] uppercase">Active_Records // Total: {users.length}</h3>
                    </div>

                    <div className="bg-surface border border-[#333] rounded-xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#333] bg-background-dark/30">
                                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-text-muted">Subject</th>
                                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-text-muted">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-text-muted">Neural_Goal</th>
                                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-text-muted text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#333]">
                                {users.map(user => (
                                    <tr key={user.id} className="group hover:bg-background-dark/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src={user.avatar} className="w-10 h-10 rounded-lg border border-primary/20" alt="" />
                                                <div>
                                                    <p className="text-white font-bold text-sm">{user.name}</p>
                                                    <p className={`text-[10px] font-mono uppercase tracking-wider ${user.role === 'ADMIN' ? 'text-primary' : 'text-text-muted'}`}>
                                                        {user.role}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow-primary"></span>
                                                <span className="text-xs font-mono text-primary uppercase">Synced</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-32 bg-[#111815] h-1 rounded-full overflow-hidden">
                                                <div className="bg-primary h-full" style={{ width: `${user.weekly_goal}%` }}></div>
                                            </div>
                                            <span className="text-[10px] font-mono text-text-muted mt-1 inline-block">{user.weekly_goal}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 text-text-muted hover:text-primary transition-colors hover:bg-primary/5 rounded-lg"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => deleteUser(user.id)}
                                                    disabled={currentUser.id === user.id}
                                                    className="p-2 text-text-muted hover:text-accent transition-colors hover:bg-accent/5 rounded-lg disabled:opacity-20"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
