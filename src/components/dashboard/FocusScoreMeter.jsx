import React, { useEffect } from 'react';
import { useFocusScoreStore } from '../../store/useFocusScoreStore';
import { HelpCircle, Zap, Target, Activity, Coffee, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

const ScoreTooltip = ({ data }) => {
    if (!data) return null;

    const items = [
        { label: 'Task Completion', score: data.taskCompletionScore, weight: '40', icon: Target, color: 'text-blue-400' },
        { label: 'Focus Sessions', score: data.focusSessionScore, weight: '25', icon: Zap, color: 'text-indigo-400' },
        { label: 'Habit Consistency', score: data.habitConsistencyScore, weight: '20', icon: Activity, color: 'text-emerald-400' },
        { label: 'Distraction Control', score: data.distractionControlScore, weight: '10', icon: ShieldAlert, color: 'text-rose-400' },
        { label: 'Break Discipline', score: data.breakDisciplineScore, weight: '5', icon: Coffee, color: 'text-amber-400' },
    ];

    return (
        <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-sm font-bold text-white mb-3 border-b border-slate-800 pb-2">Score Breakdown</h4>
            <div className="space-y-3">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <item.icon size={14} className={item.color} />
                            <span className="text-xs text-slate-300">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-500">{item.weight}%</span>
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${item.color.replace('text-', 'bg-')}`}
                                    style={{ width: `${item.score}%` }}
                                />
                            </div>
                            <span className={`text-xs font-bold ${item.score === 100 ? 'text-emerald-400' : 'text-white'}`}>
                                {item.score}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function FocusScoreMeter() {
    const { scoreData, fetchScore } = useFocusScoreStore();

    useEffect(() => {
        // Fetch score for today on mount
        const dateStr = format(new Date(), 'yyyy-MM-dd');
        fetchScore(dateStr);
    }, [fetchScore]);

    const score = scoreData?.finalFocusScore || 0;

    // Color Logic
    let color = '#ef4444'; // Red
    if (score >= 70) color = '#10b981'; // Green
    else if (score >= 40) color = '#f59e0b'; // Yellow

    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between gap-4 relative group">
            <div className="flex items-center gap-4">
                {/* Circular Meter */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Background Ring */}
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="transparent"
                            className="text-slate-700"
                        />
                        {/* Progress Ring */}
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            stroke={color}
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <span className="absolute text-lg font-bold text-white font-mono">
                        {score}
                    </span>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-slate-200">Focus Score</h3>
                    <p className="text-xs text-slate-500">Daily productivity</p>
                </div>
            </div>

            {/* Info Icon & Tooltip */}
            <div className="relative group">
                <HelpCircle className="w-5 h-5 text-slate-600 hover:text-slate-400 cursor-pointer transition-colors" />
                <div className="hidden group-hover:block transition-all">
                    <ScoreTooltip data={scoreData} />
                </div>
            </div>
        </div>
    );
}
