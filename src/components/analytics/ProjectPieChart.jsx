import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function ProjectPieChart() {
    const data = [
        { name: 'Development', value: 45, color: '#6366f1' }, // indigo
        { name: 'Design', value: 25, color: '#ec4899' },    // pink
        { name: 'Meetings', value: 15, color: '#f59e0b' },  // amber
        { name: 'Research', value: 15, color: '#10b981' },  // emerald
    ];

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Project Distribution</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
