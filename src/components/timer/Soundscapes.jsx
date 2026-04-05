import React, { useState } from 'react';
import { CloudRain, Coffee, Wind, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function Soundscapes() {
    const { volume, setVolume, soundEnabled, toggleSound } = useSettingsStore();
    const [activeSound, setActiveSound] = useState(null);

    const sounds = [
        { id: 'rain', label: 'Heavy Rain', icon: CloudRain },
        { id: 'coffee', label: 'Coffee Shop', icon: Coffee },
        { id: 'forest', label: 'Forest Wind', icon: Wind },
    ];

    const handleToggle = (id) => {
        if (activeSound === id) {
            setActiveSound(null);
        } else {
            setActiveSound(id);
            if (!soundEnabled) toggleSound();
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700">Soundscapes</h3>
                <button
                    onClick={toggleSound}
                    className={cn("p-2 rounded-full hover:bg-slate-50 transition-colors", !soundEnabled && "text-slate-400")}
                >
                    {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
            </div>

            <div className="space-y-2">
                {sounds.map((sound) => (
                    <button
                        key={sound.id}
                        onClick={() => handleToggle(sound.id)}
                        className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                            activeSound === sound.id && soundEnabled
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20"
                                : "border-slate-100 hover:bg-slate-50 text-slate-600"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <sound.icon size={20} />
                            <span className="text-sm font-medium">{sound.label}</span>
                        </div>
                        {activeSound === sound.id && soundEnabled && (
                            <div className="flex gap-1 h-3 items-end">
                                <div className="w-1 bg-indigo-500 animate-[bounce_1s_infinite] h-2"></div>
                                <div className="w-1 bg-indigo-500 animate-[bounce_1.2s_infinite] h-3"></div>
                                <div className="w-1 bg-indigo-500 animate-[bounce_0.8s_infinite] h-1"></div>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Volume Slider */}
            {soundEnabled && (
                <div className="mt-6 flex items-center gap-3">
                    <Volume2 size={16} className="text-slate-400" />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume * 100}
                        onChange={(e) => setVolume(e.target.value / 100)}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500"
                    />
                </div>
            )}
        </div>
    );
}
