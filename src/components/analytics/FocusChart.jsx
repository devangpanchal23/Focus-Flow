import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export default function FocusChart({ stats = [] }) {

    // Generate data for current week from statistics
    const data = useMemo(() => {
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
        const end = endOfWeek(today, { weekStartsOn: 1 });

        return eachDayOfInterval({ start, end }).map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayStat = stats.find(s => s.date === dateStr);
            // Convert seconds to hours
            const hours = dayStat ? (dayStat.totalFocusTime || 0) / 3600 : 0;

            return {
                name: format(day, 'EEE'), // Mon, Tue...
                hours: parseFloat(hours.toFixed(1))
            };
        });
    }, [stats]);

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Daily Focus Hours (Current Week)</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="hours" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={50} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
