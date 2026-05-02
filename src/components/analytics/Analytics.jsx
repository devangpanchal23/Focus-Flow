import React, { useEffect, useState, useMemo } from 'react';
import FocusChart from './FocusChart';
import ProjectPieChart from './ProjectPieChart';
import TaskCompletionChart from './TaskCompletionChart';
import Heatmap from './Heatmap';
import TaskAnalyticsGraph from './TaskAnalyticsGraph';
import WeeklyProductivityChart from './WeeklyProductivityChart';
import { TrendingUp, Award } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { format, subDays, parseISO, isSameDay, startOfDay } from 'date-fns';

export default function Analytics() {
    const [stats, setStats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { tasks, authToken } = useTaskStore(); // We still trigger re-fetch on task changes

    useEffect(() => {
        const fetchData = async () => {
            if (!authToken) return;

            try {
                // Fetch both stats (for focus time) and all tasks (for accurate counts)
                const headers = { 'Authorization': `Bearer ${authToken}` };
                const [statsRes, tasksRes] = await Promise.all([
                    fetch('/api/stats/history', { headers }),
                    fetch('/api/tasks', { headers }) // Fetching all tasks to ensure accurate historical completion/creation counts
                ]);

                if (statsRes.ok && tasksRes.ok) {
                    const serverStats = await statsRes.json();
                    const allTasks = await tasksRes.json();

                    // 1. Generate normalized daily buckets for the last 30+ days
                    const today = startOfDay(new Date()); // Normalize to midnight local time
                    const dailyBuckets = [];

                    for (let i = 0; i < 365; i++) {
                        // Go backwards from today
                        dailyBuckets.push({
                            dateObj: subDays(today, i),
                            dateStr: format(subDays(today, i), 'yyyy-MM-dd'),
                            tasksCreated: 0,
                            tasksCompleted: 0,
                            totalFocusTime: 0
                        });
                    }

                    // 2. Populate Focus Time (using string match as API uses YYYY-MM-DD)
                    serverStats.forEach(stat => {
                        const bucket = dailyBuckets.find(b => b.dateStr === stat.date);
                        if (bucket) {
                            bucket.totalFocusTime = stat.totalFocusTime || 0;
                        }
                    });

                    // 3. Aggregate Task Counts using IS_SAME_DAY for exact local-time precision
                    // This creates 1:1 parity with the Task List view
                    allTasks.forEach(task => {
                        if (!task.scheduledDate) return;
                        const taskScheduledDate =
                            typeof task.scheduledDate === 'string'
                                ? parseISO(task.scheduledDate)
                                : new Date(task.scheduledDate);

                        const creationBucket = dailyBuckets.find(b =>
                            isSameDay(b.dateObj, taskScheduledDate));
                        if (creationBucket) {
                            creationBucket.tasksCreated += 1;
                        }

                        if (task.completed) {
                            const completionBucket = dailyBuckets.find(b =>
                                isSameDay(b.dateObj, taskScheduledDate));
                            if (completionBucket) {
                                completionBucket.tasksCompleted += 1;
                            }
                        }
                    });

                    // Sort chronologically for the charts
                    const mergedStats = dailyBuckets.reverse().map(b => ({
                        date: b.dateStr,
                        tasksCreated: b.tasksCreated,
                        tasksCompleted: b.tasksCompleted,
                        totalFocusTime: b.totalFocusTime
                    }));

                    setStats(mergedStats);
                }
            } catch (error) {
                console.error('Failed to fetch analytics data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [tasks]); // Re-compute whenever tasks change in the store

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Analytics</h1>
                    <p className="text-slate-500 mt-1">Track your productivity trends</p>
                </div>
                <div className="hidden md:flex gap-4">
                    {/* Summary Pills - simplified */}
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                        <TrendingUp size={16} className="text-emerald-500" />
                        <span className="text-sm font-medium text-slate-600">+12% vs last week</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FocusChart stats={stats} />
                <TaskCompletionChart stats={stats} />
            </div>

            {/* NEW Weekly Productivity Chart */}
            <div className="w-full">
                <WeeklyProductivityChart stats={stats} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProjectPieChart />
                <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>

                    <div>
                        <Award className="w-8 h-8 mb-4 text-amber-300" />
                        <h3 className="text-2xl font-bold mb-1">5 Day Streak!</h3>
                        <p className="text-indigo-100 text-sm opacity-90">You're on fire! Keep it up to earn the "Deep Worker" badge.</p>
                    </div>

                    <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center text-sm">
                        <span>Current Level</span>
                        <span className="font-bold text-amber-300">Level 5</span>
                    </div>
                </div>
            </div>

            <div className="md:col-span-2">
                <TaskAnalyticsGraph stats={stats} isLoading={isLoading} />
            </div>

            <div className="md:col-span-2">
                <Heatmap stats={stats} />
            </div>

        </div>
    );
}
