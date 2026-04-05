import React, { useState } from 'react';
import TaskList from './TaskList';
import PriorityBoard from './PriorityBoard';
import EisenhowerMatrix from './EisenhowerMatrix';
import { useTaskStore } from '../../store/useTaskStore';
import { LayoutGrid, List, Columns, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import Calendar from '../ui/Calendar';
import { format, isToday } from 'date-fns';

export default function Tasks() {
    const { tasks, selectedDate, setSelectedDate, fetchTasks } = useTaskStore();
    const [filter, setFilter] = useState('all'); // all, today, upcoming
    const [view, setView] = useState('list'); // list, matrix
    const [showCalendar, setShowCalendar] = useState(false);

    const handleDateSelect = async (date) => {
        setSelectedDate(date);
        await fetchTasks();
        setShowCalendar(false);
    };

    const handleResetToday = async () => {
        const today = new Date();
        setSelectedDate(today);
        await fetchTasks();
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'completed') return task.completed;
        if (filter === 'today') return !task.completed; // Simplified logic
        return true;
    });

    return (
        <div className="p-6 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Tasks</h1>
                    <p className="text-slate-500 mt-1">
                        {isToday(selectedDate) ? 'Today\'s Priorities' : `Tasks for ${format(selectedDate, 'MMM do, yyyy')}`}
                    </p>
                </div>

                <div className="flex gap-2 items-center">
                    <div className="relative z-50">
                        <button
                            onClick={() => setShowCalendar(!showCalendar)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition-all",
                                showCalendar
                                    ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            <CalendarIcon size={20} />
                            <span className="hidden sm:inline font-medium">
                                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM d')}
                            </span>
                        </button>

                        {showCalendar && (
                            <div className="absolute right-0 top-12 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <Calendar
                                    selectedDate={selectedDate || new Date()}
                                    onSelect={handleDateSelect}
                                />
                            </div>
                        )}

                        {showCalendar && (
                            <div
                                className="fixed inset-0 z-40 bg-transparent"
                                onClick={() => setShowCalendar(false)}
                            />
                        )}
                    </div>

                    {!isToday(selectedDate) && (
                        <button
                            onClick={handleResetToday}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm"
                        >
                            Back to Today
                        </button>
                    )}

                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        {[
                            { id: 'list', icon: List },
                            { id: 'matrix', icon: LayoutGrid },
                            { id: 'priority', icon: Columns },
                        ].map((v) => (
                            <button
                                key={v.id}
                                onClick={() => setView(v.id)}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    view === v.id ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <v.icon size={20} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {['all', 'today', 'upcoming', 'completed'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border",
                            filter === f
                                ? "bg-slate-800 text-white border-slate-800"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {view === 'list' && <TaskList tasks={filteredTasks} />}

            {view === 'priority' && <PriorityBoard />}

            {view === 'matrix' && <EisenhowerMatrix />}
        </div>
    );
}
