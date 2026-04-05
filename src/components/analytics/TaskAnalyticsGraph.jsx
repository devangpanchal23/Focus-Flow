import React, { useMemo, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function TaskAnalyticsGraph({ stats = [], isLoading = false }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const data = useMemo(() => {
        // Generate all days for the current displayed month
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const daysInMonth = eachDayOfInterval({ start, end });

        return daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            // Find stats for this specific day from the massive 365-day history
            const stat = stats.find(s => s.date === dateStr);

            return {
                date: dateStr,
                displayDate: format(day, 'd'), // Show '1', '2', '3'... on X Axis to save space
                fullDate: format(day, 'MMM do'),
                tasksCreated: stat ? stat.tasksCreated : 0,
                tasksCompleted: stat ? stat.tasksCompleted : 0,
            };
        });
    }, [stats, currentMonth]);

    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

    if (isLoading) {
        return <div className="h-64 flex items-center justify-center text-slate-400">Loading chart...</div>;
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Productivity Trends</h3>
                    <p className="text-sm text-slate-500">
                        Tasks Created vs Completed ({format(currentMonth, 'MMMM yyyy')})
                    </p>
                </div>
            </div>

            <div className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="displayDate"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            dy={10}
                            interval={window.innerWidth < 768 ? 2 : 0} // Skip ticks on mobile
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            allowDecimals={false}
                        />
                        <Tooltip
                            labelFormatter={(label) => {
                                // label is '1', '2', etc. find full date
                                const item = data.find(d => d.displayDate === label);
                                return item ? item.fullDate : label;
                            }}
                            contentStyle={{
                                backgroundColor: '#fff',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line
                            type="monotone"
                            dataKey="tasksCreated"
                            name="Created"
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={{ r: 3, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6 }}
                            animatioDuration={500}
                        />
                        <Line
                            type="monotone"
                            dataKey="tasksCompleted"
                            name="Completed"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6 }}
                            animationDuration={500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Navigation Arrows */}
            <div className="flex justify-center items-center gap-4 mt-4 pt-4 border-t border-slate-50">
                <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                    title="Previous Month"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium text-slate-600 w-32 text-center select-none">
                    {format(currentMonth, 'MMMM yyyy')}
                </span>
                <button
                    onClick={handleNextMonth}
                    disabled={isSameMonth(currentMonth, new Date()) || currentMonth > new Date()} // Optional: Disable future
                    className={`p-2 rounded-full transition-colors ${isSameMonth(currentMonth, new Date()) || currentMonth > new Date()
                            ? 'text-slate-200 cursor-not-allowed'
                            : 'hover:bg-slate-100 text-slate-500'
                        }`}
                    title="Next Month"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
}
