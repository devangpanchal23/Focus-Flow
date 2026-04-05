import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { format, subDays } from 'date-fns';

export default function Heatmap({ stats = [] }) {
    // Generate data for the last 30 days using real stats
    const days = useMemo(() => {
        return Array.from({ length: 30 }, (_, i) => {
            const d = subDays(new Date(), 29 - i); // 29 days ago to today
            const dateStr = format(d, 'yyyy-MM-dd');
            const dayStat = stats.find(s => s.date === dateStr);
            const hours = dayStat ? (dayStat.totalFocusTime || 0) / 3600 : 0;

            const intensity = hours === 0 ? 0 :
                hours < 2 ? 1 :
                    hours < 4 ? 2 :
                        hours < 6 ? 3 : 4;

            return {
                id: i,
                date: d,
                intensity,
                hours: hours.toFixed(1)
            };
        });
    }, [stats]);

    const getColor = (intensity) => {
        switch (intensity) {
            case 0: return 'bg-slate-100';
            case 1: return 'bg-indigo-200';
            case 2: return 'bg-indigo-300';
            case 3: return 'bg-indigo-500';
            case 4: return 'bg-indigo-700';
            default: return 'bg-slate-100';
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Focus Intensity</h3>
                <div className="flex gap-1 text-xs text-slate-400 items-center">
                    <span>Less</span>
                    <div className="w-2 h-2 rounded-sm bg-slate-100"></div>
                    <div className="w-2 h-2 rounded-sm bg-indigo-300"></div>
                    <div className="w-2 h-2 rounded-sm bg-indigo-700"></div>
                    <span>More</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {days.map((day) => (
                    <div
                        key={day.id}
                        className={cn(
                            "w-8 h-8 rounded-md transition-all hover:scale-110 cursor-pointer relative group",
                            getColor(day.intensity)
                        )}
                    >
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 shadow-lg capitalize">
                            <span className="font-semibold mr-1">{format(day.date, 'MMM dd')}:</span>
                            {day.hours > 0 ? `${day.hours} hrs` : 'No focus'}
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-xs text-slate-400 mt-4">Showing last 30 days activity</p>
        </div>
    );
}
