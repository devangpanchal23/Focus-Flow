import React, { useState } from 'react';
import Notes from './Notes';
import DailyJournal from './DailyJournal';

export default function Journal() {
    const [activeTab, setActiveTab] = useState('notes'); // 'notes' or 'daily'

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between px-8 py-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Journal</h1>
                    <p className="text-slate-500 text-sm mt-1">Capture your thoughts and ideas</p>
                </div>

                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`
                            px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                            ${activeTab === 'notes'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}
                        `}
                    >
                        Notes
                    </button>
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`
                            px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                            ${activeTab === 'daily'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}
                        `}
                    >
                        Daily Journal
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'notes' ? (
                    <Notes />
                ) : (
                    <DailyJournal />
                )}
            </div>
        </div>
    );
}
