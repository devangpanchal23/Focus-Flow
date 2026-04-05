import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export default function TaskCompletionChart({ stats = [] }) {

    // Process data to map stats to the current week (Mon-Sun)
    const data = useMemo(() => {
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
        return eachDayOfInterval({ start, end }).map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayStat = stats.find(s => s.date === dateStr);

            return {
                name: format(day, 'EEE'), // Mon, Tue...
                completed: dayStat?.tasksCompleted || 0,
                created: dayStat?.tasksCreated || 0,
                goal: 8, // Static goal for now
            };
        });
    }, [stats]);

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Task Completion vs Goal (Current Week)</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="created" name="Created" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Bar dataKey="goal" name="Daily Goal" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
