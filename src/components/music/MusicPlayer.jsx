import React, { useEffect, useRef } from 'react';
import { useMusicStore } from '../../store/useMusicStore';

export default function MusicPlayer() {
    const {
        isPlaying,
        volume,
        playlist,
        currentTrackIndex,
        nextTrack,
        setCurrentTime,
        setDuration,
        seekTime
    } = useMusicStore();
    const audioRef = useRef(null);

    const currentTrack = playlist[currentTrackIndex];

    // Handle Volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Handle Seek
    useEffect(() => {
        if (audioRef.current && seekTime !== null) {
            if (Math.abs(audioRef.current.currentTime - seekTime) > 0.5) {
                audioRef.current.currentTime = seekTime;
            }
        }
    }, [seekTime]);

    // Playback Control
    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying && currentTrack) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.error("Playback failed or paused:", e);
                    });
                }
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, currentTrack]);

    const handleEnded = () => {
        nextTrack();
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    if (!currentTrack) return null;

    return (
        <video
            ref={audioRef}
            src={currentTrack.url}
            onEnded={handleEnded}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            className="hidden"
            playsInline
        />
    );
}
