import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
    Check,
    Activity,
    Copy,
    BarChart2,
    FileDown,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    isToday
} from 'date-fns';
import { useHabitStore } from '../../store/useHabitStore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { cn } from '../../lib/utils';

import HabitWeeklyStats from './HabitWeeklyStats';
import HabitStatsOverview from './HabitStatsOverview';
import HabitAnalysis from './HabitAnalysis';

const isFutureDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate > today;
};

export const generateWeeks = (monthIndex, year) => {
    const endObj = new Date(year, monthIndex + 1, 0);
    const weeks = [];
    let currentWeekNumber = 1;
    let currentDates = [];

    for (let day = 1; day <= endObj.getDate(); day++) {
        const dt = new Date(year, monthIndex, day);
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        currentDates.push(`${yyyy}-${mm}-${dd}`);

        // Split weeks into strict 7-day chunks starting from the 1st
        if (currentDates.length === 7 || day === endObj.getDate()) {
            weeks.push({
                weekNumber: currentWeekNumber,
                dates: currentDates
            });
            currentWeekNumber++;
            currentDates = [];
        }
    }
    return weeks;
};

export default function HabitTracker() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [newHabitTitle, setNewHabitTitle] = useState('');
    const [showAnalysis, setShowAnalysis] = useState(false);

    const { habits, completions, addHabit, removeHabit, toggleHabit } = useHabitStore();

    // Date calculations
    const daysInMonth = useMemo(() => {
        return eachDayOfInterval({
            start: startOfMonth(currentDate),
            end: endOfMonth(currentDate)
        });
    }, [currentDate]);

    // Calculate weeks for the header grouping using dynamic helper
    const weeksData = useMemo(() => {
        return generateWeeks(currentDate.getMonth(), currentDate.getFullYear());
    }, [currentDate]);

    const monthStart = startOfMonth(currentDate);
    const monthStr = format(monthStart, 'yyyy-MM');

    // Stats calculations
    const stats = useMemo(() => {
        const totalHabits = habits.length;
        if (totalHabits === 0) return { completed: 0, progress: 0 };

        let totalChecks = 0;
        // Count all checks for the displayed month
        habits.forEach(habit => {
            const habitCompletions = (completions && completions[habit.id]) || [];
            totalChecks += habitCompletions.filter(date => date.startsWith(monthStr)).length;
        });

        // Simple progress metric: (Total Checks / (Habits * Days in Month)) * 100
        const totalPossibleChecks = totalHabits * daysInMonth.length;
        const progress = Math.round((totalChecks / totalPossibleChecks) * 100) || 0;

        return {
            completed: totalChecks,
            progress
        };
    }, [habits, completions, monthStr, daysInMonth]);


    const handleAddHabit = (e) => {
        e.preventDefault();
        if (!newHabitTitle.trim()) return;
        addHabit(newHabitTitle);
        setNewHabitTitle('');
    };

    const handleToggle = (habitId, date) => {
        if (isFutureDate(date)) return;
        const dateStr = format(date, 'yyyy-MM-dd');
        toggleHabit(habitId, dateStr);
    };

    const isCompleted = (habitId, date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return (completions && completions[habitId] || []).includes(dateStr);
    };

    const handleExport = async () => {
        console.log("Starting export generation...");
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            // A4 Landscape dimensions: 297mm x 210mm
            const pageWidth = 297;
            const pageHeight = 210;
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);

            // --- Header Metadata ---
            const now = new Date();
            const exportDate = format(now, 'dd MMM yyyy HH:mm');
            const monthName = format(currentDate, 'MMMM yyyy');

            const firstDay = daysInMonth[0];
            const lastDay = daysInMonth[daysInMonth.length - 1];
            const dateRange = `${format(firstDay, 'ddMMMyy')}-${format(firstDay, 'EEE')} -> ${format(lastDay, 'ddMMMyy')}-${format(lastDay, 'EEE')}`;

            // Professional Header Styling
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.setTextColor(40, 40, 40);
            doc.text(`Habit Tracker Report`, margin, 20);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(14);
            doc.setTextColor(100);
            doc.text(monthName, margin, 28);

            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(`Exported: ${exportDate} | ${dateRange}`, margin, 34);

            // --- Table Data ---
            const tableHead = [
                ['Habit', ...daysInMonth.map(d => format(d, 'd'))]
            ];

            const tableBody = habits.map(habit => {
                const row = [habit.title];
                daysInMonth.forEach(day => {
                    const completed = isCompleted(habit.id, day);
                    row.push(completed ? 'X' : '');
                });
                return row;
            });

            console.log("Generating table...");

            autoTable(doc, {
                startY: 40,
                head: tableHead,
                body: tableBody,
                theme: 'grid',
                styles: {
                    font: 'helvetica',
                    fontSize: 8,
                    cellPadding: 1.5,
                    halign: 'center',
                    lineWidth: 0.1,
                    lineColor: [220, 220, 220]
                },
                headStyles: {
                    fillColor: [79, 70, 229],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                columnStyles: {
                    0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 }
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index > 0) {
                        if (data.cell.raw === 'X') {
                            data.cell.styles.fillColor = [16, 185, 129];
                            data.cell.styles.textColor = [255, 255, 255];
                            data.cell.text = '✓';
                        }
                    }
                },
                margin: { left: margin, right: margin }
            });

            // Start placing graphs after the table
            let cursorY = doc.lastAutoTable.finalY + 15;

            // --- Capture & Embed Visuals ---
            const sections = [
                { id: 'weekly-stats-export', title: 'Weekly Statistics' },
                { id: 'stats-overview-export', title: 'Monthly Overview' },
                { id: 'habit-analysis-export', title: 'Detailed Analysis' }
            ];

            for (const section of sections) {
                const sourceElement = document.getElementById(section.id);
                if (!sourceElement) continue;

                console.log(`Processing ${section.title}...`);

                // Create a container for the clone to ensure consistent rendering
                const cloneContainer = document.createElement('div');
                cloneContainer.style.position = 'absolute';
                cloneContainer.style.top = '-9999px';
                cloneContainer.style.left = '-9999px';
                // Force a fixed desktop width (e.g., 1200px) so flex/grid layouts expand fully
                cloneContainer.style.width = '1200px';
                cloneContainer.style.zIndex = '-9999';
                document.body.appendChild(cloneContainer);

                try {
                    // Clone the element
                    const clone = sourceElement.cloneNode(true);

                    // CRITICAL: Manually copy canvas content (charts)
                    // cloneNode() does not copy canvas state
                    const sourceCanvases = sourceElement.querySelectorAll('canvas');
                    const cloneCanvases = clone.querySelectorAll('canvas');

                    sourceCanvases.forEach((sourceCanvas, index) => {
                        if (cloneCanvases[index]) {
                            const destCanvas = cloneCanvases[index];
                            const ctx = destCanvas.getContext('2d');
                            destCanvas.width = sourceCanvas.width;
                            destCanvas.height = sourceCanvas.height;
                            ctx.drawImage(sourceCanvas, 0, 0);
                            destCanvas.style.width = sourceCanvas.style.width; // Maintain visual size
                            destCanvas.style.height = sourceCanvas.style.height;
                        }
                    });

                    // Ensure clone is fully visible (no scrollbars)
                    clone.style.overflow = 'visible';
                    clone.style.height = 'auto';
                    clone.style.maxHeight = 'none';

                    // Fix internal scrollables
                    const scrollables = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, .custom-scrollbar');
                    scrollables.forEach(el => {
                        el.style.overflow = 'visible';
                        el.style.height = 'auto';
                    });

                    cloneContainer.appendChild(clone);

                    // Allow a brief moment for styles/fonts to settle
                    await new Promise(resolve => setTimeout(resolve, 100));

                    const imgData = await toPng(clone, {
                        backgroundColor: '#ffffff',
                        pixelRatio: 2, // High DPI for crisp text
                        width: 1200 // Match container width
                    });

                    const imgProps = doc.getImageProperties(imgData);
                    const pdfHeight = (imgProps.height * contentWidth) / imgProps.width;
                    const headerHeight = 10;
                    const totalSectionHeight = pdfHeight + headerHeight;

                    // Check if content fits on current page
                    if (cursorY + totalSectionHeight > pageHeight - margin) {
                        doc.addPage();
                        cursorY = margin + 5; // Reset cursor for new page
                    }

                    // Section Title
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.setTextColor(60, 60, 60);
                    doc.text(section.title, margin, cursorY);

                    cursorY += 5; // Space below title

                    // Image
                    doc.addImage(imgData, 'PNG', margin, cursorY, contentWidth, pdfHeight);

                    // Update cursor for next section
                    cursorY += pdfHeight + 15;

                } catch (err) {
                    console.error(`Error capturing ${section.title}:`, err);
                } finally {
                    // Clean up DOM
                    if (cloneContainer.parentNode) {
                        try {
                            document.body.removeChild(cloneContainer);
                        } catch (e) {
                            console.warn("Failed to remove clone container", e);
                        }
                    }
                }
            }

            doc.save(`Habit_Tracker_${monthStr}_Report.pdf`);
            console.log("Full Export complete.");
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to generate PDF. Check console.");
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight min-w-[240px] text-center">
                        {format(currentDate, 'MMMM yyyy')}
                    </h1>
                    <button
                        onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Card (Light Theme) */}
            <div className="bg-white border border-slate-200 text-slate-800 p-6 md:p-8 rounded-2xl shadow-sm overflow-hidden relative">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    <div>
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Number of Habits</p>
                        <p className="text-3xl font-bold text-slate-800">{habits.length}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Completed (This Month)</p>
                        <p className="text-3xl font-bold text-emerald-500">{stats.completed}</p>
                    </div>
                    <div className="w-full">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Monthly Progress</p>
                            <span className="text-xl font-bold text-emerald-500">{stats.progress}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${stats.progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col lg:flex-row gap-4">
                <form onSubmit={handleAddHabit} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={newHabitTitle}
                            onChange={(e) => setNewHabitTitle(e.target.value)}
                            placeholder="Add a new habit..."
                            className="w-full pl-4 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all text-slate-700"
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm active:transform active:scale-95 flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Add
                    </button>
                </form>

                <div className="flex gap-2 text-sm">
                    <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors font-medium shadow-sm">
                        <Copy size={16} />
                        Copy Previous
                    </button>
                    <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors font-medium shadow-sm">
                        <BarChart2 size={16} />
                        Stats
                    </button>
                </div>
            </div>

            {/* Grid Section */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">

                {/* Scrollable Container */}
                <div className="overflow-x-auto custom-scrollbar">
                    <div className="min-w-max">
                        {/* Header Row */}
                        <div className="flex flex-col border-b border-slate-100 bg-white">
                            {/* WEEK HEADER ROW (Light Theme) */}
                            <div className="flex border-b border-slate-100">
                                {/* Sticky Placeholder */}
                                <div className="sticky left-0 z-30 w-64 min-w-[16rem] shrink-0 border-r border-slate-100 bg-slate-50 flex items-center p-4">
                                    <span className="font-bold text-sm text-slate-700">My Habits</span>
                                </div>
                                <div className="flex">
                                    {weeksData.map((weekData) => {
                                        // Bonus: Highlight the current week natively matching dates
                                        const nowStr = format(new Date(), 'yyyy-MM-dd');
                                        const isCurrentWeek = weekData.dates.includes(nowStr);

                                        return (
                                            <div
                                                key={`week-${weekData.weekNumber}`}
                                                className={cn(
                                                    "flex items-center justify-center text-[10px] font-bold border-r border-slate-100 uppercase tracking-widest transition-colors",
                                                    isCurrentWeek ? "bg-indigo-100 text-indigo-700 shadow-sm" : "bg-slate-50 text-slate-600"
                                                )}
                                                style={{ width: `${weekData.dates.length * 64}px` }}
                                            >
                                                Week {weekData.weekNumber}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* DATE HEADER ROW */}
                            <div className="flex border-b border-slate-100">
                                {/* Sticky Habit Name Column Placeholder */}
                                <div className="sticky left-0 z-20 w-64 min-w-[16rem] shrink-0 p-4 border-r border-slate-100 bg-white flex items-center text-sm text-transparent pointer-events-none">
                                    Habit Name
                                </div>

                                {/* Date Columns */}
                                <div className="flex">
                                    {daysInMonth.map(day => (
                                        <div
                                            key={day.toString()}
                                            className={cn(
                                                "w-16 p-3 flex flex-col items-center justify-center border-r border-slate-50 min-w-[4rem]",
                                                isToday(day) && "bg-indigo-50/30"
                                            )}
                                        >
                                            <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                                                {format(day, 'EEE')}
                                            </span>
                                            <span className={cn(
                                                "text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full transition-all",
                                                isToday(day) ? "bg-indigo-600 text-white shadow-md scale-110" : "text-slate-700"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Habit Rows */}
                        {habits.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No habits tracked yet. Add one above!</p>
                            </div>
                        ) : (
                            habits.map(habit => (
                                <div key={habit.id} className="flex border-b border-slate-50 hover:bg-slate-50/40 transition-colors group">
                                    {/* Sticky Name Cell */}
                                    <div className="sticky left-0 z-20 w-64 min-w-[16rem] shrink-0 p-4 border-r border-slate-100 bg-white group-hover:bg-slate-50 group-hover:-translate-y-0 transition-colors flex items-center justify-between gap-2">
                                        <span className="font-medium text-slate-700 truncate" title={habit.title}>
                                            {habit.title}
                                        </span>
                                        <button
                                            onClick={() => removeHabit(habit.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                            title="Delete Habit"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {/* Checkboxes */}
                                    <div className="flex">
                                        {daysInMonth.map(day => {
                                            const completed = isCompleted(habit.id, day);
                                            const isFuture = isFutureDate(day);

                                            return (
                                                <div
                                                    key={day.toString()}
                                                    className={cn(
                                                        "w-16 min-w-[4rem] border-r border-slate-50 flex items-center justify-center p-2",
                                                        isToday(day) && "bg-indigo-50/10"
                                                    )}
                                                >
                                                    <button
                                                        onClick={() => handleToggle(habit.id, day)}
                                                        disabled={isFuture}
                                                        title={isFuture ? "Cannot mark future dates" : ""}
                                                        className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 border-2",
                                                            completed
                                                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm scale-110"
                                                                : isFuture
                                                                    ? "bg-slate-50/50 border-slate-100 text-transparent cursor-not-allowed opacity-50"
                                                                    : "bg-transparent border-slate-200 text-transparent hover:border-slate-300 scale-90 hover:scale-100"
                                                        )}
                                                    >
                                                        <Check size={20} strokeWidth={3} className={cn("transition-transform", completed ? "scale-100" : "scale-0")} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Daily Stats Row (Footer) - Light Theme */}
                        {habits.length > 0 && (
                            <div className="flex border-t border-slate-200 bg-slate-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                                {/* Sticky Label */}
                                <div className="sticky left-0 z-20 w-64 min-w-[16rem] shrink-0 p-4 border-r border-slate-200 bg-slate-50 flex flex-col justify-center">
                                    <span className="font-bold text-sm text-slate-700">Daily Progress</span>
                                    <span className="text-xs text-slate-400">Completion Rate</span>
                                </div>

                                {/* Stats Columns */}
                                <div className="flex">
                                    {daysInMonth.map(day => {
                                        const total = habits.length;
                                        let done = 0;
                                        habits.forEach(h => {
                                            if (isCompleted(h.id, day)) done++;
                                        });
                                        const notDone = total - done;
                                        const percentage = total === 0 ? 0 : Math.round((done / total) * 100);

                                        return (
                                            <div
                                                key={day.toString()}
                                                className="w-16 min-w-[4rem] p-2 border-r border-slate-200 flex flex-col items-center justify-center gap-1"
                                            >
                                                <span className={cn(
                                                    "text-sm font-bold",
                                                    percentage === 100 ? "text-emerald-500" : "text-slate-700"
                                                )}>
                                                    {percentage}%
                                                </span>
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap leading-none">
                                                        Done: {done}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap leading-none">
                                                        Not: {notDone}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Weekly Stats Section */}
            <div id="weekly-stats-export">
                <HabitWeeklyStats habits={habits} completions={completions} currentDate={currentDate} />
            </div>

            {/* Monthly Overview & Top Habits */}
            <div id="stats-overview-export">
                <HabitStatsOverview habits={habits} completions={completions} currentDate={currentDate} />
            </div>

            {/* Analysis & Graphs (Conditionally displayed but always in DOM for export) */}

            <div className="flex justify-center py-4">
                <button
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className="group flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 rounded-full transition-all shadow-sm hover:shadow-md font-medium text-sm"
                >
                    {showAnalysis ? (
                        <>
                            Hide Detailed Analysis
                            <ChevronUp size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                        </>
                    ) : (
                        <>
                            Detailed Habit Progress
                            <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
                        </>
                    )}
                </button>
            </div>

            <div
                className={cn(
                    "transition-all duration-500 ease-in-out origin-top",
                    showAnalysis
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-4 pointer-events-none absolute left-0 w-full -z-50"
                )}
                style={!showAnalysis ? { top: -9999 } : {}}
            >
                <div id="habit-analysis-export">
                    <HabitAnalysis habits={habits} completions={completions} currentDate={currentDate} />
                </div>
            </div>

            {/* Export Button Section */}
            <div className="flex justify-end pt-8 pb-12 border-t border-slate-200">
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white hover:bg-slate-900 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                    <FileDown size={20} />
                    Export Habit Data
                </button>
            </div>
        </div>
    );
}
