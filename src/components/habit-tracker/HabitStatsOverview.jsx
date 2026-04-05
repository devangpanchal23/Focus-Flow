import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { cn } from '../../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const HabitStatsOverview = ({ habits, completions, currentDate }) => {

    // --- Data Calculation for Donut Chart (Monthly Overview) ---
    const overviewData = useMemo(() => {
        if (!habits || !habits.length) return {
            completed: 0,
            left: 100,
            completedCount: 0,
            totalCount: 0,
            data: [
                { name: 'Completed', value: 0, color: '#10b981' },
                { name: 'Left', value: 100, color: '#f59e0b' }
            ]
        };

        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const monthStr = format(monthStart, 'yyyy-MM');

        let totalCompleted = 0;
        let totalPossible = habits.length * daysInMonth.length;

        habits.forEach(habit => {
            const habitCompletions = (completions && completions[habit.id]) || [];
            // Filter completions for this specific month
            const monthCompletions = habitCompletions.filter(date => date.startsWith(monthStr));
            totalCompleted += monthCompletions.length;
        });

        // If today is mid-month, should we count future days as "possible" or only up to today?
        // The reference implies "Left 91.9%", which suggests it includes the whole month's potential.
        // Let's stick to total possible for the month.

        const completedPercentage = totalPossible === 0 ? 0 : Math.round((totalCompleted / totalPossible) * 1000) / 10; // 1 decimal place
        const leftPercentage = 100 - completedPercentage;

        return {
            completed: completedPercentage,
            left: leftPercentage,
            completedCount: totalCompleted,
            totalCount: totalPossible,
            data: [
                { name: 'Completed', value: completedPercentage, color: '#10b981' }, // emerald-500
                { name: 'Left', value: leftPercentage, color: '#f59e0b' } // amber-500
            ]
        };
    }, [habits, completions, currentDate]);


    // --- Data Calculation for Top Habits ---
    const topHabits = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const monthStr = format(monthStart, 'yyyy-MM');
        const totalDays = daysInMonth.length;

        const habitsWithStats = habits.map(habit => {
            const habitCompletions = (completions && completions[habit.id]) || [];
            const monthCompletions = habitCompletions.filter(date => date.startsWith(monthStr)).length;
            const percentage = totalDays === 0 ? 0 : Math.round((monthCompletions / totalDays) * 100);

            return {
                ...habit,
                monthCompletions,
                percentage
            };
        });

        // Sort by percentage descending
        return habitsWithStats.sort((a, b) => b.percentage - a.percentage).slice(0, 10);
    }, [habits, completions, currentDate]);


    // --- Custom Label/Content for Center of Donut ---
    // Recharts doesn't make custom center easy in responsive container without absolute positioning overlay
    // We will use a div overlay.

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {/* Overview Donut Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden">
                <h3 className="text-slate-800 font-bold text-sm tracking-wider uppercase mb-6 text-center">Overview Daily Progress</h3>

                <div className="flex-1 flex items-center justify-center relative min-h-[250px]">
                    <PieChart width={240} height={240}>
                        <Pie
                            data={overviewData.data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={5}
                            paddingAngle={2}
                        >
                            {overviewData.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value) => `${value}%`}
                        />
                    </PieChart>

                    {/* Center Text */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                        <span className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Completed</span>
                        <span className="text-3xl font-bold text-slate-800">{overviewData.completed}%</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-xs text-slate-500 font-medium">LEFT <span className="text-slate-700">{overviewData.left}%</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-xs text-slate-500 font-medium">COMPLETED <span className="text-slate-700">{overviewData.completed}%</span></span>
                    </div>
                </div>
            </div>

            {/* Top 10 Habits List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col max-h-[400px]">
                <h3 className="text-slate-800 font-bold text-sm tracking-wider uppercase mb-6">Top 10 Daily Habits</h3>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                    {topHabits.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                            <p>No habits tracked this month.</p>
                        </div>
                    ) : (
                        topHabits.map((habit, index) => (
                            <div key={habit.id} className="group relative bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-4 transition-all">
                                {/* Rank */}
                                <div className="w-8 flex justify-center text-slate-400 font-mono text-sm group-hover:text-slate-600 transition-colors">
                                    {index + 1}.
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="font-medium text-slate-700 text-sm truncate pr-2">{habit.title}</span>
                                        <span className={cn(
                                            "font-bold text-xs",
                                            habit.percentage >= 80 ? "text-emerald-500" :
                                                habit.percentage >= 50 ? "text-amber-500" : "text-slate-400"
                                        )}>
                                            {habit.percentage}%
                                        </span>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                habit.percentage >= 80 ? "bg-emerald-500" :
                                                    habit.percentage >= 50 ? "bg-amber-500" : "bg-slate-400"
                                            )}
                                            style={{ width: `${habit.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default HabitStatsOverview;
