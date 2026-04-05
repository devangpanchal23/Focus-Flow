import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music2, Loader2, Trash2, ListMusic } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function YouTubeMusicPlayer() {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [playlist, setPlaylist] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(50);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [playerReady, setPlayerReady] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);

    const playerRef = useRef(null);
    const playerInstanceRef = useRef(null);
    const progressIntervalRef = useRef(null);

    const resumeStateRef = useRef(null);

    // Load YouTube IFrame API
    useEffect(() => {
        if (window.YT && window.YT.Player) {
            return;
        }

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            console.log('YouTube API Ready');
        };
    }, []);

    // Load saved state from localStorage
    useEffect(() => {
        const savedState = localStorage.getItem('youtube-music-player');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                const { playlist: savedPlaylist, currentIndex: savedIndex, volume: savedVolume, currentTime: savedTime, isPlaying: savedIsPlaying } = parsedState;

                if (savedPlaylist && savedPlaylist.length > 0) {
                    setPlaylist(savedPlaylist);
                    setCurrentIndex(savedIndex || 0);
                    setVolume(savedVolume || 50);

                    // Store resume state to be used when player is ready
                    if (savedTime || savedIsPlaying) {
                        resumeStateRef.current = {
                            time: savedTime || 0,
                            isPlaying: savedIsPlaying || false
                        };
                    }
                }
            } catch (e) {
                console.error('Failed to load saved state:', e);
            }
        }
        setIsInitialized(true);
    }, []);

    // Save state to localStorage (General updates + beforeunload)
    useEffect(() => {
        if (!isInitialized) return;

        const saveState = () => {
            if (playlist.length > 0) {
                const currentState = {
                    playlist,
                    currentIndex,
                    volume,
                    // Get latest values from player if available, else use state
                    currentTime: playerInstanceRef.current && playerInstanceRef.current.getCurrentTime ? playerInstanceRef.current.getCurrentTime() : currentTime,
                    isPlaying: playerInstanceRef.current && playerInstanceRef.current.getPlayerState ? playerInstanceRef.current.getPlayerState() === 1 : isPlaying
                };
                localStorage.setItem('youtube-music-player', JSON.stringify(currentState));
            } else {
                localStorage.removeItem('youtube-music-player');
            }
        };

        // Save on changes
        saveState();

        // Also save on unload to get exact time
        const handleBeforeUnload = () => saveState();
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [playlist, currentIndex, volume, currentTime, isPlaying, isInitialized]);

    // Initialize player when currentIndex changes
    useEffect(() => {
        if (playlist.length > 0 && window.YT && window.YT.Player) {
            // If we are just mounting and have resume state, don't reset everything yet
            if (!resumeStateRef.current) {
                setPlayerReady(false);
                setIsPlaying(false);
            }
            initializePlayer();
        }
    }, [currentIndex]);

    // Update progress
    useEffect(() => {
        if (isPlaying && playerInstanceRef.current) {
            progressIntervalRef.current = setInterval(() => {
                if (playerInstanceRef.current && playerInstanceRef.current.getCurrentTime) {
                    const current = playerInstanceRef.current.getCurrentTime();
                    const total = playerInstanceRef.current.getDuration();
                    setCurrentTime(current);
                    setDuration(total);
                }
            }, 1000);
        } else {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        }

        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, [isPlaying]);

    const fetchVideoTitle = async (videoId) => {
        try {
            // Using oEmbed API with a timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                return data.title;
            }
        } catch (error) {
            console.error('Failed to fetch video title:', error);
        }
        return `Video ${videoId.substring(0, 8)}...`;
    };

    const extractVideoIds = async (url) => {
        // Check if it's a playlist
        const playlistMatch = url.match(/[?&]list=([^&]+)/);
        if (playlistMatch) {
            return { type: 'playlist', id: playlistMatch[1], title: 'YouTube Playlist' };
        }

        // Check if it's a single video
        const videoMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
        if (videoMatch) {
            const videoId = videoMatch[1];
            const title = await fetchVideoTitle(videoId);
            return { type: 'video', id: videoId, title };
        }

        return null;
    };

    const initializePlayer = () => {
        if (!playerRef.current || !window.YT) return;

        // Destroy existing player
        if (playerInstanceRef.current) {
            try {
                playerInstanceRef.current.destroy();
            } catch (e) {
                console.error('Error destroying player:', e);
            }
        }

        const currentVideo = playlist[currentIndex];
        if (!currentVideo) return;

        // Determine start time and autoplay from resume state or default
        let startTime = 0;
        let shouldAutoPlay = 0;

        if (resumeStateRef.current) {
            startTime = Math.floor(resumeStateRef.current.time);
            shouldAutoPlay = resumeStateRef.current.isPlaying ? 1 : 0;
            // Clear resume state so it doesn't affect future track changes
            resumeStateRef.current = null;
        } else {
            // Default reset for new tracks
            setCurrentTime(0);
            setDuration(0);
        }

        const playerVars = currentVideo.type === 'playlist'
            ? {
                listType: 'playlist',
                list: currentVideo.id,
                autoplay: shouldAutoPlay,
                start: startTime,
                controls: 0,
                modestbranding: 1,
                rel: 0
            }
            : {
                autoplay: shouldAutoPlay,
                start: startTime,
                controls: 0,
                modestbranding: 1,
                rel: 0
            };

        try {
            playerInstanceRef.current = new window.YT.Player(playerRef.current, {
                height: '0',
                width: '0',
                videoId: currentVideo.type === 'video' ? currentVideo.id : undefined,
                playerVars,
                events: {
                    onReady: (event) => {
                        setPlayerReady(true);
                        setIsLoading(false);
                        event.target.setVolume(volume);
                        if (isMuted) {
                            event.target.mute();
                        }

                        // If we are resuming, ensure state matches
                        if (shouldAutoPlay) {
                            setIsPlaying(true);
                        }

                        const videoDuration = event.target.getDuration();
                        setDuration(videoDuration);
                    },
                    onStateChange: (event) => {
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            setIsPlaying(true);
                        } else if (event.data === window.YT.PlayerState.PAUSED) {
                            setIsPlaying(false);
                        } else if (event.data === window.YT.PlayerState.ENDED) {
                            handleNext();
                        }
                    },
                    onError: (event) => {
                        setError('Failed to load video. Please check the URL.');
                        setIsLoading(false);
                        setPlayerReady(false);
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing player:', error);
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!youtubeUrl.trim()) {
            setError('Please enter a YouTube URL');
            return;
        }

        setError('');
        setIsLoading(true);

        const extracted = await extractVideoIds(youtubeUrl);
        if (!extracted) {
            setError('Invalid YouTube URL. Please enter a valid video or playlist link.');
            setIsLoading(false);
            return;
        }

        const newPlaylist = [...playlist, extracted];
        setPlaylist(newPlaylist);

        // If this is the first video, set it as current
        if (playlist.length === 0) {
            setCurrentIndex(0);
        }

        setYoutubeUrl('');
        setIsLoading(false);
    };

    const handlePlayPause = () => {
        if (!playerInstanceRef.current || !playerReady) return;

        if (isPlaying) {
            playerInstanceRef.current.pauseVideo();
        } else {
            playerInstanceRef.current.playVideo();
        }
    };

    const handleNext = () => {
        if (playlist.length === 0) return;
        const nextIndex = (currentIndex + 1) % playlist.length;
        setCurrentIndex(nextIndex);
    };

    const handlePrevious = () => {
        if (playlist.length === 0) return;
        const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
        setCurrentIndex(prevIndex);
    };

    const handleRemoveTrack = (indexToRemove) => {
        const newPlaylist = playlist.filter((_, idx) => idx !== indexToRemove);

        if (newPlaylist.length === 0) {
            // No more tracks
            setPlaylist([]);
            setCurrentIndex(0);
            setIsPlaying(false);
            setPlayerReady(false);
            if (playerInstanceRef.current) {
                playerInstanceRef.current.destroy();
                playerInstanceRef.current = null;
            }
        } else {
            setPlaylist(newPlaylist);

            // Adjust current index
            if (indexToRemove < currentIndex) {
                setCurrentIndex(currentIndex - 1);
            } else if (indexToRemove === currentIndex) {
                // If we removed the current track, play the next one (or first if we removed the last)
                const newIndex = currentIndex >= newPlaylist.length ? 0 : currentIndex;
                setCurrentIndex(newIndex);
            }
        }
    };

    const handleTrackSelect = (index) => {
        if (index === currentIndex && playerReady) {
            // Toggle play/pause if clicking current track
            handlePlayPause();
        } else {
            // Switch to new track
            setCurrentIndex(index);
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseInt(e.target.value);
        setVolume(newVolume);
        if (playerInstanceRef.current) {
            playerInstanceRef.current.setVolume(newVolume);
        }
        if (newVolume > 0) {
            setIsMuted(false);
            if (playerInstanceRef.current) {
                playerInstanceRef.current.unMute();
            }
        }
    };

    const handleMuteToggle = () => {
        if (playerInstanceRef.current) {
            if (isMuted) {
                playerInstanceRef.current.unMute();
                setIsMuted(false);
            } else {
                playerInstanceRef.current.mute();
                setIsMuted(true);
            }
        }
    };

    const handleSeek = (e) => {
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);
        if (playerInstanceRef.current && playerReady) {
            playerInstanceRef.current.seekTo(newTime, true);
        }
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-50 to-white">
            {/* Hidden YouTube Player */}
            <div ref={playerRef} className="hidden"></div>

            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Music2 size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">YouTube Music</h3>
                        <p className="text-xs text-slate-500">
                            {playlist.length > 0 ? `${playlist.length} track${playlist.length > 1 ? 's' : ''}` : 'Play your favorite tracks'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Input Section */}
            {playlist.length === 0 && (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-md">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                <Music2 size={32} className="text-indigo-600" />
                            </div>
                            <h4 className="font-semibold text-slate-700 mb-2">Get Started</h4>
                            <p className="text-sm text-slate-500">Paste a YouTube video or playlist URL below</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors text-sm"
                                />
                                {error && (
                                    <p className="text-xs text-red-500 mt-2">{error}</p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <Play size={18} fill="currentColor" />
                                        Load & Play
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Player Section */}
            {playlist.length > 0 && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Now Playing */}
                    <div className="p-6 pb-4">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 flex-shrink-0">
                                    {isPlaying ? (
                                        <div className="flex gap-1 items-end h-6">
                                            <div className="w-1 bg-white animate-[music-bar_0.8s_ease-in-out_infinite] h-6"></div>
                                            <div className="w-1 bg-white animate-[music-bar_1.1s_ease-in-out_infinite] h-4"></div>
                                            <div className="w-1 bg-white animate-[music-bar_1.3s_ease-in-out_infinite] h-6"></div>
                                        </div>
                                    ) : (
                                        <Music2 size={28} className="text-white" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-800 truncate text-sm">
                                        {playlist[currentIndex]?.title || 'Loading...'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Track {currentIndex + 1} of {playlist.length}
                                    </p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    disabled={!playerReady}
                                    className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-indigo-500 [&::-webkit-slider-thumb]:to-purple-600 [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-110 transition-all disabled:opacity-50"
                                />
                                <div className="flex justify-between text-xs text-slate-400 font-mono">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-6 mt-6 mb-4">
                                <button
                                    onClick={handlePrevious}
                                    disabled={playlist.length === 0}
                                    className="p-3 rounded-full hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <SkipBack size={24} />
                                </button>

                                <button
                                    onClick={handlePlayPause}
                                    disabled={!playerReady}
                                    className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPlaying ? (
                                        <Pause size={28} fill="currentColor" />
                                    ) : (
                                        <Play size={28} fill="currentColor" className="ml-1" />
                                    )}
                                </button>

                                <button
                                    onClick={handleNext}
                                    disabled={playlist.length === 0}
                                    className="p-3 rounded-full hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <SkipForward size={24} />
                                </button>
                            </div>

                            {/* Volume Control */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleMuteToggle}
                                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                                >
                                    {isMuted || volume === 0 ? (
                                        <VolumeX size={20} />
                                    ) : (
                                        <Volume2 size={20} />
                                    )}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="flex-1 h-2 bg-slate-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-indigo-500 [&::-webkit-slider-thumb]:to-purple-600 hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                                />
                                <span className="text-xs text-slate-500 font-mono w-8 text-right">{volume}</span>
                            </div>
                        </div>
                    </div>

                    {/* Playlist */}
                    <div className="flex-1 overflow-hidden px-6 pb-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
                            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                                <ListMusic size={18} className="text-indigo-600" />
                                <h4 className="font-semibold text-slate-800 text-sm">Playlist</h4>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {playlist.map((track, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "group flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border",
                                            idx === currentIndex
                                                ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200"
                                                : "hover:bg-slate-50 border-transparent hover:border-slate-100"
                                        )}
                                        onClick={() => handleTrackSelect(idx)}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                                            idx === currentIndex
                                                ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200"
                                                : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:shadow-sm"
                                        )}>
                                            {idx === currentIndex && isPlaying ? (
                                                <div className="flex gap-[2px] items-end h-3">
                                                    <span className="w-0.5 h-3 bg-white animate-[music-bar_0.8s_ease-in-out_infinite]" />
                                                    <span className="w-0.5 h-2 bg-white animate-[music-bar_1.1s_ease-in-out_infinite]" />
                                                    <span className="w-0.5 h-3 bg-white animate-[music-bar_1.3s_ease-in-out_infinite]" />
                                                </div>
                                            ) : (
                                                <Music2 size={14} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm font-medium truncate",
                                                idx === currentIndex ? "text-indigo-700" : "text-slate-700"
                                            )}>
                                                {track.title}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {track.type === 'playlist' ? 'Playlist' : 'Video'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveTrack(idx);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Add More */}
                    <div className="px-6 pb-6">
                        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 border border-slate-100">
                            <form onSubmit={handleSubmit} className="flex gap-2">
                                <input
                                    type="text"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    placeholder="Add another video or playlist..."
                                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors text-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
                                </button>
                            </form>
                            {error && (
                                <p className="text-xs text-red-500 mt-2">{error}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes music-bar {
                    0%, 100% { height: 30%; }
                    50% { height: 100%; }
                }
            `}</style>
        </div>
    );
}
