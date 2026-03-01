import React from 'react';

interface CircularProgressProps {
    value: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    showValue?: boolean;
    label?: string;
    unit?: string;
}

export default function CircularProgress({
    value,
    size = 100,
    strokeWidth = 8,
    color = "#06f994",
    showValue = true,
    label,
    unit = "%"
}: CircularProgressProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-700">
            <div className="relative" style={{ width: size, height: size }}>
                {/* Background Track */}
                <svg className="transform -rotate-90 w-full h-full">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="rgba(6, 249, 148, 0.05)"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        className="transition-all duration-300"
                    />
                    {/* Progress Bar with Neon Glow */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{
                            filter: `drop-shadow(0 0 6px ${color}80)`,
                            transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.3s ease'
                        }}
                    />
                </svg>

                {/* Center Content */}
                {showValue && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-white font-bold leading-none select-none" style={{ fontSize: size * 0.22 }}>
                            {Math.round(value)}{unit}
                        </span>
                        {label && (
                            <span className="text-muted font-mono uppercase tracking-tighter mt-1 select-none" style={{ fontSize: size * 0.08 }}>
                                {label}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
