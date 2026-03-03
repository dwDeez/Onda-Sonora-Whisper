import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Shield, Globe, Instagram, Twitter, Github, Save, Key, Camera } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface UserProfile {
    id: number;
    name: string;
    avatar: string;
    role: string;
    alias?: string;
    bio?: string;
    social_links?: string;
    banner?: string;
    weekly_goal: number;
}

interface SocialLinks {
    instagram: string;
    twitter: string;
    github: string;
}

const Profile: React.FC = () => {
    const { currentUser: authUser } = useUser();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [socials, setSocials] = useState<SocialLinks>({ instagram: '', twitter: '', github: '' });
    const [passwordData, setPasswordData] = useState({ old: '', new: '', confirm: '' });
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (!authUser) return;

        const currentUserId = authUser.id;
        fetch(`/api/users`)
            .then(res => res.json())
            .then(data => {
                const currentUser = data.find((u: any) => u.id === currentUserId);
                if (currentUser) {
                    setUser(currentUser);
                    setFormData(currentUser);
                    if (currentUser.social_links) {
                        try {
                            setSocials(JSON.parse(currentUser.social_links));
                        } catch (e) {
                            console.error("Error parsing social links", e);
                        }
                    }
                }
            });
    }, [authUser]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const payload = {
            ...formData,
            social_links: JSON.stringify(socials)
        };

        try {
            const response = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const updated = await response.json();
                setUser(updated);
                setIsEditing(false);
                setMessage({ text: 'Perfil actualizado correctamente', type: 'success' });
            } else {
                setMessage({ text: 'Error al actualizar el perfil', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Error de conexión', type: 'error' });
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.new !== passwordData.confirm) {
            setMessage({ text: 'Las contraseñas no coinciden', type: 'error' });
            return;
        }

        try {
            const response = await fetch(`/api/users/${user?.id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    old_password: passwordData.old,
                    new_password: passwordData.new,
                }),
            });

            if (response.ok) {
                setMessage({ text: 'Contraseña actualizada con éxito', type: 'success' });
                setPasswordData({ old: '', new: '', confirm: '' });
            } else {
                const err = await response.json();
                setMessage({ text: err.detail || 'Error al cambiar contraseña', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Error de conexión', type: 'error' });
        }
    };

    if (!user) return <div className="p-8 text-white font-mono animate-pulse">SYNCHRONIZING_NERVES...</div>;

    const defaultBanner = "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=1000";

    return (
        <div className="min-h-screen p-4 md:p-8 bg-[#0a0f18] text-white font-['Outfit'] scroll-smooth">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto space-y-8"
            >
                {/* Header / Banner / Avatar */}
                <div className="relative group rounded-3xl overflow-hidden border border-white/10">
                    <div className="h-64 bg-[#111827] overflow-hidden relative">
                        <img
                            src={user.banner || defaultBanner}
                            alt="Banner"
                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] to-transparent" />

                        {isEditing && (
                            <div className="absolute top-4 right-4 flex gap-2">
                                <div className="flex flex-col items-end">
                                    <input
                                        type="text"
                                        placeholder="URL del Banner"
                                        value={formData.banner || ''}
                                        onChange={(e) => setFormData({ ...formData, banner: e.target.value })}
                                        className="bg-[#0a0f18]/80 border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-blue-500 backdrop-blur-md outline-none transition-all w-64"
                                    />
                                    <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-mono">Profile_Banner_Source</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="absolute -bottom-1 left-8 flex items-end gap-6 translate-y-[-50%]">
                        <div className="relative">
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-32 h-32 rounded-3xl border-4 border-[#0a0f18] object-cover bg-[#1a1f2e] shadow-2xl shadow-blue-500/20"
                            />
                            {isEditing && (
                                <button className="absolute bottom-2 right-2 p-2 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors shadow-lg">
                                    <Camera size={20} />
                                </button>
                            )}
                        </div>

                        <div className="mb-4 bg-[#0a0f18]/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-xl">
                            <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
                            <p className="text-blue-400 font-medium font-mono">@{user.alias || user.name.toLowerCase().replace(' ', '_')}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
                    {/* Sidebar: Bio & Socials */}
                    <div className="space-y-6">
                        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl group hover:border-blue-500/30 transition-all duration-500">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg"><User size={20} className="text-blue-400" /></div>
                                Bio
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed italic">
                                "{user.bio || "No hay biografía disponible todavía. ¡Cuéntanos algo sobre ti!"}"
                            </p>
                        </div>

                        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl group hover:border-purple-500/30 transition-all duration-500">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg"><Globe size={20} className="text-purple-400" /></div>
                                Social_Nerves
                            </h3>
                            <div className="flex flex-col gap-4">
                                {socials.instagram && (
                                    <a href={socials.instagram} target="_blank" className="flex items-center gap-3 text-sm text-gray-400 hover:text-pink-500 transition-colors">
                                        <Instagram size={18} /> Instagram
                                    </a>
                                )}
                                {socials.twitter && (
                                    <a href={socials.twitter} target="_blank" className="flex items-center gap-3 text-sm text-gray-400 hover:text-blue-400 transition-colors">
                                        <Twitter size={18} /> Twitter
                                    </a>
                                )}
                                {socials.github && (
                                    <a href={socials.github} target="_blank" className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors">
                                        <Github size={18} /> Github
                                    </a>
                                )}
                                {!socials.instagram && !socials.twitter && !socials.github && (
                                    <p className="text-xs text-gray-500 font-mono">NO_SOCIAL_SIGNALS_DETECTED</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Info & Edit Form */}
                    <div className="md:col-span-2 space-y-6">
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`p-4 rounded-2xl border flex items-center justify-between ${message.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}
                            >
                                <span>{message.text}</span>
                                <button onClick={() => setMessage(null)} className="text-[10px] uppercase font-bold px-2 py-1 hover:bg-white/5 rounded">Cerrar</button>
                            </motion.div>
                        )}

                        <div className="p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        Información Personal
                                    </h2>
                                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">Global_User_Data</span>
                                </div>
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-6 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 active:scale-95 transition-all font-bold tracking-tight"
                                    >
                                        EDITAR PERFIL
                                    </button>
                                ) : (
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 text-gray-400 hover:text-white transition-all text-sm font-medium"
                                        >
                                            CANCELAR
                                        </button>
                                        <button
                                            onClick={handleUpdateProfile}
                                            className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 font-bold"
                                        >
                                            <Save size={18} /> GUARDAR
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono text-gray-500 uppercase tracking-widest ml-1">Legal_Name</label>
                                        <input
                                            type="text"
                                            disabled={!isEditing}
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-[#0a0f18] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all disabled:opacity-40"
                                            placeholder="Nombre"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono text-gray-500 uppercase tracking-widest ml-1">Alias_Identification</label>
                                        <input
                                            type="text"
                                            disabled={!isEditing}
                                            value={formData.alias || ''}
                                            onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                                            className="w-full bg-[#0a0f18] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all disabled:opacity-40"
                                            placeholder="Alias"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-xs font-mono text-gray-500 uppercase tracking-widest ml-1">Neural_Biography</label>
                                        <textarea
                                            disabled={!isEditing}
                                            value={formData.bio || ''}
                                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                            rows={3}
                                            className="w-full bg-[#0a0f18] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all disabled:opacity-40 resize-none"
                                            placeholder="Escribe algo sobre ti..."
                                        />
                                    </div>
                                </div>

                                {/* Social Links Editing */}
                                {isEditing && (
                                    <div className="border-t border-white/5 pt-8 space-y-6">
                                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest font-mono">Configure_Social_Uplinks</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3 bg-[#0a0f18] border border-white/10 rounded-xl p-3 focus-within:border-pink-500/50 transition-all">
                                                <Instagram size={18} className="text-pink-500" />
                                                <input
                                                    type="text"
                                                    placeholder="URL Instagram"
                                                    value={socials.instagram}
                                                    onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
                                                    className="bg-transparent border-none outline-none text-sm w-full"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3 bg-[#0a0f18] border border-white/10 rounded-xl p-3 focus-within:border-blue-400/50 transition-all">
                                                <Twitter size={18} className="text-blue-400" />
                                                <input
                                                    type="text"
                                                    placeholder="URL Twitter"
                                                    value={socials.twitter}
                                                    onChange={(e) => setSocials({ ...socials, twitter: e.target.value })}
                                                    className="bg-transparent border-none outline-none text-sm w-full"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3 bg-[#0a0f18] border border-white/10 rounded-xl p-3 focus-within:border-white/50 transition-all">
                                                <Github size={18} className="text-white" />
                                                <input
                                                    type="text"
                                                    placeholder="URL Github"
                                                    value={socials.github}
                                                    onChange={(e) => setSocials({ ...socials, github: e.target.value })}
                                                    className="bg-transparent border-none outline-none text-sm w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Password Security */}
                        <div className="p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold flex items-center gap-3 uppercase tracking-tighter">
                                    <Shield className="text-purple-500" /> Neural_Crypt_Security
                                </h2>
                            </div>
                            <form onSubmit={handlePasswordChange} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-2 ml-1">Current_Key</label>
                                        <input
                                            type="password"
                                            value={passwordData.old}
                                            onChange={(e) => setPasswordData({ ...passwordData, old: e.target.value })}
                                            className="w-full bg-[#0a0f18] border border-white/10 rounded-xl p-4 focus:border-purple-500 outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-2 ml-1">New_Key</label>
                                        <input
                                            type="password"
                                            value={passwordData.new}
                                            onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                                            className="w-full bg-[#0a0f18] border border-white/10 rounded-xl p-4 focus:border-purple-500 outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-2 ml-1">Confirm_New_Key</label>
                                        <input
                                            type="password"
                                            value={passwordData.confirm}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                            className="w-full bg-[#0a0f18] border border-white/10 rounded-xl p-4 focus:border-purple-500 outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20 active:scale-95 flex items-center gap-3 font-bold"
                                >
                                    <Key size={18} /> ACTUALIZAR LLAVE
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Profile;
