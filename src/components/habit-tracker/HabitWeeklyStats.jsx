import React, { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, getISOWeek, isSameDay } from 'date-fns';
import { cn } from '../../lib/utils'; // Assuming this exists based on HabitTracker.jsx

const HabitWeeklyStats = ({ habits, completions, currentDate }) => {
    // Helper to group days into weeks specific to the month view
    const weeks = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
        // Actually, we need to respect the daysInMonth passed from parent or recalculate
        // The parent uses startOfMonth to endOfMonth.
        // Let's rely on creating weeks that fit the month view.

        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const weeksArray = [];
        let currentWeek = [];

        // Loop through all days of the month
        for (let day = new Date(monthStart); day <= monthEnd; day.setDate(day.getDate() + 1)) {
            const currentDay = new Date(day);
            currentWeek.push(currentDay);

            // Filter into strict 7-day chunks naturally
            if (currentWeek.length === 7 || isSameDay(currentDay, monthEnd)) {
                weeksArray.push(currentWeek);
                currentWeek = [];
            }
        }
        return weeksArray;
    }, [currentDate]);

    // Calculate Stats
    const getWeekStats = (weekDays) => {
        let totalPossible = habits.length * weekDays.length;
        let totalCompleted = 0;

        const dailyStats = weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            let dailyCompleted = 0;

            habits.forEach(habit => {
                if (completions && completions[habit.id] && completions[habit.id].includes(dateStr)) {
                    dailyCompleted++;
                }
            });

            totalCompleted += dailyCompleted;

            return {
                dayName: format(day, 'EEE'), // Mo, Tu
                dayNum: format(day, 'd'),
                completed: dailyCompleted,
                total: habits.length
            };
        });

        const percentage = totalPossible === 0 ? 0 : Math.round((totalCompleted / totalPossible) * 100);

        return {
            range: `${format(weekDays[0], 'd')}${format(weekDays[0], 'EEE')[0]} - ${format(weekDays[weekDays.length - 1], 'd')}${format(weekDays[weekDays.length - 1], 'EEE')[0]}`,
            dailyStats,
            totalCompleted,
            totalPossible,
            percentage
        };
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-8">
            {weeks.map((week, index) => {
                const stats = getWeekStats(week);

                return (
                    <div key={index} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col justify-between min-h-[220px]">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <span className="text-slate-800 font-bold text-sm tracking-wider uppercase">WEEK {index + 1}</span>
                            <span className="text-slate-400 text-xs font-mono">{stats.range}</span>
                        </div>

                        {/* Bar Chart */}
                        <div className="flex items-end justify-between gap-1 h-32 mb-4">
                            {stats.dailyStats.map((dayStat, i) => {
                                const barHeight = dayStat.total === 0 ? 0 : (dayStat.completed / dayStat.total) * 100;
                                return (
                                    <div key={i} className="flex flex-col items-center gap-2 group w-full h-full justify-end">
                                        {/* Tooltip containing exact count */}
                                        <div className="relative w-full flex justify-center h-full items-end pb-1">
                                            {/* Track Background */}
                                            <div className="absolute bottom-0 w-full h-full bg-slate-100 rounded-t-sm" />

                                            {/* Active Bar */}
                                            <div
                                                className="w-full bg-emerald-500 rounded-t-sm transition-all duration-500 ease-out hover:bg-emerald-400 z-10 relative"
                                                style={{ height: `${Math.max(barHeight, 0)}%`, opacity: barHeight === 0 ? 0 : 1 }}
                                            >
                                                {barHeight > 0 && (
                                                    <span className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded transition-opacity whitespace-nowrap z-20 shadow-lg pointer-events-none">
                                                        {dayStat.completed}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] text-slate-400 font-medium uppercase">{dayStat.dayName.slice(0, 2)}</span>
                                            {/* <span className="text-[10px] text-slate-600">{dayStat.dayNum}</span> */}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer Stats */}
                        <div className="flex justify-between items-end pt-3 border-t border-slate-100">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-slate-700 leading-none">
                                    {stats.totalCompleted}<span className="text-slate-400 text-sm font-normal">/{stats.totalPossible}</span>
                                </span>
                            </div>
                            <span className={cn(
                                "font-bold text-sm",
                                stats.percentage >= 80 ? "text-emerald-500" :
                                    stats.percentage >= 50 ? "text-amber-500" : "text-slate-400"
                            )}>{stats.percentage}%</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default HabitWeeklyStats;
