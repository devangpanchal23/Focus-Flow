import React from 'react';
import Greeting from './Greeting';
import ProgressRing from './ProgressRing';
import FocusSessionManager from './FocusSessionManager';
import FocusScoreMeter from './FocusScoreMeter';
import { useTaskStore } from '../../store/useTaskStore';
import { Clock, CheckCircle2, TrendingUp } from 'lucide-react';

export default function Dashboard() {
    const { tasks, logTime } = useTaskStore();

    const completedToday = tasks.filter(t => t.completed).length;
    const totalToday = tasks.length; // Simply using all tasks as "today" for now
    const progress = totalToday === 0 ? 0 : (completedToday / totalToday) * 100;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <Greeting />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-6">
                    {/* Focus Score */}
                    <FocusScoreMeter />

                    {/* Progress Card */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                        <h3 className="text-slate-500 text-sm font-medium mb-4 self-start">Task Progress</h3>
                        <ProgressRing progress={progress} radius={80} stroke={12} />
                        <div className="mt-6 flex justify-between w-full text-center px-4">
                            <div>
                                <p className="text-2xl font-bold text-slate-700">{completedToday}</p>
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Done</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-700">{totalToday}</p>
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Total</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Focus Session Manager */}
                <div className="md:col-span-2">
                    <FocusSessionManager tasks={tasks} onTaskUpdate={logTime} />
                </div>
            </div>

            {/* Quick Stats Row - REMOVED */}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, trend }) {
    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Icon size={20} />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>
            </div>
            <div className="mt-2">
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-slate-400 text-sm">{label}</p>
            </div>
        </div>
    )
}
