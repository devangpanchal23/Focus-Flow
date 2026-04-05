import React from 'react';

export default function ProgressRing({
    radius = 60,
    stroke = 10,
    progress = 0,
    total = 0
}) {
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center relative">
            <svg
                height={radius * 2}
                width={radius * 2}
                className="transform -rotate-90"
            >
                <circle
                    stroke="#f1f5f9" // slate-100
                    strokeWidth={stroke}
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    stroke="#6366f1" // indigo-500
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-slate-800">{Math.round(progress)}%</span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Today</span>
            </div>
        </div>
    );
}
