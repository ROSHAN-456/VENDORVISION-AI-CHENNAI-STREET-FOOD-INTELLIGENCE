import React, { useState, useEffect } from 'react';
import { Users, Store, ShieldAlert, BarChart3, Settings, AlignLeft, ChevronDown, Bell } from 'lucide-react';
import { Card, Button, Badge } from './SharedComponents';
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminApp({ onLogout, user }) {
    const [activeView, setActiveView] = useState('overview');
    const [menuOpen, setMenuOpen] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedStall, setExpandedStall] = useState(null);
    const [expandedUser, setExpandedUser] = useState(null);
    const [roleFilter, setRoleFilter] = useState('all');

    // Live stall predictions cache
    const [stallPredictions, setStallPredictions] = useState({});

    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/everything`);
            if (!res.ok) throw new Error("Failed to fetch dashboard data");
            const finalData = await res.json();
            setData(finalData);
            setError(null);

            // Background fetch predictions for all stalls
            if (finalData.stalls) {
                const now = new Date();
                finalData.stalls.forEach(async s => {
                    try {
                        const pRes = await fetch(`${API_BASE}/predict?stall_id=${s.id}&hour=${now.getHours()}&day_of_week=${now.getDay()}&weather=Clear`);
                        if (pRes.ok) {
                            const pData = await pRes.json();
                            setStallPredictions(prev => ({ ...prev, [s.id]: pData }));
                        }
                    } catch (e) { }
                });
            }
        } catch (err) {
            console.error(err);
            setError("Partial systems outage. Some data may be unavailable.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const intervalId = setInterval(fetchStats, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const navItems = [
        { id: 'overview', icon: BarChart3, label: 'Platform Overview' },
        { id: 'stalls', icon: Store, label: 'Manage Stalls' },
        { id: 'users', icon: Users, label: 'Users & Roles' },
        { id: 'data', icon: ShieldAlert, label: 'Data Quality' },
        { id: 'config', icon: Settings, label: 'System Config' }
    ];

    const generateTrendData = () => {
        if (!data) return [];
        // Group by day for last 7 days
        const days = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days[d.toISOString().split('T')[0]] = 0;
        }
        data.checkins.forEach(c => {
            const dateStr = c.timestamp.split('T')[0];
            if (days[dateStr] !== undefined) days[dateStr]++;
        });
        return Object.keys(days).map(date => ({ date, count: days[date] }));
    };

    const generatePieData = () => {
        if (!data) return [];
        let l = 0, m = 0, h = 0;
        data.checkins.forEach(c => {
            if (c.reported_crowd_level === 'Low') l++;
            if (c.reported_crowd_level === 'Medium') m++;
            if (c.reported_crowd_level === 'High') h++;
        });
        return [
            { name: 'Low', value: l, color: '#22c55e' },
            { name: 'Medium', value: m, color: '#f59e0b' },
            { name: 'High', value: h, color: '#ef4444' }
        ];
    };

    const generateHourlyData = () => {
        if (!data) return [];
        const hours = Array(24).fill(0);
        data.checkins.forEach(c => {
            const dt = new Date(c.timestamp);
            hours[dt.getHours()]++;
        });
        return hours.map((count, hr) => ({ hour: `${hr}:00`, count }));
    };

    const getActiveStall = (type) => {
        if (!data || data.checkins.length === 0) return "N/A";
        const counts = {};
        data.checkins.forEach(c => counts[c.stall_id] = (counts[c.stall_id] || 0) + 1);
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return "N/A";
        const targetId = type === 'most' ? sorted[0][0] : sorted[sorted.length - 1][0];
        const stall = data.stalls.find(s => s.id === targetId);
        return stall ? stall.name : targetId;
    };

    const featureImportanceData = [
        { name: 'hour', value: 0.65 },
        { name: 'stall_enc', value: 0.15 },
        { name: 'weather_enc', value: 0.15 },
        { name: 'is_weekend', value: 0.05 }
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    const filteredUsers = data?.users.filter(u => roleFilter === 'all' || u.role === roleFilter) || [];

    const handleNotifyAll = async () => {
        if (window.confirm("Trigger notifications to all vendors now?")) {
            await fetch(`${API_BASE}/notify-all`, { method: 'POST' });
            fetchStats();
        }
    };

    const handleNotifyVendor = async (stall_id) => {
        await fetch(`${API_BASE}/notify-vendor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stall_id })
        });
        alert(`Notification sent for ${stall_id}!`);
        fetchStats();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col sticky top-0 h-screen shadow-xl z-20">
                <div className="p-6">
                    <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2 mt-2">Admin Portal</div>
                    <h1 className="text-xl font-serif font-bold">VendorVision <span className="text-accent">AI</span></h1>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                            {(user?.name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="text-sm font-semibold truncate text-slate-300">{user?.name || 'Administrator'}</div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.map((item, i) => (
                        <button key={item.id} onClick={() => setActiveView(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${activeView === item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-slate-800">
                    <button onClick={onLogout} className="text-sm font-bold text-slate-400 hover:text-white w-full text-left flex items-center gap-2">← Secure Logout</button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto w-full relative min-h-screen p-4 md:p-8">
                <header className="md:hidden flex justify-between items-center mb-6 bg-slate-900 px-5 pt-6 pb-4 rounded-b-3xl text-white shadow-md -mx-4 -mt-4">
                    <div>
                        <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">Admin Portal</div>
                        <h1 className="font-serif font-bold text-xl">VendorVision <span className="text-accent">AI</span></h1>
                    </div>
                    <div className="relative group">
                        <button className="p-2 bg-slate-800 rounded-full focus:outline-none"><AlignLeft size={20} /></button>
                        <div className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-xl shadow-xl flex flex-col overflow-hidden opacity-0 invisible group-hover:opacity-100 group-focus-within:opacity-100 group-hover:visible group-focus-within:visible transition-all z-50 origin-top-right">
                            {navItems.map(item => (
                                <button key={item.id} onClick={() => { setActiveView(item.id); setMenuOpen(false); }} className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-left transition-colors ${activeView === item.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`}>
                                    <item.icon size={16} /> {item.label}
                                </button>
                            ))}
                            <div className="h-px bg-slate-100 mt-1"></div>
                            <button onClick={onLogout} className="px-4 py-3 text-sm font-bold text-red-600 text-left hover:bg-red-50">Secure Logout</button>
                        </div>
                    </div>
                </header>

                <div className="max-w-7xl mx-auto animate-fadeUp relative">
                    {loading && !data && <div className="absolute inset-0 z-10 bg-white/50 flex flex-col items-center justify-center rounded-xl"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="mt-2 text-indigo-700 font-bold">Loading Live Stats...</p></div>}
                    {error && <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm font-semibold">{error}</div>}

                    {data && activeView === 'overview' && (
                        <>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6 tracking-tight">Platform Overview</h2>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                                {[
                                    { label: "Total Users", val: data.metrics.users_count },
                                    { label: "Active Vendors", val: data.stalls.length },
                                    { label: "Total Check-ins", val: data.metrics.checkins_count },
                                    { label: "Vendor Notifs", val: data.metrics.actions_count }
                                ].map((stat, i) => (
                                    <Card key={i} className="border-t-4 border-t-indigo-600 shadow-sm py-5">
                                        <div className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wide">{stat.label}</div>
                                        <div className="text-3xl font-bold text-slate-800">{stat.val}</div>
                                    </Card>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                {/* Check-ins 7 day trend */}
                                <Card className="shadow-sm lg:col-span-2">
                                    <h3 className="font-bold text-slate-800 mb-5 text-sm uppercase tracking-wide">7-Day Check-in Trend</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={generateTrendData()}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={val => val.slice(5)} />
                                                <YAxis tick={{ fontSize: 10 }} />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Crowd Donut & Highlights */}
                                <Card className="shadow-sm flex flex-col items-center justify-center">
                                    <h3 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide w-full text-left">Crowd Distribution</h3>
                                    <div className="h-40 w-full mb-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={generatePieData()} innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                                                    {generatePieData().map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="w-full space-y-2 mt-auto">
                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between">
                                            <span className="text-xs text-slate-500 font-bold">Most Active</span>
                                            <span className="text-xs font-bold text-slate-800 truncate pl-4">{getActiveStall('most')}</span>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between">
                                            <span className="text-xs text-slate-500 font-bold">Quietest</span>
                                            <span className="text-xs font-bold text-slate-800 truncate pl-4">{getActiveStall('least')}</span>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Peak Hours */}
                                <Card className="shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-5 text-sm uppercase tracking-wide">Peak Hours (All Check-ins)</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={generateHourlyData()}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                                                <YAxis tick={{ fontSize: 10 }} />
                                                <Tooltip />
                                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Activity Feed */}
                                <Card className="shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-5 text-sm uppercase tracking-wide flex items-center gap-2">
                                        <AlignLeft size={16} className="text-indigo-600" /> Live Activity Feed (Top 10)
                                    </h3>
                                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                                        {data.activity_feed.slice(0, 10).map((a, i) => (
                                            <div key={i} className="flex gap-3 text-sm border-b border-slate-50 pb-3">
                                                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-indigo-500"></div>
                                                <div>
                                                    <p className="text-slate-800 font-medium">
                                                        <span className="font-bold">{a.stall_id}</span> • {a.event_type} {a.detail ? `(${a.detail})` : ''}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{new Date(a.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </>
                    )}

                    {data && activeView === 'stalls' && (
                        <>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6 tracking-tight">Manage Stalls</h2>
                            <Card className="shadow-sm p-0 overflow-hidden">
                                <div className="overflow-x-auto p-6">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead>
                                            <tr className="text-slate-400 border-b border-slate-200">
                                                <th className="font-semibold pb-3 pr-4">Name</th>
                                                <th className="font-semibold pb-3 pr-4">Area</th>
                                                <th className="font-semibold pb-3 pr-4 cursor-pointer hover:text-slate-700">Today's Checkins ↕</th>
                                                <th className="font-semibold pb-3 pr-4 cursor-pointer hover:text-slate-700">Wait Time ↕</th>
                                                <th className="font-semibold pb-3 pr-4">Predicted Crowd</th>
                                                <th className="font-semibold pb-3 pr-4">Assigned Email</th>
                                                <th className="font-semibold pb-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {data.stalls
                                                .map(s => {
                                                    s.todayChecks = data.checkins.filter(c => c.stall_id === s.id && c.timestamp.startsWith(todayStr)).length;
                                                    s.liveWait = stallPredictions[s.id]?.wait_minutes || 0;
                                                    s.liveCrowd = stallPredictions[s.id]?.crowd_level || "Loading...";
                                                    return s;
                                                })
                                                .sort((a, b) => b.todayChecks - a.todayChecks)
                                                .map((s, i) => (
                                                    <React.Fragment key={i}>
                                                        <tr className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setExpandedStall(expandedStall === s.id ? null : s.id)}>
                                                            <td className="py-4 pr-4 font-bold text-slate-800">{s.name} <span className="text-xs text-slate-400 font-normal ml-1">({s.id})</span></td>
                                                            <td className="py-4 pr-4 text-slate-500">{s.area}</td>
                                                            <td className="py-4 pr-4 font-bold text-indigo-600">{s.todayChecks}</td>
                                                            <td className="py-4 pr-4 font-bold text-amber-600">{s.liveWait} min</td>
                                                            <td className="py-4 pr-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">{s.liveCrowd}</span></td>
                                                            <td className="py-4 pr-4 text-slate-500 text-xs">{s.vendor_email}</td>
                                                            <td className="py-4 text-slate-400"><ChevronDown size={18} className={`transform transition-transform ${expandedStall === s.id ? 'rotate-180' : ''}`} /></td>
                                                        </tr>
                                                        {expandedStall === s.id && (
                                                            <tr className="bg-slate-50 shadow-inner">
                                                                <td colSpan="7" className="p-6">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                        <div>
                                                                            <h4 className="font-bold text-sm mb-3">Last 10 Check-ins</h4>
                                                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                                                {data.checkins.filter(c => c.stall_id === s.id).slice(0, 10).map((c, j) => (
                                                                                    <div key={j} className="text-xs bg-white p-2 rounded border border-slate-100 flex justify-between">
                                                                                        <span className="font-bold">{c.reported_crowd_level} Crowd</span>
                                                                                        <span className="text-slate-400">{new Date(c.timestamp).toLocaleString()}</span>
                                                                                    </div>
                                                                                ))}
                                                                                {data.checkins.filter(c => c.stall_id === s.id).length === 0 && <p className="text-xs text-slate-400">No check-ins yet.</p>}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col items-start justify-center p-6 bg-white rounded-xl border border-slate-100">
                                                                            <h4 className="font-bold text-sm mb-2">Vendor Actions</h4>
                                                                            <p className="text-xs text-slate-500 mb-4">You can manually trigger an alert email to {s.vendor_email} right now to test the delivery pipeline.</p>
                                                                            <Button onClick={() => handleNotifyVendor(s.id)} className="w-full text-sm bg-indigo-600 hover:bg-indigo-700">Send Test Notification</Button>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </>
                    )}

                    {data && activeView === 'users' && (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Users & Roles</h2>
                                <div className="flex gap-2">
                                    {['all', 'customer', 'vendor', 'admin'].map(r => {
                                        const count = r === 'all' ? data.users.length : data.users.filter(u => u.role === r).length;
                                        return (
                                            <button key={r} onClick={() => setRoleFilter(r)} className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition-colors ${roleFilter === r ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                                                {r} ({count})
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <Card className="shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead>
                                            <tr className="text-slate-400 border-b border-slate-100">
                                                <th className="font-semibold pb-3 pr-4">Name</th>
                                                <th className="font-semibold pb-3 pr-4">Email</th>
                                                <th className="font-semibold pb-3 pr-4">Role</th>
                                                <th className="font-semibold pb-3 pr-4">Joined</th>
                                                <th className="font-semibold pb-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredUsers.map((u, i) => (
                                                <React.Fragment key={i}>
                                                    <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}>
                                                        <td className="py-4 pr-4 font-bold text-slate-800">{u.name || 'Unknown'}</td>
                                                        <td className="py-4 pr-4 text-slate-500">{u.email}</td>
                                                        <td className="py-4 pr-4">
                                                            <span className={`capitalize px-2.5 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'vendor' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                {u.role}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 pr-4 text-slate-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                                                        <td className="py-4 text-slate-400"><ChevronDown size={18} className={`transform transition-transform ${expandedUser === u.id ? 'rotate-180' : ''}`} /></td>
                                                    </tr>
                                                    {expandedUser === u.id && (
                                                        <tr className="bg-slate-50">
                                                            <td colSpan="5" className="p-6">
                                                                <h4 className="font-bold text-sm mb-3">User Activity History</h4>
                                                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                                                    {(() => {
                                                                        const filtered = data.activity_feed.filter(a => a.detail?.includes(u.email));
                                                                        if (filtered.length === 0) return <p className="text-xs text-slate-400 mt-2">No activity yet</p>;
                                                                        return filtered.slice(0, 5).map((a, j) => (
                                                                            <div key={j} className="text-xs bg-white p-2 rounded border border-slate-100 flex justify-between">
                                                                                <span><span className="font-bold">{a.stall_id}</span> - {a.event_type}</span>
                                                                                <span className="text-slate-400">{new Date(a.timestamp).toLocaleString()}</span>
                                                                            </div>
                                                                        ));
                                                                    })()}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </>
                    )}

                    {data && activeView === 'data' && (
                        <>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6 tracking-tight">Data Quality</h2>

                            {/* Distribution & Badges */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <Card className="shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-5 text-sm uppercase tracking-wide">Historical Crowd Distribution</h3>
                                    <div className="space-y-4">
                                        {generatePieData().map((slice, i) => {
                                            const total = data.checkins.length || 1;
                                            const pct = Math.round((slice.value / total) * 100);
                                            return (
                                                <div key={i}>
                                                    <div className="flex justify-between text-sm font-semibold mb-1">
                                                        <span>{slice.name}</span>
                                                        <span>{slice.value} records ({pct}%)</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: slice.color }}></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </Card>

                                <Card className="shadow-sm flex flex-col justify-center gap-4">
                                    <div className="flex items-start gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                        <div className="bg-indigo-600 text-white p-2 rounded-lg"><ShieldAlert size={20} /></div>
                                        <div>
                                            <h4 className="font-bold text-indigo-900 mb-1">Model Trained on Synthetic Data</h4>
                                            <p className="text-xs text-indigo-700">The current machine learning core has been instantiated using synthetic augmentation mappings mimicking live deployments.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                                        <span className="text-sm font-bold text-slate-600">Model Last Retrained:</span>
                                        <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full">{new Date(data.metrics.model_last_retrained * 1000).toLocaleString()}</span>
                                    </div>
                                </Card>
                            </div>

                            <Card className="shadow-sm max-w-4xl">
                                <h3 className="font-bold text-slate-800 mb-5 text-sm uppercase tracking-wide">RandomForest Feature Importance</h3>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={featureImportanceData} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                            <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 1]} />
                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fontWeight: 'bold' }} width={100} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={30} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </>
                    )}

                    {data && activeView === 'config' && (
                        <>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6 tracking-tight">System Config</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-5 text-sm uppercase tracking-wide flex items-center gap-2"><Settings size={18} /> Backend Telemetry</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                            <span className="text-sm font-semibold text-slate-600">Server Uptime</span>
                                            <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-md text-xs">{Math.floor(data.metrics.uptime_seconds / 60)} minutes</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                            <span className="text-sm font-semibold text-slate-600">Scheduler</span>
                                            <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-md text-xs">{data.metrics.next_schedule}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                            <span className="text-sm font-semibold text-slate-600">SQLite Log Size</span>
                                            <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-md text-xs">{(data.metrics.checkins_count + data.metrics.actions_count + data.metrics.users_count)} records</span>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="shadow-sm bg-indigo-900 text-white border-0">
                                    <h3 className="font-bold text-indigo-100 mb-3 text-sm uppercase tracking-wide flex items-center gap-2"><Bell size={18} /> Global Notifications</h3>
                                    <p className="text-indigo-200 text-sm mb-6 leading-relaxed">Instantly force the APScheduler batch job to execute immediately. This will send wait time forecasting emails to all fully-registered vendors in the system based on live data.</p>
                                    <Button onClick={handleNotifyAll} className="w-full bg-white text-indigo-900 hover:bg-slate-100 font-bold border-0 shadow-lg">Trigger All Notifications Now</Button>
                                </Card>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
