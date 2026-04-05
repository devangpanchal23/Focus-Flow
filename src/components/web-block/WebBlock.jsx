import React, { useState, useEffect } from 'react';
import { Shield, Trash2, Globe, AlertCircle, Loader2, Download } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';

export default function WebBlock() {
    const { authToken } = useTaskStore();
    const [blockedSites, setBlockedSites] = useState([]);
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (authToken) {
            fetchBlockedSites();
        }
    }, [authToken]);

    // Sync helper
    const syncToExtension = (sites) => {
        localStorage.setItem('blitzit_blocked_sites', JSON.stringify(sites));
        // Use postMessage to communicate with content script (works across isolated worlds)
        window.postMessage({ type: 'BLITZIT_BLOCK_UPDATE', sites: deepClone(sites) }, '*');
    };

    // Helper to ensure clean objects are sent
    const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

    const fetchBlockedSites = async () => {
        try {
            const res = await fetch('/api/web-block', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!res.ok) throw new Error('Failed to fetch blocked websites');
            const data = await res.json();
            setBlockedSites(data);
            syncToExtension(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!url.trim()) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/web-block', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ domain: url })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to block website');
            }

            const newSites = [data, ...blockedSites];
            setBlockedSites(newSites);
            syncToExtension(newSites);
            setUrl('');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemove = async (id) => {
        try {
            const res = await fetch(`/api/web-block/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!res.ok) throw new Error('Failed to remove');

            const newSites = blockedSites.filter(site => site._id !== id);
            setBlockedSites(newSites);
            syncToExtension(newSites);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDownloadExtension = async () => {
        try {
            // Dynamically import JSZip
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();

            // List of extension files to include
            const files = [
                'manifest.json',
                'background.js',
                'content.js',
                'popup.html',
                'popup.js',
                'blocked.html'
            ];

            // Fetch and add each file to the ZIP
            await Promise.all(
                files.map(async (file) => {
                    try {
                        const response = await fetch(`/web-block-extension/${file}`);
                        if (response.ok) {
                            const content = await response.text();
                            zip.file(file, content);
                        }
                    } catch (err) {
                        console.error(`Failed to fetch ${file}:`, err);
                    }
                })
            );

            // Add a README file with installation instructions
            const readme = `BlitzIt Web Block Extension
============================

Thank you for downloading the BlitzIt Web Block Extension!

INSTALLATION INSTRUCTIONS:
--------------------------

1. Extract this ZIP file to a folder on your computer
2. Open your Chrome/Edge browser
3. Navigate to: chrome://extensions/ (or edge://extensions/)
4. Enable "Developer mode" using the toggle in the top-right corner
5. Click "Load unpacked" button
6. Select the folder where you extracted these files
7. The extension is now installed!

USAGE:
------
- The extension will automatically sync with your BlitzIt account
- Any websites you block in the BlitzIt app will be blocked in your browser
- Visit the BlitzIt Web Block page to manage your blocked sites

SUPPORT:
--------
If you encounter any issues, please contact support or visit our documentation.

Enjoy distraction-free browsing!
`;
            zip.file('README.txt', readme);

            // Generate the ZIP file
            const blob = await zip.generateAsync({ type: 'blob' });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'blitzit-web-block-extension.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download error:', err);
            setError('Failed to download extension. Please try again.');
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-5 dark:opacity-10 transform translate-x-1/4 -translate-y-1/4">
                    <Shield size={300} />
                </div>
                <div className="relative z-10 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-red-500">
                    <Shield size={40} />
                </div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Web Block</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">Eliminate distractions by blocking time-wasting websites. Take control of your focus.</p>
                </div>
            </div>

            {/* Download Extension Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-200 dark:border-blue-900/30 p-6 md:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex-1 space-y-3">
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Download className="text-blue-600 dark:text-blue-400" size={28} />
                            Get the Browser Extension
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed">
                            Download the BlitzIt Web Block extension to sync your blocked websites across all your devices.
                            Install it once and your focus settings will work everywhere - whether you're on your laptop, desktop, or any other device.
                            The extension seamlessly integrates with your BlitzIt account to keep distractions at bay.
                        </p>
                    </div>
                    <button
                        onClick={handleDownloadExtension}
                        className="w-full md:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 md:px-8 py-4 rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 whitespace-nowrap"
                    >
                        <Download size={22} />
                        Download Extension
                    </button>
                </div>
            </div>

            {/* Input Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
                <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Website URL to Block</label>
                        <div className="relative group">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={20} />
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="instagram.com, youtube.com"
                                className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30 focus:border-red-500 outline-none bg-slate-50 dark:bg-slate-900/50 transition-all font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting || !url}
                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Shield size={20} />}
                        Block Website
                    </button>
                </form>
                {error && (
                    <div className="mt-6 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}
            </div>

            {/* List Section */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white px-1 flex items-center gap-2">
                    Blocked Websites
                    <span className="text-sm font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{blockedSites.length}</span>
                </h2>

                {loading ? (
                    <div className="flex justify-center p-20"><Loader2 className="animate-spin text-red-500" size={40} /></div>
                ) : blockedSites.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                        <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                            <Shield size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">No websites blocked yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Add distracting websites above to eliminate them.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {blockedSites.map(site => (
                            <div key={site._id} className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 flex items-center justify-center text-red-500 shadow-inner">
                                        <Globe size={24} />
                                    </div>
                                    <button
                                        onClick={() => handleRemove(site._id)}
                                        className="text-slate-300 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                                        title="Unblock"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>

                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-1 truncate">{site.domain}</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                        <span className="text-xs text-red-500 font-bold uppercase tracking-wider">Blocked</span>
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-2xl"></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
