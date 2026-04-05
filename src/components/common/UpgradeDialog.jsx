import React from 'react';
import { Lock, ArrowRight, X } from 'lucide-react';

const UpgradeDialog = ({ isOpen, onClose, onUpgrade, featureName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity opacity-100"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mt-2 mb-6">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                        <Lock className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                        Upgrade Required
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        You need to upgrade your plan to access <span className="font-semibold text-slate-700 dark:text-slate-300">{featureName}</span>.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onUpgrade}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.98] shadow-sm hover:shadow-indigo-500/20 group"
                    >
                        <span>Upgrade Now</span>
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium py-3 px-4 rounded-xl transition-all active:scale-[0.98]"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpgradeDialog;
