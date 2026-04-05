import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Calendar({ selectedDate, onSelect, className }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const onNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const onPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={onPrevMonth} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft size={20} className="text-slate-600" />
                </button>
                <span className="text-sm font-semibold text-slate-800">
                    {format(currentMonth, 'MMMM yyyy')}
                </span>
                <button onClick={onNextMonth} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronRight size={20} className="text-slate-600" />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        const startDate = startOfWeek(currentMonth);
        const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="text-xs font-medium text-slate-400 text-center py-2">
                    {weekDays[i]}
                </div>
            );
        }
        return <div className="grid grid-cols-7 mb-2">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = '';

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, 'd');
                const cloneDay = day;

                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isCurrentDay = isToday(day);

                days.push(
                    <div
                        key={day}
                        className={cn(
                            "aspect-square p-1 flex justify-center items-center cursor-pointer relative",
                            !isCurrentMonth ? "text-slate-300" : "text-slate-700"
                        )}
                        onClick={() => onSelect(cloneDay)}
                    >
                        <div
                            className={cn(
                                "w-8 h-8 flex items-center justify-center rounded-full text-sm transition-all",
                                isSelected
                                    ? "bg-indigo-600 text-white shadow-md scale-105"
                                    : "hover:bg-slate-100",
                                isCurrentDay && !isSelected && "border border-indigo-600 text-indigo-600 font-semibold"
                            )}
                        >
                            {formattedDate}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div>{rows}</div>;
    };

    return (
        <div className={cn("bg-white p-4 rounded-xl shadow-xl border border-slate-200 w-80", className)}>
            {renderHeader()}
            {renderDays()}
            {renderCells()}

            {!isToday(selectedDate) && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center">
                    <button
                        onClick={() => onSelect(new Date())}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                        Jump to Today
                    </button>
                </div>
            )}
        </div>
    );
}
