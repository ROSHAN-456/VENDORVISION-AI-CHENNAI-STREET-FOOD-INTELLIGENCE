import React from 'react';
import { Clock } from 'lucide-react';

export function Badge({ children, className = '' }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold leading-none ${className}`}>
            {children}
        </span>
    );
}

export function CrowdBadge({ level = 'Medium' }) {
    if (level === 'Low')
        return <Badge className="bg-green-100 text-green-800"><span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>Low</Badge>;
    if (level === 'High')
        return <Badge className="bg-red-100 text-red-800"><span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>High</Badge>;

    return <Badge className="bg-amber-100 text-amber-800"><span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>Medium</Badge>;
}

export function WaitBadge({ min }) {
    const color = min < 5 ? 'text-green-800 bg-green-100' : min > 15 ? 'text-red-800 bg-red-100' : 'text-amber-800 bg-amber-100';
    return <Badge className={color}><Clock size={12} />{min} min</Badge>;
}

export function Card({ children, className = '' }) {
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${className}`}>
            {children}
        </div>
    );
}

export function Button({ children, onClick, variant = 'primary', className = '', ...props }) {
    const base = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 active:scale-95";
    const variants = {
        primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-sm",
        secondary: "bg-brand-50 text-brand-900 border border-brand-100/60 hover:bg-brand-100",
        outline: "border-2 border-accent text-accent hover:bg-accent/10"
    };
    return (
        <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
}

export const MOCK_STALLS = [
    { id: 'S1', name: "Murugan Dosa Point", category: "Dosa · South Indian", rating: 4.8, distance: "0.2 km", lat: 13.0827, lon: 80.2707, liveWait: 12, liveCrowd: 'Medium' },
    { id: 'S2', name: "Anna Nagar Chaat", category: "Chaat · Snacks", rating: 4.5, distance: "1.4 km", lat: 13.0854, lon: 80.2101, liveWait: 4, liveCrowd: 'Low' },
    { id: 'S3', name: "Sowcarpet Kulfi", category: "Dessert", rating: 4.9, distance: "2.1 km", lat: 13.0988, lon: 80.2785, liveWait: 22, liveCrowd: 'High' },
    { id: 'S4', name: "Marina Beach Seafood", category: "Seafood", rating: 4.6, distance: "2.5 km", lat: 13.0543, lon: 80.2825, liveWait: 10, liveCrowd: 'Medium' },
    { id: 'S5', name: "T Nagar Filter Coffee", category: "Beverages", rating: 4.7, distance: "1.0 km", lat: 13.0405, lon: 80.2337, liveWait: 5, liveCrowd: 'Low' },
    { id: 'S6', name: "Mylapore Meals", category: "South Indian", rating: 4.8, distance: "3.2 km", lat: 13.0334, lon: 80.2674, liveWait: 15, liveCrowd: 'Medium' },
    { id: 'S7', name: "Besant Nagar Grill", category: "BBQ · Grill", rating: 4.9, distance: "5.1 km", lat: 13.0003, lon: 80.2668, liveWait: 25, liveCrowd: 'High' },
    { id: 'S8', name: "Alwarpet Sweets", category: "Sweets · Snacks", rating: 4.5, distance: "2.8 km", lat: 13.0336, lon: 80.2464, liveWait: 8, liveCrowd: 'Low' }
];
