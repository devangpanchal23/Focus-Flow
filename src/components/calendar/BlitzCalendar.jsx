import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Clock, Check, Trash2 } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';

export default function Calendar() {
    const { tasks, addTask, updateTask, deleteTask } = useTaskStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month'); // 'month' or 'day'
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        scheduledDate: '',
        scheduledTime: '',
        priority: 'medium'
    });

    // Generate time slots for day view (30-minute intervals) 12:00 AM to 12:00 AM (next day)
    const generateTimeSlots = () => {
        const slots = [];
        // 0 to 23 hours. 
        // 00:00 - 00:30 ... 23:30 - 00:00 (next day)
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const startHour = hour;
                const startMinute = minute;
                const endMinute = minute + 30;
                const endHour = endMinute >= 60 ? hour + 1 : hour;
                const adjustedEndMinute = endMinute >= 60 ? 0 : endMinute;

                const formatTime = (h, m) => {
                    // Logic for 24h wrapping? 
                    // If h is 24, typically formatted as 12 AM (next day) or 00:00.
                    // Let's use 12-hour format with AM/PM
                    if (h === 24) return '12:00 AM'; // Next day start
                    const period = h >= 12 ? 'PM' : 'AM';
                    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
                };

                // Fix formatTime logic for start/end
                const startStr = formatTime(startHour, startMinute);
                // For end time: if slot is 23:30, endHour will be 24, endMinute 0.
                const endStr = formatTime(endHour, adjustedEndMinute);

                slots.push({
                    start: startStr,
                    end: endStr,
                    hour: startHour,
                    minute: startMinute,
                    key: `${startHour}-${startMinute}`
                });
            }
        }
        return slots;
    };

    const timeSlots = generateTimeSlots();

    // Get days in month
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDay - i,
                isCurrentMonth: false,
                date: new Date(year, month - 1, prevMonthLastDay - i)
            });
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            days.push({
                day,
                isCurrentMonth: true,
                date: new Date(year, month, day)
            });
        }

        // Next month days
        const remainingDays = 42 - days.length; // 6 rows * 7 days
        for (let day = 1; day <= remainingDays; day++) {
            days.push({
                day,
                isCurrentMonth: false,
                date: new Date(year, month + 1, day)
            });
        }

        return days;
    };

    // Navigate months
    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const previousYear = () => {
        setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth()));
    };

    const nextYear = () => {
        setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth()));
    };

    // Get tasks for a specific date
    const getTasksForDate = (date) => {
        return tasks.filter(task => {
            if (!task.scheduledDate) return false;
            // Compare local date strings to avoid timezone offset issues if possible
            // Using toDateString() is generally safe for dates created in same timezone
            const taskDate = new Date(task.scheduledDate);
            return taskDate.toDateString() === date.toDateString();
        });
    };

    // Get tasks for a specific time slot
    const getTasksForTimeSlot = (date, hour, minute) => {
        return tasks.filter(task => {
            // Task must be on this date
            if (!task.scheduledDate || !task.scheduledTime) return false;
            const taskDate = new Date(task.scheduledDate);
            if (taskDate.toDateString() !== date.toDateString()) return false;

            // Task must match the time slot start
            const [taskHour, taskMinute] = task.scheduledTime.split(':').map(Number);
            return taskHour === hour && taskMinute === minute;
        });
    };

    // Handle creating task from calendar
    const handleCreateTask = async (e) => {
        e.preventDefault();

        const taskData = {
            title: newTask.title,
            description: newTask.description,
            priority: newTask.priority,
            scheduledDate: newTask.scheduledDate,
            scheduledTime: newTask.scheduledTime,
            completed: false,
            createdAt: new Date() // Add creation time for sorting if needed
        };

        try {
            await addTask(taskData);
            setShowCreateModal(false);
            setNewTask({
                title: '',
                description: '',
                scheduledDate: '',
                scheduledTime: '',
                priority: 'medium'
            });
            setSelectedTimeSlot(null);
        } catch (error) {
            console.error('Error creating task:', error);
        }
    };

    // Open create modal with pre-filled date/time
    const openCreateModal = (date, timeSlot = null) => {
        // Adjust date to local ISO string (YYYY-MM-DD)
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        const dateStr = localDate.toISOString().split('T')[0];

        setNewTask({
            ...newTask,
            scheduledDate: dateStr,
            scheduledTime: timeSlot ? `${timeSlot.hour.toString().padStart(2, '0')}:${timeSlot.minute.toString().padStart(2, '0')}` : ''
        });
        setSelectedTimeSlot(timeSlot);
        setShowCreateModal(true);
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const days = getDaysInMonth(currentDate);
    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelectedDate = (date) => {
        return date.toDateString() === selectedDate.toDateString();
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <span className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl text-white">
                            <CalendarIcon size={32} />
                        </span>
                        Calendar
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 ml-16">
                        Schedule and manage your tasks with time precision
                    </p>
                </div>

                {/* View Toggle */}
                <div className="flex gap-2 ml-16 md:ml-0">
                    <button
                        onClick={() => setView('month')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${view === 'month'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                    >
                        Month View
                    </button>
                    <button
                        onClick={() => setView('day')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${view === 'day'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                    >
                        Day View
                    </button>
                </div>
            </div>

            {/* Calendar Container */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Navigation */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 md:p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {view === 'month' && (
                                <>
                                    <button
                                        onClick={previousMonth}
                                        className="p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                                        title="Previous Month"
                                    >
                                        <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
                                    </button>
                                </>
                            )}
                            {view === 'day' && (
                                <button
                                    onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
                                    className="p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                                    title="Previous Day"
                                >
                                    <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
                                </button>
                            )}
                        </div>

                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
                            {view === 'month'
                                ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                                : `${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
                            }
                        </h2>

                        <div className="flex items-center gap-2">
                            {view === 'month' && (
                                <>
                                    <button
                                        onClick={nextMonth}
                                        className="p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                                        title="Next Month"
                                    >
                                        <ChevronRight size={20} className="text-slate-600 dark:text-slate-400" />
                                    </button>
                                </>
                            )}
                            {view === 'day' && (
                                <button
                                    onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
                                    className="p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                                    title="Next Day"
                                >
                                    <ChevronRight size={20} className="text-slate-600 dark:text-slate-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Today Button */}
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={() => {
                                const today = new Date();
                                setCurrentDate(today);
                                setSelectedDate(today);
                            }}
                            className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:shadow-md transition-all text-sm"
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* Month View */}
                {view === 'month' && (
                    <div className="p-4 md:p-6">
                        {/* Day Names */}
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {dayNames.map(day => (
                                <div key={day} className="text-center font-bold text-xs md:text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {days.map((dayObj, index) => {
                                const dayTasks = getTasksForDate(dayObj.date);
                                const isTodayDate = isToday(dayObj.date);
                                const isSelected = isSelectedDate(dayObj.date);

                                return (
                                    <div
                                        key={index}
                                        onClick={() => {
                                            setSelectedDate(dayObj.date);
                                            setView('day');
                                        }}
                                        className={`min-h-[80px] md:min-h-[120px] p-2 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${!dayObj.isCurrentMonth
                                            ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-50'
                                            : isTodayDate
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-md'
                                                : isSelected
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-sm md:text-base font-bold ${isTodayDate
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-slate-700 dark:text-slate-300'
                                                }`}>
                                                {dayObj.day}
                                            </span>
                                            {dayTasks.length > 0 && (
                                                <span className="text-xs bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                                    {dayTasks.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Task indicators */}
                                        <div className="space-y-1 overflow-hidden">
                                            {dayTasks.slice(0, 3).map((task, i) => (
                                                <div
                                                    key={task._id}
                                                    className={`text-xs p-1 rounded truncate ${task.completed
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 line-through'
                                                        : task.priority === 'high'
                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                            : task.priority === 'medium'
                                                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                        }`}
                                                >
                                                    {task.title}
                                                </div>
                                            ))}
                                            {dayTasks.length > 3 && (
                                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    +{dayTasks.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Day View with 30-minute time slots */}
                {view === 'day' && (
                    <div className="p-4 md:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                                {dayNames[selectedDate.getDay()]}, {monthNames[selectedDate.getMonth()]} {selectedDate.getDate()}
                            </h3>
                            <button
                                onClick={() => openCreateModal(selectedDate)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-md transition-all active:scale-95"
                            >
                                <Plus size={18} />
                                Add Task
                            </button>
                        </div>

                        {/* Time Slots */}
                        <div className="space-y-0 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto">
                            {timeSlots.map((slot, index) => {
                                const slotTasks = getTasksForTimeSlot(selectedDate, slot.hour, slot.minute);
                                const isCurrentTime = (() => {
                                    const now = new Date();
                                    if (now.toDateString() !== selectedDate.toDateString()) return false;
                                    const currentHour = now.getHours();
                                    const currentMinute = now.getMinutes();
                                    return currentHour === slot.hour && currentMinute >= slot.minute && currentMinute < slot.minute + 30;
                                })();

                                return (
                                    <div
                                        key={slot.key}
                                        className={`flex border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isCurrentTime ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                            }`}
                                    >
                                        {/* Time Label */}
                                        <div className="w-32 md:w-40 p-3 border-r border-slate-200 dark:border-slate-700 flex-shrink-0">
                                            <div className={`text-xs md:text-sm font-medium ${isCurrentTime
                                                ? 'text-blue-600 dark:text-blue-400 font-bold'
                                                : 'text-slate-500 dark:text-slate-400'
                                                }`}>
                                                {slot.start}
                                            </div>
                                            <div className="text-xs text-slate-400 dark:text-slate-500">
                                                {slot.end}
                                            </div>
                                        </div>

                                        {/* Task Area */}
                                        <div className="flex-1 p-2 min-h-[60px]">
                                            {slotTasks.length > 0 ? (
                                                <div className="space-y-2">
                                                    {slotTasks.map(task => (
                                                        <div
                                                            key={task._id}
                                                            className={`p-3 rounded-lg border-l-4 ${task.completed
                                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                                                                : task.priority === 'high'
                                                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                                                                    : task.priority === 'medium'
                                                                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                                                                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                                                                }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start gap-2">
                                                                        <h4 className={`font-semibold text-sm md:text-base truncate ${task.completed
                                                                            ? 'line-through text-slate-500 dark:text-slate-400'
                                                                            : 'text-slate-800 dark:text-slate-200'
                                                                            }`}>
                                                                            {task.title}
                                                                        </h4>
                                                                        {task.scheduledTime && (
                                                                            <span className="text-xs font-mono bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                                                {(() => {
                                                                                    // Convert HH:mm to 12h format
                                                                                    const [h, m] = task.scheduledTime.split(':');
                                                                                    const hours = parseInt(h);
                                                                                    const suffix = hours >= 12 ? 'PM' : 'AM';
                                                                                    const displayH = hours % 12 || 12;
                                                                                    return `${displayH}:${m} ${suffix}`;
                                                                                })()}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {task.description && (
                                                                        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                                                                            {task.description}
                                                                        </p>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${task.priority === 'high'
                                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                                            : task.priority === 'medium'
                                                                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                                            }`}>
                                                                            {task.priority}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => updateTask(task._id, { completed: !task.completed })}
                                                                        className={`p-1.5 rounded-lg transition-colors ${task.completed
                                                                            ? 'bg-green-500 text-white'
                                                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-green-500 hover:text-white'
                                                                            }`}
                                                                        title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                                                                    >
                                                                        <Check size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteTask(task._id)}
                                                                        className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                                                                        title="Delete task"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => openCreateModal(selectedDate, slot)}
                                                    className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group"
                                                >
                                                    <Plus size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Task Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Clock size={24} className="text-blue-500" />
                                Schedule Task
                            </h3>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setSelectedTimeSlot(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Task Title *
                                </label>
                                <input
                                    type="text"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Enter task title"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                                    placeholder="Add details..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={newTask.scheduledDate}
                                        onChange={(e) => setNewTask({ ...newTask, scheduledDate: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Time
                                    </label>
                                    <input
                                        type="time"
                                        value={newTask.scheduledTime}
                                        onChange={(e) => setNewTask({ ...newTask, scheduledTime: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Priority
                                </label>
                                <select
                                    value={newTask.priority}
                                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setSelectedTimeSlot(null);
                                    }}
                                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-lg shadow-blue-500/30"
                                >
                                    Create Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
