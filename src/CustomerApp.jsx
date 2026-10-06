import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Star, User, Compass, Heart, Bell, History, X, CheckCircle, Navigation, AlertTriangle, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CrowdBadge, WaitBadge, Button, MOCK_STALLS } from './SharedComponents';
import VoiceAssistant from './VoiceAssistant';

const CHENNAI_CENTER = { lat: 13.0827, lon: 80.2707 };
const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// --- Vanilla Leaflet Map Component ---
function MapView({ stalls, selectedId, onSelectStall, userLoc, hasLocPermission, onRouteFound }) {
    const mapRef = useRef(null);
    const containerRef = useRef(null);
    const markersRef = useRef({});
    const userMarkerRef = useRef(null);
    const routingControlRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !window.L) return;

        if (!mapRef.current) {
            mapRef.current = window.L.map(containerRef.current).setView([13.0827, 80.2707], 11);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapRef.current);
        }

        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};

        stalls.forEach(s => {
            if (!s.lat || !s.lon) return;
            const dotColor = s.liveCrowd === 'High' ? '#ef4444' : s.liveCrowd === 'Low' ? '#22c55e' : '#f59e0b';
            const html = `<div style="background:${dotColor};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>`;
            const icon = window.L.divIcon({ html, className: '', iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -10] });

            const marker = window.L.marker([s.lat, s.lon], { icon }).addTo(mapRef.current);
            marker.bindPopup(`<div style="font-family:'Inter',sans-serif;font-size:13px;color:#1e293b;"><b>${s.name}</b><br>Wait: <b>${s.liveWait || '-'} min</b></div>`);
            marker.on('click', () => onSelectStall(s));

            markersRef.current[s.id] = marker;
        });

        // Add User Location Marker
        if (userLoc) {
            if (userMarkerRef.current) {
                userMarkerRef.current.remove();
            }
            const userHtml = `<div style="background:#3b82f6;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.5);"></div>`;
            const uIcon = window.L.divIcon({ html: userHtml, className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
            userMarkerRef.current = window.L.marker([userLoc.lat, userLoc.lon], { icon: uIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
            if (hasLocPermission) {
                userMarkerRef.current.bindPopup(`<div style="font-family:'Inter',sans-serif;font-size:13px;color:#1e293b;"><b>You are here</b></div>`);
            } else {
                userMarkerRef.current.bindPopup(`<div style="font-family:'Inter',sans-serif;font-size:13px;color:#1e293b;"><b>Default Location</b><br>Enable location for accuracy</div>`);
            }
        }
    }, [stalls, onSelectStall, userLoc, hasLocPermission]);

    useEffect(() => {
        if (!mapRef.current || !window.L) return;

        // Clear existing route if any
        if (routingControlRef.current) {
            mapRef.current.removeControl(routingControlRef.current);
            routingControlRef.current = null;
        }

        if (selectedId && markersRef.current[selectedId]) {
            const target = markersRef.current[selectedId];

            if (userLoc && window.L.Routing) {
                routingControlRef.current = window.L.Routing.control({
                    waypoints: [
                        window.L.latLng(userLoc.lat, userLoc.lon),
                        target.getLatLng()
                    ],
                    routeWhileDragging: false,
                    show: false, // hide the text directions container
                    addWaypoints: false,
                    fitSelectedRoutes: true,
                    lineOptions: {
                        styles: [{ color: '#3b82f6', opacity: 0.8, weight: 6 }]
                    },
                    createMarker: () => null // don't recreate start/end markers
                }).addTo(mapRef.current);

                routingControlRef.current.on('routesfound', (e) => {
                    const routes = e.routes;
                    if (routes && routes.length > 0 && onRouteFound) {
                        const summary = routes[0].summary;
                        const dist = summary.totalDistance > 1000
                            ? (summary.totalDistance / 1000).toFixed(1) + ' km'
                            : Math.round(summary.totalDistance) + ' m';
                        const time = Math.round(summary.totalTime / 60) + ' min drive';
                        onRouteFound(`${dist} · ${time}`);
                    }
                });
            } else {
                mapRef.current.setView(target.getLatLng(), 14, { animate: true });
            }
            target.openPopup();
        } else {
            // No selection -> clear route Info and reset Map View
            if (onRouteFound) onRouteFound(null);
            if (userLoc) {
                mapRef.current.setView([userLoc.lat, userLoc.lon], 11, { animate: true });
            }
        }

        return () => {
            if (routingControlRef.current && mapRef.current) {
                mapRef.current.removeControl(routingControlRef.current);
            }
        };
    }, [selectedId, userLoc]);

    return (
        <>
            <style>{`.leaflet-control-zoom a { width: 44px !important; height: 44px !important; line-height: 44px !important; font-size: 22px !important; }`}</style>
            <div ref={containerRef} className="w-full h-full min-h-[192px] rounded-xl border border-slate-200 shadow-sm z-0 relative overflow-hidden" />
        </>
    );
}

export default function CustomerApp({ onLogout, user, onAuthError }) {
    const [activeTab, setActiveTab] = useState('home');
    const [selectedStall, setSelectedStall] = useState(null);
    const [checkInStall, setCheckInStall] = useState(null);
    const [toast, setToast] = useState('');
    const [stalls, setStalls] = useState([]);
    const [loadingStalls, setLoadingStalls] = useState(true);
    const [errorStalls, setErrorStalls] = useState(null);
    const [loadingPrediction, setLoadingPrediction] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState('default'); // 'default' | 'wait' | 'nearby'
    const [savedStalls, setSavedStalls] = useState([]);
    const [userLoc, setUserLoc] = useState(CHENNAI_CENTER);
    const [hasLocPermission, setHasLocPermission] = useState(false);
    const [routeInfo, setRouteInfo] = useState(null);
    const [alertsFeed, setAlertsFeed] = useState([]);
    const [loadingAlerts, setLoadingAlerts] = useState(false);

    const displayName = user?.name?.split(' ')[0] || 'Explorer';
    const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

    // Try to get user geolocation
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                    setHasLocPermission(true);
                },
                () => { setHasLocPermission(false); } // silently use default Chennai center
            );
        }
    }, []);

    useEffect(() => {
        const fetchStalls = async () => {
            try {
                setLoadingStalls(true);
                const res = await fetch(`${API_BASE}/stalls`);
                if (!res.ok) throw new Error("Failed to fetch stalls");
                const data = await res.json();
                const now = new Date();
                const hour = now.getHours();
                const dayOfWeek = now.getDay();

                // Fetch predictions for ALL stalls upfront (enables sort-by-wait and badges)
                const merged = await Promise.all(data.map(async s => {
                    const mock = MOCK_STALLS.find(m => m.id === s.id) || {};
                    const base = { ...mock, ...s };
                    try {
                        const pRes = await fetch(`${API_BASE}/predict?stall_id=${s.id}&hour=${hour}&day_of_week=${dayOfWeek}&weather=Clear`);
                        if (pRes.ok) {
                            const p = await pRes.json();
                            base.liveWait = p.wait_minutes;
                            base.liveCrowd = p.crowd_level;
                            base.source = p.source;
                            base.voteCount = p.vote_count;
                        }
                    } catch (e) { }
                    // compute distance from user
                    base.distKm = haversineKm(userLoc.lat, userLoc.lon, base.lat || 0, base.lon || 0);
                    base.distance = base.distKm.toFixed(1) + ' km';
                    return base;
                }));
                setStalls(merged);
                setErrorStalls(null);
            } catch (err) {
                console.error(err);
                setStalls(MOCK_STALLS);
                setErrorStalls("Failed to load real data. Serving mock data.");
            } finally {
                setLoadingStalls(false);
            }
        };
        fetchStalls();
    }, []);

    const onSelectStall = async (stall) => {
        setSelectedStall(stall);
        setLoadingPrediction(true);
        try {
            const wRes = await fetch(`${API_BASE}/weather?lat=${stall.lat}&lon=${stall.lon}`);
            const wData = wRes.ok ? await wRes.json() : { weather: "Clear" };

            const now = new Date();
            const hour = now.getHours();
            const dayOfWeek = now.getDay();

            // Fetch current prediction
            const pRes = await fetch(`${API_BASE}/predict?stall_id=${stall.id}&hour=${hour}&day_of_week=${dayOfWeek}&weather=${wData.weather}`);
            let currentCrowd = stall.liveCrowd;
            let currentWait = stall.liveWait;
            if (pRes.ok) {
                const pData = await pRes.json();
                currentCrowd = pData.crowd_level;
                currentWait = pData.wait_minutes;
                stall.source = pData.source;
                stall.voteCount = pData.vote_count;
            }

            // Fetch Real Forecast from AI
            const forecastPromises = Array.from({ length: 6 }).map(async (_, i) => {
                const forecastHour = (hour + i) % 24;
                let forecastDay = dayOfWeek;
                if (hour + i >= 24) {
                    forecastDay = (dayOfWeek + Math.floor((hour + i) / 24)) % 7;
                }
                
                const res = await fetch(`${API_BASE}/predict?stall_id=${stall.id}&hour=${forecastHour}&day_of_week=${forecastDay}&weather=${wData.weather}`);
                if (!res.ok) throw new Error("Forecast failed");
                const data = await res.json();
                
                const ampm = forecastHour >= 12 ? 'PM' : 'AM';
                const h12 = forecastHour % 12 === 0 ? 12 : forecastHour % 12;
                
                return { time: `${h12} ${ampm}`, wait: Math.round(data.wait_minutes), crowd: data.crowd_level };
            });

            try {
                const forecastArr = await Promise.all(forecastPromises);
                setSelectedStall(prev => ({ ...prev, liveCrowd: currentCrowd, liveWait: currentWait, forecast: forecastArr, forecastError: false }));
            } catch(e) {
                setSelectedStall(prev => ({ ...prev, liveCrowd: currentCrowd, liveWait: currentWait, forecast: [], forecastError: true }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingPrediction(false);
        }
    };

    const navigate = (tab) => { setActiveTab(tab); setSelectedStall(null); };

    const handleCheckInSubmit = async (level) => {
        try {
            const res = await fetch(`${API_BASE}/checkin`, {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    stall_id: checkInStall.id,
                    reported_crowd_level: level,
                    timestamp: new Date().toISOString()
                })
            });
            if (res.status === 401 || res.status === 403) {
                if (onAuthError) onAuthError(res.status);
                return;
            }
        } catch (e) { console.error(e); }
        const checkedStall = checkInStall;
        setCheckInStall(null);
        setToast('Thanks for your report! You are helping others.');
        setTimeout(() => setToast(''), 3000);
        
        if (selectedStall && checkedStall.id === selectedStall.id) {
            onSelectStall(checkedStall);
        }
    };

    const filteredStalls = stalls.filter(s =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        if (sortMode === 'wait') return (a.liveWait || 99) - (b.liveWait || 99);
        if (sortMode === 'nearby') return (a.distKm || 99) - (b.distKm || 99);
        return 0;
    });

    const toggleSave = (stall) => {
        setSavedStalls(prev =>
            prev.find(s => s.id === stall.id) ? prev.filter(s => s.id !== stall.id) : [...prev, stall]
        );
    };

    const navItems = [
        { id: 'home', icon: Compass, label: 'Explore' },
        { id: 'favorites', icon: Heart, label: 'Saved' },
        { id: 'history', icon: Bell, label: 'Alerts' }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">

            {/* Desktop Sidebar (hidden on mobile) */}
            <aside className="hidden md:flex w-64 bg-brand-900 text-white flex-col sticky top-0 h-screen shadow-2xl z-20">
                <div className="p-6 pb-2">
                    <div className="text-brand-100/70 text-[10px] font-bold tracking-wider uppercase mb-1">VendorVision AI</div>
                    <h1 className="text-xl font-serif font-bold">{greeting}, {displayName} 👋</h1>
                </div>
                <div className="px-6 mb-8 mt-2">
                    <div className="inline-flex items-center gap-2 text-xs text-brand-100 bg-brand-600/50 p-2 rounded-lg border border-brand-500">
                        <MapPin size={14} className="text-accent" /> Chennai, TN
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => navigate(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${activeTab === item.id ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                            <item.icon size={20} fill={activeTab === item.id ? "currentColor" : "none"} />
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-6 border-t border-brand-800">
                    <button onClick={onLogout} className="flex items-center gap-3 text-sm text-slate-400 hover:text-white font-semibold transition-colors">
                        <User size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen relative md:pb-0 pb-16">

                {/* Mobile Header (hidden on desktop) */}
                <header className="md:hidden px-5 pt-6 pb-4 bg-brand-900 text-white rounded-b-3xl shrink-0 shadow-md relative z-10 w-full">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <div className="text-brand-100/70 text-xs font-semibold tracking-wider uppercase mb-1">VendorVision AI</div>
                            <h1 className="text-xl font-serif font-bold">{greeting}, {displayName} 👋</h1>
                        </div>
                        <button onClick={onLogout} className="p-2 bg-brand-600 rounded-full hover:bg-brand-500 transition-colors">
                            <User size={20} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-brand-100 bg-brand-600/50 p-2.5 rounded-xl border border-brand-500">
                        <MapPin size={16} className="text-accent" /> Chennai, TN (Current Location)
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 w-full max-w-6xl mx-auto">

                    {selectedStall ? (
                        /* STALL DETAILS */
                        <div className="animate-fadeUp">
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={() => setSelectedStall(null)} className="text-brand-500 font-bold flex items-center gap-1 hover:text-brand-600 transition-colors">
                                    ← Back to List
                                </button>
                                {routeInfo && (
                                    <button onClick={() => setSelectedStall(null)} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
                                        <X size={14} /> Clear route
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
                                {/* Info Left Column */}
                                <div>
                                    <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 tracking-tight">{selectedStall.name}</h2>
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-3 mb-6 font-medium">
                                        <span>{selectedStall.category}</span> •
                                        <span className="flex items-center gap-1 text-amber-600 font-bold"><Star size={15} fill="currentColor" /> {selectedStall.rating}</span> •
                                        <span>{selectedStall.distance}</span>
                                    </div>

                                    <Card className="border-accent/40 bg-gradient-to-br from-white to-amber-50 mb-6 lg:mb-0">
                                        <div className="font-bold text-slate-800 mb-1 flex items-center gap-2 text-lg">Live AI Prediction</div>
                                        <div className="text-sm text-slate-600 mb-5">Real-time crowd intelligence based on weather, time, and history.</div>
                                        <div className="mb-5 relative h-32 rounded-lg overflow-hidden border border-slate-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]">
                                            <MapView stalls={[selectedStall]} selectedId={selectedStall.id} onSelectStall={() => { }} userLoc={userLoc} hasLocPermission={hasLocPermission} onRouteFound={setRouteInfo} />
                                            {routeInfo && (
                                                <div className="absolute top-2 right-2 z-[1000] bg-white text-brand-900 border border-brand-200 font-bold text-[11px] px-2.5 py-1 rounded shadow-md">
                                                    {routeInfo}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                                                {loadingPrediction && <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl z-10"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>}
                                                <div className="text-[11px] text-slate-500 mb-2 font-bold uppercase tracking-widest">Current Crowd</div>
                                                <CrowdBadge level={selectedStall.liveCrowd} />
                                                {selectedStall.source === 'crowd_votes' ? (
                                                    <div className="text-[10px] text-blue-600 mt-2 font-bold bg-blue-50 px-2 py-1 rounded inline-block">Based on {selectedStall.voteCount} live reports</div>
                                                ) : (
                                                    <div className="text-[10px] text-slate-400 mt-2 font-semibold">AI forecast</div>
                                                )}
                                            </div>
                                            <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                                                {loadingPrediction && <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl z-10"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>}
                                                <div className="text-[11px] text-slate-500 mb-2 font-bold uppercase tracking-widest">Est. Wait Time</div>
                                                <WaitBadge min={selectedStall.liveWait} />
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                {/* Forecast Right Column */}
                                <div className="space-y-6">
                                    <Card>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="font-bold text-slate-800 text-lg">Crowd Forecast</h3>
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold uppercase tracking-wider">AI Estimate</span>
                                        </div>
                                        <div className="h-40 w-full mb-2">
                                            {selectedStall.forecast && selectedStall.forecast.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={selectedStall.forecast} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorWait" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#2E7A6A" stopOpacity={0.4} />
                                                                <stop offset="95%" stopColor="#2E7A6A" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                                                        <Tooltip
                                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                            labelStyle={{ color: '#64748b', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}
                                                            itemStyle={{ color: '#1e293b', fontWeight: 600, fontSize: '14px' }}
                                                            formatter={(value) => [`${value} min wait`, 'Crowd Level']}
                                                        />
                                                        <Area type="monotone" dataKey="wait" stroke="#2E7A6A" strokeWidth={3} fillOpacity={1} fill="url(#colorWait)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                                                    {loadingPrediction ? <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div> : 'No forecast data'}
                                                </div>
                                            )}
                                        </div>
                                        {selectedStall.forecast && selectedStall.forecast.length > 0 && (() => {
                                            const best = selectedStall.forecast.reduce((min, f) => f.wait < min.wait ? f : min, selectedStall.forecast[0]);
                                            const peak = selectedStall.forecast.reduce((max, f) => f.wait > max.wait ? f : max, selectedStall.forecast[0]);
                                            return (
                                                <div className="mt-4 p-4 bg-brand-50 text-brand-900 rounded-xl text-sm border border-brand-100 flex gap-4 items-start shadow-inner">
                                                    <Navigation size={20} className="text-brand-500 shrink-0 mt-0.5" />
                                                    <p className="leading-relaxed"><b>Best time to visit:</b> Around {best.time} ({best.wait} min wait). Peak crowd expected at {peak.time} ({peak.wait} min wait).</p>
                                                </div>
                                            );
                                        })()}
                                    </Card>

                                    <Button onClick={() => setCheckInStall(selectedStall)} className="w-full py-4 text-base shadow-lg shadow-brand-500/20">
                                        <MapPin size={20} /> I'm here right now!
                                    </Button>
                                </div>
                            </div>
                        </div>

                    ) : activeTab === 'home' ? (
                        /* DASHBOARD / NEARBY */
                        <div className="animate-fadeUp">
                            <div className="flex flex-col md:flex-row gap-4 mb-8">
                                <div className="relative flex-1">
                                    <Search size={20} className="absolute left-4 top-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search stalls, food categories..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-white border border-slate-200 shadow-sm rounded-xl py-4 pt-3.5 pb-3.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-shadow"
                                    />
                                </div>
                                <div className="hidden md:flex gap-2">
                                    <Button variant={sortMode === 'nearby' ? 'primary' : 'secondary'} onClick={() => setSortMode(m => m === 'nearby' ? 'default' : 'nearby')} className="px-5">Nearby</Button>
                                    <Button variant={sortMode === 'wait' ? 'primary' : 'secondary'} onClick={() => setSortMode(m => m === 'wait' ? 'default' : 'wait')} className="px-5">Shortest Wait</Button>
                                </div>
                            </div>

                            {errorStalls && <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200">{errorStalls}</div>}
                            <div className="mb-8 relative h-[500px] sm:h-[600px]">
                                {loadingStalls && <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>}
                                <MapView stalls={stalls} selectedId={null} onSelectStall={onSelectStall} userLoc={userLoc} hasLocPermission={hasLocPermission} onRouteFound={setRouteInfo} />
                                {!hasLocPermission && (
                                    <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded shadow-sm text-amber-700">
                                        Enable location for directions
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Popular Stalls Near You</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative">
                                {loadingStalls && <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>}
                                {filteredStalls.length === 0 && !loadingStalls && (
                                    <div className="col-span-3 text-center py-12 text-slate-500">
                                        <Search size={40} className="mx-auto mb-3 text-slate-300" />
                                        <p className="font-semibold">No stalls match &quot;{searchQuery}&quot;</p>
                                    </div>
                                )}
                                {filteredStalls.map(stall => (
                                    <Card key={stall.id} className="cursor-pointer hover:border-brand-500 transition-all hover:shadow-md p-0 flex flex-col group overflow-hidden" >
                                        <div onClick={() => onSelectStall(stall)} className="p-5 flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-slate-800 text-lg md:text-xl group-hover:text-brand-600 transition-colors pr-2 leading-tight">{stall.name}</h3>
                                                <button
                                                    onClick={e => { e.stopPropagation(); toggleSave(stall); }}
                                                    className="p-1 rounded-full hover:bg-red-50 transition-colors shrink-0"
                                                    title={savedStalls.find(s => s.id === stall.id) ? 'Unsave' : 'Save'}
                                                >
                                                    <Heart size={16} fill={savedStalls.find(s => s.id === stall.id) ? 'red' : 'none'} className={savedStalls.find(s => s.id === stall.id) ? 'text-red-500' : 'text-slate-400'} />
                                                </button>
                                            </div>
                                            <p className="text-sm font-medium text-slate-500 mb-5">{stall.category} • {stall.distance}</p>

                                            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 mt-auto">
                                                <CrowdBadge level={stall.liveCrowd} />
                                                <WaitBadge min={stall.liveWait} />
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>

                    ) : activeTab === 'favorites' ? (
                        <div className="animate-fadeUp">
                            <h2 className="text-xl font-bold text-slate-800 mb-6">Saved Stalls</h2>
                            {savedStalls.length === 0 ? (
                                <div className="text-center pt-20 text-slate-500">
                                    <Heart size={56} className="mx-auto mb-6 text-slate-200" />
                                    <h3 className="text-xl font-bold text-slate-700 mb-2">No saved stalls yet</h3>
                                    <p className="text-sm max-w-sm mx-auto">Tap the ♥ heart on any stall card to save it here for quick access.</p>
                                    <Button onClick={() => navigate('home')} className="mt-6">Browse Stalls</Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {savedStalls.map(stall => (
                                        <Card key={stall.id} className="cursor-pointer hover:border-brand-500 transition-all hover:shadow-md p-0 flex flex-col group overflow-hidden">
                                            <div onClick={() => onSelectStall(stall)} className="p-5 flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-brand-600 transition-colors pr-2">{stall.name}</h3>
                                                    <button onClick={e => { e.stopPropagation(); toggleSave(stall); }} className="p-1 rounded-full hover:bg-red-50">
                                                        <Heart size={16} fill="red" className="text-red-500" />
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 mt-2">
                                                    <CrowdBadge level={stall.liveCrowd} />
                                                    <WaitBadge min={stall.liveWait} />
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="animate-fadeUp">
                            <h2 className="text-xl font-bold text-slate-800 mb-6">Crowd Alerts</h2>
                            {(() => {
                                const alertSource = savedStalls.length > 0 ? savedStalls : stalls;
                                const highAlerts = alertSource.filter(s => s.liveCrowd === 'High');
                                const mediumAlerts = alertSource.filter(s => s.liveCrowd === 'Medium');
                                const allAlerts = [...highAlerts, ...mediumAlerts];

                                if (allAlerts.length === 0) {
                                    return (
                                        <div className="text-center pt-20 text-slate-500">
                                            <Bell size={56} className="mx-auto mb-6 text-slate-200" />
                                            <h3 className="text-xl font-bold text-slate-700 mb-2">All clear! 🎉</h3>
                                            <p className="text-sm max-w-sm mx-auto">No high or medium crowd alerts right now. All stalls are at low crowd levels.</p>
                                            <Button onClick={() => navigate('home')} className="mt-6">Explore Stalls</Button>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-4">
                                        {highAlerts.length > 0 && (
                                            <div className="mb-2">
                                                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <AlertTriangle size={14} /> High Crowd ({highAlerts.length})
                                                </h3>
                                                {highAlerts.map(stall => (
                                                    <div key={stall.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4 mb-3">
                                                        <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 animate-pulse" />
                                                        <div className="flex-1">
                                                            <p className="font-bold text-red-800">{stall.name}</p>
                                                            <p className="text-sm text-red-600">HIGH crowd — est. {stall.liveWait ?? '?'} min wait</p>
                                                        </div>
                                                        <Button onClick={() => onSelectStall(stall)} className="text-xs py-2 px-3">View</Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {mediumAlerts.length > 0 && (
                                            <div className="mb-2">
                                                <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <Clock size={14} /> Medium Crowd ({mediumAlerts.length})
                                                </h3>
                                                {mediumAlerts.map(stall => (
                                                    <div key={stall.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4 mb-3">
                                                        <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                                                        <div className="flex-1">
                                                            <p className="font-bold text-amber-800">{stall.name}</p>
                                                            <p className="text-sm text-amber-700">MEDIUM crowd — est. {stall.liveWait ?? '?'} min wait</p>
                                                        </div>
                                                        <Button onClick={() => onSelectStall(stall)} className="text-xs py-2 px-3">View</Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* Customer Mobile Bottom Navigation (hidden on desktop) */}
            <nav className="md:hidden fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 px-6 py-3 flex justify-between items-center z-40 pb-5">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => navigate(item.id)} className={`flex flex-col items-center gap-1.5 transition-colors p-2 rounded-xl ${activeTab === item.id ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600'}`}>
                        <item.icon size={22} fill={activeTab === item.id ? "currentColor" : "none"} strokeWidth={activeTab === item.id ? 2 : 2.5} />
                        <span className="text-[10px] font-bold tracking-wide uppercase">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Check-In Modal Overlay - Responsive */}
            {checkInStall && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-6 animate-fadeUp">
                    <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl p-6 md:p-8 shadow-2xl relative animate-fadeUp">
                        <button onClick={() => setCheckInStall(null)} className="absolute top-4 right-4 text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>

                        <h3 className="text-2xl font-bold text-slate-800 pr-8 tracking-tight">Report Crowd</h3>
                        <p className="text-slate-500 text-sm mt-2 mb-8 leading-relaxed">Are you currently at <b className="text-slate-700">{checkInStall.name}</b>? Help others in the community by reporting what you see right now.</p>

                        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-4">
                            <button onClick={() => handleCheckInSubmit('Low')} className="bg-green-50 border-2 border-green-200 hover:border-green-500 hover:bg-green-100 rounded-xl p-4 md:p-5 flex flex-col items-center gap-3 transition-all active:scale-95 group">
                                <div className="w-5 h-5 rounded-full bg-green-500 shadow-sm group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-green-800 text-sm">Low</span>
                            </button>
                            <button onClick={() => handleCheckInSubmit('Medium')} className="bg-amber-50 border-2 border-amber-200 hover:border-amber-500 hover:bg-amber-100 rounded-xl p-4 md:p-5 flex flex-col items-center gap-3 transition-all active:scale-95 group">
                                <div className="w-5 h-5 rounded-full bg-amber-500 shadow-sm group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-amber-800 text-sm">Medium</span>
                            </button>
                            <button onClick={() => handleCheckInSubmit('High')} className="bg-red-50 border-2 border-red-200 hover:border-red-500 hover:bg-red-100 rounded-xl p-4 md:p-5 flex flex-col items-center gap-3 transition-all active:scale-95 group">
                                <div className="w-5 h-5 rounded-full bg-red-500 shadow-sm group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-red-800 text-sm">High</span>
                            </button>
                        </div>
                        <button onClick={() => setCheckInStall(null)} className="md:hidden w-full text-center py-4 text-sm font-semibold text-slate-500 mt-2">Cancel</button>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-[90%] md:w-auto md:min-w-[400px] bg-brand-900 border border-brand-800 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fadeUp">
                    <CheckCircle className="text-green-400 shrink-0" size={22} />
                    <span className="text-sm font-semibold tracking-wide">{toast}</span>
                </div>
            )}
            
            <VoiceAssistant user={user} />
        </div>
    );
}
