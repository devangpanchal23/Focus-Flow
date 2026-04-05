import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { cn } from '../../lib/utils';

const HabitAnalysis = ({ habits, completions, currentDate }) => {

    // Calculate Daily Progress Data for the Graph
    const graphData = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

        return daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            let completedCount = 0;

            habits.forEach(habit => {
                if (completions && completions[habit.id] && completions[habit.id].includes(dateStr)) {
                    completedCount++;
                }
            });

            const totalHabits = habits.length;
            const percentage = totalHabits === 0 ? 0 : Math.round((completedCount / totalHabits) * 100);

            return {
                date: format(day, 'd'), // Just day number for axis
                fullDate: format(day, 'MMM d'), // For tooltip
                percentage
            };
        });
    }, [habits, completions, currentDate]);

    // Calculate Analysis Data for Individual Habits
    const analysisData = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const monthStr = format(monthStart, 'yyyy-MM');
        const totalDays = daysInMonth.length; // Goal is total days in month? Or should it be user defined? User said "Goal that count that month days".

        return habits.map(habit => {
            const habitCompletions = (completions && completions[habit.id]) || [];
            const actual = habitCompletions.filter(date => date.startsWith(monthStr)).length;
            const percentage = totalDays === 0 ? 0 : (actual / totalDays) * 100;

            return {
                id: habit.id,
                title: habit.title,
                goal: totalDays,
                actual: actual,
                percentage
            };
        });
    }, [habits, completions, currentDate]);

    return (
        <div className="space-y-8 mt-8">
            {/* Weekly Progress Graph */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-slate-800 font-bold text-sm tracking-wider uppercase mb-6 text-center">Weekly Progress By Graph</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={graphData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                tickFormatter={(value) => `${value}%`}
                                domain={[0, 100]}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                formatter={(value) => [`${value}%`, 'Completion']}
                                labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label}
                            />
                            <Area
                                type="monotone"
                                dataKey="percentage"
                                stroke="#10b981"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorProgress)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Analysis Section (Goal vs Actual) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-slate-800 font-bold text-lg mb-6">Analysis</h3>

                <div className="space-y-6">
                    {analysisData.map(habit => (
                        <div key={habit.id} className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="font-semibold text-slate-700 text-sm">{habit.title}</span>
                                <div className="flex gap-4 text-xs font-mono text-slate-500">
                                    <span>Goal: <span className="text-slate-700 font-bold">{habit.goal}</span></span>
                                    <span>Actual: <span className={cn(
                                        "font-bold",
                                        habit.actual === habit.goal ? "text-emerald-600" : "text-slate-700"
                                    )}>{habit.actual}</span></span>
                                </div>
                            </div>

                            {/* Progress Bar Container */}
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${habit.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}

                    {analysisData.length === 0 && (
                        <p className="text-center text-slate-400 text-sm py-4">No habits to analyze.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HabitAnalysis;
