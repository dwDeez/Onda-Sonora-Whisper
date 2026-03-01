import React, { createContext, useContext, useState, useEffect } from 'react';
import { ollama } from '../services/ollamaApi';

export interface User {
    id: number;
    name: string;
    avatar: string;
    weekly_goal: number;
    role: 'ADMIN' | 'USER';
    total_review_seconds: number;
}

interface UserContextType {
    currentUser: User | null;
    users: User[];
    selectedModel: string;
    isLoading: boolean;
    setCurrentUser: (user: User) => void;
    setSelectedModel: (model: string) => void;
    refreshUsers: () => Promise<void>;
    addUser: (user: Omit<User, 'id'>) => Promise<User>;
    updateUser: (id: number, user: Omit<User, 'id'>) => Promise<User>;
    deleteUser: (id: number) => Promise<void>;
    availableModels: string[];
    logout: () => void;
    incrementReviewTime: (seconds: number) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [selectedModel, setModel] = useState<string>(localStorage.getItem('selected_model') || 'llama3:latest');
    const [isLoading, setIsLoading] = useState(true);

    const availableModels = ['llama3:latest', 'qwen2.5-coder:7b', 'qwen2.5-coder:14b'];

    const refreshUsers = async () => {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            setUsers(data);

            // Restore last user if possible from SESSION storage (for refreshes)
            const activeUserId = sessionStorage.getItem('active_user_id');
            if (!currentUser && activeUserId) {
                const activeUser = data.find((u: User) => u.id.toString() === activeUserId);
                if (activeUser) setCurrentUser(activeUser);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const addUser = async (user: Omit<User, 'id'>) => {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        const newUser = await response.json();
        await refreshUsers();
        return newUser;
    };

    const updateUser = async (id: number, user: Omit<User, 'id'>) => {
        const response = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        const updatedUser = await response.json();
        await refreshUsers();
        if (currentUser?.id === id) setCurrentUser(updatedUser);
        return updatedUser;
    };

    const deleteUser = async (id: number) => {
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
        await refreshUsers();
        if (currentUser?.id === id) {
            const remaining = users.filter(u => u.id !== id);
            if (remaining.length > 0) setCurrentUser(remaining[0]);
            else setCurrentUser(null);
        }
    };

    useEffect(() => {
        refreshUsers();
    }, []);

    useEffect(() => {
        if (currentUser) {
            sessionStorage.setItem('active_user_id', currentUser.id.toString());
            localStorage.setItem('last_user_id', currentUser.id.toString());
        }
    }, [currentUser]);

    useEffect(() => {
        localStorage.setItem('selected_model', selectedModel);
        if (typeof ollama !== 'undefined' && ollama.setModel) {
            ollama.setModel(selectedModel);
        }
    }, [selectedModel]);

    const setSelectedModel = (model: string) => {
        setModel(model);
    };

    const incrementReviewTime = async (seconds: number) => {
        if (!currentUser) return;
        try {
            await fetch(`/api/users/${currentUser.id}/review_time?seconds=${seconds}`, {
                method: 'PUT'
            });
            // Update local state
            setCurrentUser(prev => prev ? { ...prev, total_review_seconds: prev.total_review_seconds + seconds } : null);
            setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, total_review_seconds: u.total_review_seconds + seconds } : u));
        } catch (error) {
            console.error('Failed to increment review time:', error);
        }
    };

    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('active_user_id');
    };

    return (
        <UserContext.Provider value={{
            currentUser,
            users,
            selectedModel,
            isLoading,
            setCurrentUser,
            setSelectedModel,
            refreshUsers,
            addUser,
            updateUser,
            deleteUser,
            availableModels,
            logout,
            incrementReviewTime
        }}>
            {children}
        </UserContext.Provider>
    );
};


export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
