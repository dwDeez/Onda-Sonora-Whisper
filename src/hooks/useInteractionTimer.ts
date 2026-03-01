import { useState, useEffect, useRef, useCallback } from 'react';

export function useInteractionTimer(timeoutMs: number = 20000) {
    const [activeSeconds, setActiveSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const lastInteractionRef = useRef<number>(Date.now());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const recordInteraction = useCallback(() => {
        lastInteractionRef.current = Date.now();
        if (!isActive) setIsActive(true);
    }, [isActive]);

    useEffect(() => {
        // Start interval
        intervalRef.current = setInterval(() => {
            const now = Date.now();
            const diff = now - lastInteractionRef.current;

            if (diff < timeoutMs) {
                setActiveSeconds(prev => prev + 1);
                setIsActive(true);
            } else {
                setIsActive(false);
            }
        }, 1000);

        // Global interaction listeners
        const events = ['mousedown', 'keydown', 'touchstart', 'mousemove'];
        events.forEach(event => window.addEventListener(event, recordInteraction));

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            events.forEach(event => window.removeEventListener(event, recordInteraction));
        };
    }, [recordInteraction, timeoutMs]);

    const resetTimer = () => {
        setActiveSeconds(0);
        lastInteractionRef.current = Date.now();
    };

    return { activeSeconds, isActive, recordInteraction, resetTimer };
}
