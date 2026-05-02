import React, { useState, useEffect } from 'react';
import { Sun, Moon, CloudSun } from 'lucide-react';
import { format } from 'date-fns';
import { useUser } from '@clerk/clerk-react';

export default function Greeting() {
    const { user: currentUser } = useUser();
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const hour = date.getHours();
    let greeting = 'Good Morning';
    let Icon = Sun;

    if (hour >= 12 && hour < 17) {
        greeting = 'Good Afternoon';
        Icon = CloudSun;
    } else if (hour >= 17) {
        greeting = 'Good Evening';
        Icon = Moon;
    }

    return (
        <div className="flex flex-col mb-8">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
                <span className="text-sm font-medium uppercase tracking-wider">{format(date, 'EEEE, MMMM do')}</span>
            </div>
            <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">
                    {greeting}, {currentUser?.firstName || currentUser?.fullName?.split(' ')[0] || 'User'}
                </h1>
                <Icon className="text-indigo-500 w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
            </div>
        </div>
    );
}
