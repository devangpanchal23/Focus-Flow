import React, { useRef } from 'react';
import { useMusicStore } from '../../store/useMusicStore';
import { useTaskStore } from '../../store/useTaskStore';
import { Play, Pause, SkipBack, SkipForward, Music, Upload, Trash2, Volume2, Plus, ListMusic } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function MusicSidebar() {
    const {
        playlist,
        currentTrackIndex,
        isPlaying,
        setIsPlaying,
        nextTrack,
        prevTrack,
        addTracks,
        removeTrack,
        playTrack,
        volume,
        setVolume,
        currentTime,
        duration,
        seekTo,
        fetchSongs
    } = useMusicStore();
    const { authToken } = useTaskStore();

    React.useEffect(() => {
        if (authToken) {
            // Fetch songs on mount if playlist is empty or stale. 
            // Or blindly fetch to sync.
            fetchSongs();
        }
    }, [authToken]);

    const fileInputRef = useRef(null);
    const scrollContainerRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            if (playlist.length + e.target.files.length > 100) {
                alert("Playlist limit of 100 songs reached.");
                return;
            }
            addTracks(e.target.files);
        }
    };

    const formatTime = (time) => {
        if (!time) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')} `;
    };

    const currentTrack = playlist[currentTrackIndex];

    return (
        // Changed h-[500px] to h-auto min-h-[500px] flex-1 to fill space as requested
        <div className="bg-white flex flex-col flex-1 h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2 text-slate-800">
                    <ListMusic size={20} className="text-indigo-600" />
                    <h3 className="font-bold">My Playlist</h3>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                    title="Add Songs"
                >
                    <Plus size={20} />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                    accept="audio/*,video/*"
                />
            </div>

            {/* Song List (Scrollable Area) */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar scroll-smooth"
            >
                {playlist.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                        <Music size={48} className="mb-4 text-slate-200" />
                        <p className="text-sm font-medium">No songs yet</p>
                        <p className="text-xs mt-1">Click + to add music</p>
                    </div>
                ) : (
                    playlist.map((track, idx) => (
                        <div
                            key={track.id}
                            className={cn(
                                "group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border border-transparent",
                                idx === currentTrackIndex
                                    ? "bg-indigo-50 border-indigo-100"
                                    : "hover:bg-slate-50 hover:border-slate-100"
                            )}
                            onClick={() => playTrack(idx)}
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                                    idx === currentTrackIndex ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:shadow-sm"
                                )}>
                                    {idx === currentTrackIndex && isPlaying ? (
                                        <div className="flex gap-[2px] items-end h-3">
                                            <span className="w-0.5 h-3 bg-white animate-[music-bar_0.8s_ease-in-out_infinite]" />
                                            <span className="w-0.5 h-2 bg-white animate-[music-bar_1.1s_ease-in-out_infinite]" />
                                            <span className="w-0.5 h-3 bg-white animate-[music-bar_1.3s_ease-in-out_infinite]" />
                                        </div>
                                    ) : (
                                        <Music size={14} />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={cn(
                                        "text-sm font-medium truncate",
                                        idx === currentTrackIndex ? "text-indigo-700" : "text-slate-700"
                                    )}>
                                        {track.name}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Now Playing Controller (Fixed Bottom) */}
            <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                {currentTrack ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner">
                                <Music size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate leading-tight">{currentTrack.name}</p>
                                <p className="text-xs text-indigo-500 font-medium">Now Playing</p>
                            </div>
                        </div>

                        {/* Timeline Slider */}
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium font-mono">
                            <span className="min-w-[32px] text-right">{formatTime(currentTime)}</span>
                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                value={currentTime}
                                onChange={(e) => seekTo(Number(e.target.value))}
                                className="flex-1 h-1 bg-slate-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                            />
                            <span className="min-w-[32px]">{formatTime(duration)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <button
                                onClick={prevTrack}
                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                <SkipBack size={20} />
                            </button>

                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="w-12 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-200 transition-all active:scale-95"
                            >
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                            </button>

                            <button
                                onClick={nextTrack}
                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                <SkipForward size={20} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 group">
                            <Volume2 size={16} className="text-slate-400 group-hover:text-slate-600" />
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={volume * 100}
                                onChange={(e) => setVolume(e.target.value / 100)}
                                className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-2 text-slate-400 text-sm">
                        Select a song to play
                    </div>
                )}
            </div>

            <style jsx>{`
@keyframes music - bar {
    0 %, 100 % { height: 30 %; }
    50 % { height: 100 %; }
}
`}</style>
        </div>
    );
}
