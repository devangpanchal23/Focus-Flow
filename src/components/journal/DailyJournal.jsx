import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Underline, ChevronLeft, ChevronRight, BookOpen, Plus, Calendar as CalendarIcon, Save } from 'lucide-react';
import { useJournalStore } from '../../store/useJournalStore';
import { useSettingsStore } from '../../store/useSettingsStore';

// Simple toast notification component (internal for now)
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium animate-in slide-in-from-bottom-2 z-50 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'
            }`}>
            {message}
        </div>
    );
};

export default function DailyJournal() {
    // Helper to get local date string YYYY-MM-DD
    const getLocalDateString = (date = new Date()) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    };

    const { entries, isLoading: isStoreLoading, saveEntry: saveStoreEntry, fetchEntryContent } = useJournalStore();
    const theme = useSettingsStore((state) => state.theme);

    const [selectedDate, setSelectedDate] = useState(getLocalDateString());
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [toast, setToast] = useState(null);
    const editorRef = useRef(null);
    const lastSavedContent = useRef('');

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    // Keep entries in sync via store, no local fetch needed for history hook
    // Store already fetches history on mount via App.jsx

    // Fetch specific entry when selectedDate changes
    useEffect(() => {
        const loadEntry = async () => {
            setIsLoading(true);
            const fetchedContent = await fetchEntryContent(selectedDate);

            setContent(fetchedContent);
            lastSavedContent.current = fetchedContent;
            if (editorRef.current) {
                editorRef.current.innerHTML = fetchedContent;
            }
            setIsLoading(false);
        };
        loadEntry();
    }, [selectedDate, fetchEntryContent]);

    // Save Handler with Store
    const saveEntry = async (newContent) => {
        if (newContent === lastSavedContent.current) return;

        setIsSaving(true);
        try {
            await saveStoreEntry(selectedDate, newContent);
            lastSavedContent.current = newContent;
            // Success handled by caller or silent for auto-save
        } catch (error) {
            console.error("Save failed:", error);
            showToast(error.message || 'Failed to save', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Manual Save Handler
    const handleManualSave = async () => {
        setIsSaving(true);
        try {
            await saveStoreEntry(selectedDate, content);
            lastSavedContent.current = content;
            showToast('Journal saved successfully');
        } catch (error) {
            console.error("Manual save failed:", error);
            showToast(error.message || 'Failed to save', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Debounce save (Auto-save)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (content && content !== lastSavedContent.current) {
                saveEntry(content);
            }
        }, 2000); // 2 seconds debounce

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    const handleInput = (e) => {
        setContent(e.target.innerHTML);
    };

    const execCmd = (cmd) => {
        document.execCommand(cmd, false, null);
        editorRef.current?.focus();
    };

    // Display helpers
    const formatDateDisplay = (dateStr) => {
        if (!dateStr) return { dayName: '', dayNum: '', monthYear: '' };
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return {
            dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
            dayNum: date.getDate(),
            monthYear: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        };
    };

    const displayDate = formatDateDisplay(selectedDate);

    return (
        <div className="h-full flex bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Mobile Backdrop */}
            {isSidebarOpen && (
                <div
                    className="md:hidden absolute inset-0 z-20 bg-black/20 backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar History */}
            <div
                className={`
                    ${isSidebarOpen ? 'w-80' : 'w-0'} 
                    bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 
                    transition-all duration-300 flex flex-col overflow-hidden
                    absolute md:relative z-30 h-full shadow-xl md:shadow-none
                `}
            >
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800">
                    <h2 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <BookOpen size={18} />
                        History
                    </h2>
                    <button
                        onClick={() => setSelectedDate(getLocalDateString())}
                        className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400"
                        title="Today"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {entries.map(entry => {
                        const d = formatDateDisplay(entry.date);
                        const isSelected = entry.date === selectedDate;
                        const snippet = entry.content?.replace(/<[^>]+>/g, '') || 'No content';

                        return (
                            <div
                                key={entry.date}
                                onClick={() => {
                                    setSelectedDate(entry.date);
                                    // On mobile, close sidebar after selection
                                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                                }}
                                className={`
                                    cursor-pointer p-3 rounded-xl border transition-all duration-200 group
                                    ${isSelected
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-200 dark:ring-indigo-700'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{d.dayName}</span>
                                    <span className="text-xs font-mono text-slate-400">{entry.date}</span>
                                </div>
                                <div className="text-xs text-slate-500 mb-2">{d.dayNum} {d.monthYear}</div>
                                <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {snippet}
                                </div>
                            </div>
                        );
                    })}

                    {entries.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            <p>No journal entries yet.</p>
                            <p className="text-xs mt-1">Start writing today!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Toggle Sidebar Button */}
            {/* Toggle Sidebar Button */}
            <div className={`relative z-40 flex items-center`}>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute left-0 -translate-x-1/2 top-4 md:top-1/2 md:-translate-y-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1.5 shadow-md hover:bg-slate-50 text-slate-500 transition-transform active:scale-95 flex items-center justify-center ring-4 ring-transparent hover:ring-indigo-50 dark:hover:ring-slate-700"
                    title={isSidebarOpen ? "Collapse history" : "Expand history"}
                >
                    {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-8 max-w-4xl mx-auto w-full">

                    {/* Date Header (Dynamic) */}
                    <div className="flex flex-col items-center mb-6 pt-6 animate-in slide-in-from-top-4 duration-500">
                        <div className="text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase text-sm mb-1">
                            {displayDate.dayName}
                        </div>
                        <div className="text-6xl font-light text-slate-800 dark:text-slate-100 mb-2 font-serif">
                            {displayDate.dayNum}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-lg flex items-center gap-2">
                            {displayDate.monthYear}
                            {selectedDate === getLocalDateString() && (
                                <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Today</span>
                            )}
                        </div>
                        <div className="w-16 h-1 bg-indigo-500 rounded-full mt-6 opacity-20"></div>
                    </div>

                    {/* Editor Container */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden min-h-[600px] mb-10 transition-all duration-300">

                        {/* Toolbar */}
                        <div className="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10 overflow-x-auto">
                            <button onClick={() => execCmd('bold')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-600 dark:text-slate-300" title="Bold">
                                <Bold size={18} />
                            </button>
                            <button onClick={() => execCmd('italic')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-600 dark:text-slate-300" title="Italic">
                                <Italic size={18} />
                            </button>
                            <button onClick={() => execCmd('underline')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-600 dark:text-slate-300" title="Underline">
                                <Underline size={18} />
                            </button>
                        </div>

                        {/* Lined Paper Editor */}
                        <div className="flex-1 relative overflow-hidden bg-white dark:bg-slate-800">
                            {isLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : null}

                            <div
                                ref={editorRef}
                                contentEditable
                                onInput={handleInput}
                                className="w-full h-full p-8 outline-none text-lg leading-[2rem] text-slate-800 dark:text-slate-200 font-serif resize-none overflow-y-auto custom-scrollbar"
                                style={{
                                    backgroundImage: 'linear-gradient(transparent 31px, rgba(0,0,0,0.05) 32px)',
                                    backgroundSize: '100% 32px',
                                    backgroundAttachment: 'local',
                                    lineHeight: '32px'
                                }}
                                data-placeholder={`Write your journal for ${displayDate.dayName}...`}
                            />
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 flex justify-between items-center sticky bottom-0">
                            <span>{content.length} characters</span>
                            <div className="flex items-center gap-3">
                                {isSaving ? (
                                    <span className="flex items-center gap-1.5 text-indigo-500 animate-pulse font-medium">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                        Saving...
                                    </span>
                                ) : (
                                    <span className="text-slate-300">
                                        {content === lastSavedContent.current ? 'All changes saved' : 'Unsaved changes'}
                                    </span>
                                )}
                                <button
                                    onClick={handleManualSave}
                                    disabled={isSaving || content === lastSavedContent.current}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-semibold shadow-sm transition-all active:scale-95"
                                >
                                    <Save size={14} />
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
