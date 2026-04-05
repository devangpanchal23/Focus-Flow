import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

export default function WeeklyProductivityChart({ stats = [] }) {

    // Generate data for the Current Week (Mon - Sun)
    const data = useMemo(() => {
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

        const weekDays = eachDayOfInterval({ start, end });

        return weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            // Find the stat for this specific day
            // We look for an exact match in the 'stats' array which uses YYYY-MM-DD keys
            const dayStat = stats.find(s => s.date === dateStr);

            return {
                name: format(day, 'EEE'), // Mon, Tue, Wed
                fullDate: format(day, 'MMM do'),
                created: dayStat ? dayStat.tasksCreated : 0,
                completed: dayStat ? dayStat.tasksCompleted : 0,
            };
        });
    }, [stats]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 min-w-[150px]">
                    <p className="text-sm font-semibold text-slate-800 mb-2">{payload[0].payload.fullDate}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">Created</span>
                            <span className="text-sm font-bold text-indigo-600">{payload[0].value}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">Completed</span>
                            <span className="text-sm font-bold text-emerald-500">{payload[1].value}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex flex-col mb-6">
                <h3 className="text-lg font-bold text-slate-800">Weekly Activity</h3>
                <p className="text-sm text-slate-500">Task Creation vs Completion</p>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        barGap={8} // Space between the two bars of the same day
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value) => <span className="text-sm text-slate-600 font-medium ml-1">{value}</span>}
                        />

                        {/* Bar 1: Created */}
                        <Bar
                            dataKey="created"
                            name="Tasks Created"
                            fill="#6366f1" // Indigo
                            radius={[6, 6, 6, 6]}
                            maxBarSize={12}
                        />

                        {/* Bar 2: Completed */}
                        <Bar
                            dataKey="completed"
                            name="Tasks Completed"
                            fill="#10b981" // Emerald
                            radius={[6, 6, 6, 6]}
                            maxBarSize={12}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
