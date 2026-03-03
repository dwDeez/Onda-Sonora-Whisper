import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Shield, AlertTriangle, X } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    onSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, userId, onSuccess }) => {
    const { login, users } = useUser();
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const user = users.find(u => u.id === userId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const success = await login(userId, password);
        if (success) {
            onSuccess();
            onClose();
        } else {
            setError('LLAVE_DE_ACCESO_INVALIDA');
        }
        setIsLoading(false);
    };

    if (!isOpen || !user) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-md bg-surface/90 border border-[#1f2b25] rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col items-center text-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Shield className="text-primary w-10 h-10" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-white font-bold text-2xl tracking-tight">IDENTITY_VERIFICATION</h2>
                            <p className="text-gray-400 text-sm font-mono">Verifying access for <span className="text-primary">{user.name}</span></p>
                        </div>

                        <form onSubmit={handleSubmit} className="w-full space-y-6">
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-mono text-primary/60 uppercase tracking-widest ml-1">Access_Key_Required</label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
                                    <input
                                        autoFocus
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter secure key..."
                                        className="w-full bg-[#0a0f18] border border-[#1f2b25] rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-mono"
                                    />
                                </div>
                                {error && (
                                    <p className="text-red-500 text-[10px] font-mono mt-2 flex items-center gap-2 animate-pulse">
                                        <AlertTriangle size={12} /> {error}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !password}
                                className="w-full py-4 bg-primary text-background-dark font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 font-mono tracking-widest flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin"></div>
                                ) : (
                                    <>CONFIRM_IDENTITY</>
                                )}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LoginModal;
