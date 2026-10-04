import React, { useState, useEffect } from 'react';
import { Store, TrendingUp, CloudRain, Bell, History, Target, Zap, Clock, Users, Mail, Settings, AlignLeft, User } from 'lucide-react';
import { Card, CrowdBadge, WaitBadge, Button, Badge, MOCK_STALLS } from './SharedComponents';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const FORECAST_DATA = [
    { time: '5 PM', act: 12, exp: 14 },
    { time: '6 PM', act: 35, exp: 30 },
    { time: '7 PM', act: 48, exp: 45 },
    { time: '8 PM', act: null, exp: 55 },
    { time: '9 PM', act: null, exp: 38 },
    { time: '10 PM', act: null, exp: 20 },
];

export default function VendorApp({ onLogout, user }) {
    const [activeTab, setActiveTab] = useState('home');
    const [vendorStall, setVendorStall] = useState(null);
    const [forecastData, setForecastData] = useState(FORECAST_DATA);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

    useEffect(() => {
        const fetchVendorData = async () => {
            try {
                setLoading(true);
                const sRes = await fetch(`${API_BASE}/stalls`);
                if (!sRes.ok) throw new Error("Failed to fetch stalls");
                const stalls = await sRes.json();
                const apiStall = stalls[0];
                const mockMatch = MOCK_STALLS.find(m => m.id === apiStall.id) || {};
                const myStall = { ...mockMatch, ...apiStall };

                const wRes = await fetch(`${API_BASE}/weather?lat=${myStall.lat}&lon=${myStall.lon}`);
                const wData = wRes.ok ? await wRes.json() : { condition: "Clear" };
                const now = new Date();

                // Fetch current prediction
                const pRes = await fetch(`${API_BASE}/predict?stall_id=${myStall.id}&hour=${now.getHours()}&day_of_week=${now.getDay()}&weather=${wData.condition}`);
                if (pRes.ok) {
                    const pData = await pRes.json();
                    myStall.liveCrowd = pData.crowd_level;
                    myStall.liveWait = pData.wait_minutes;
                }

                // Fetch 6-hour forecast by calling /predict for each upcoming hour
                const forecastArr = [];
                for (let i = 0; i < 6; i++) {
                    const fHour = (now.getHours() + i) % 24;
                    let fDay = now.getDay();
                    if (now.getHours() + i >= 24) {
                        fDay = (fDay + Math.floor((now.getHours() + i) / 24)) % 7;
                    }
                    try {
                        const fRes = await fetch(`${API_BASE}/predict?stall_id=${myStall.id}&hour=${fHour}&day_of_week=${fDay}&weather=${wData.condition}`);
                        if (fRes.ok) {
                            const fData = await fRes.json();
                            const h12 = fHour % 12 === 0 ? 12 : fHour % 12;
                            const ampm = fHour >= 12 ? 'PM' : 'AM';
                            
                            const isActual = fData.source === 'crowd_votes';
                            const expWait = isActual ? 
                                (fData.model_crowd_level === 'High' ? 16 : fData.model_crowd_level === 'Medium' ? 8 : 2) : 
                                fData.wait_minutes;

                            forecastArr.push({
                                time: `${h12} ${ampm}`,
                                act: isActual ? fData.wait_minutes : null,
                                exp: expWait
                            });
                        }
                    } catch (e) { }
                }
                if (forecastArr.length > 0) {
                    setForecastData(forecastArr);
                }
                setVendorStall(myStall);
                setError(null);
            } catch (err) {
                console.error(err);
                setVendorStall(MOCK_STALLS[0]);
                setError("Failed to fetch real data. Showing offline mock.");
            } finally {
                setLoading(false);
            }
        };
        fetchVendorData();
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <div className="space-y-6 animate-fadeUp relative">
                        {loading && <div className="absolute inset-0 z-10 bg-white/70 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>}
                        {error && <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm">{error}</div>}
                        {/* Alert Banner */}
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4">
                            <div className="bg-red-100 p-2 rounded-lg text-red-600 mt-1"><Target size={20} /></div>
                            <div>
                                <h3 className="font-bold text-red-800 text-lg mb-1">🔴 HIGH CROWD EXPECTED TODAY</h3>
                                <p className="text-red-700 text-sm mb-3">Peak period detected between <b>7 PM – 9 PM</b> due to clear weather and Friday patterns.</p>
                                <div className="inline-flex bg-white px-3 py-1.5 rounded-lg border border-red-100 text-sm font-semibold text-red-900">
                                    AI Recommendation: Prepare 30% additional stock by 6:30 PM.
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Quick Stats */}
                            {[
                                { icon: Users, label: "Current Status", val: vendorStall?.liveCrowd || "Medium", sub: "Live estimate" },
                                { icon: Clock, label: "Est. Wait Time", val: `${vendorStall?.liveWait || 15} min`, sub: "Currently updating" },
                                { icon: Zap, label: "Today's Reports", val: "48", sub: "Customer check-ins" },
                                { icon: CloudRain, label: "Weather", val: "Clear, 28°", sub: "Favorable conditions" },
                            ].map((stat, i) => (
                                <Card key={i} className="flex items-center gap-4">
                                    <div className="p-3 bg-brand-50 text-brand-600 rounded-xl"><stat.icon size={22} /></div>
                                    <div>
                                        <div className="text-2xl font-bold text-slate-800">{stat.val}</div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase">{stat.label}</div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-slate-800">Demand Forecast (Today)</h3>
                                    <Badge className="bg-slate-100 text-slate-600 border border-slate-200">Live Update</Badge>
                                </div>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={forecastData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Line type="monotone" dataKey="act" name="Actual Crowd" stroke="#0f172a" strokeWidth={3} dot={{ r: 4 }} />
                                            <Line type="monotone" dataKey="exp" name="AI Expected" stroke="#2E7A6A" strokeWidth={3} strokeDasharray="5 5" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            <div className="space-y-6">
                                <Card>
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><AlignLeft size={18} className="text-brand-500" /> Check-in Data</h3>
                                    <div className="text-4xl font-bold text-slate-800 mb-2">48 <span className="text-sm font-medium text-slate-500">total reports today</span></div>
                                    <div className="flex bg-slate-100 h-3 rounded-full overflow-hidden mb-3">
                                        <div className="bg-green-500 w-1/4"></div>
                                        <div className="bg-amber-500 w-[45%]"></div>
                                        <div className="bg-red-500 w-[30%]"></div>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                                        <div className="text-green-700">Low (12)</div>
                                        <div className="text-amber-700">Medium (22)</div>
                                        <div className="text-red-700">High (14)</div>
                                    </div>
                                </Card>

                                <Card className="bg-gradient-to-br from-brand-900 to-brand-800 text-white border-0">
                                    <h3 className="font-bold flex items-center gap-2 mb-3"><CloudRain size={18} className="text-accent" /> AI Weather Insight</h3>
                                    <p className="text-sm text-brand-100 mb-4">A moderate chance of rain is expected tomorrow evening (6 PM - 8 PM). Historically, this reduces foot traffic by 25% for your category.</p>
                                    <Button variant="secondary" className="w-full text-brand-900 font-bold border-0 hover:bg-white bg-brand-50">View Weekly Impact</Button>
                                </Card>
                            </div>
                        </div>
                    </div>
                );

            case 'settings':
                return (
                    <div className="max-w-2xl mx-auto animate-fadeUp space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Alerts & Notifications</h2>
                            <p className="text-slate-500">Configure how and when VendorVision notifies you. We operate a hybrid model so you don't need to monitor the dashboard actively.</p>
                        </div>

                        <Card className="border-l-4 border-l-brand-500">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Mail className="text-brand-500" /> Automated Email Alerts</h3>
                                    <p className="text-sm text-slate-500">Sent to murugan.dosa@example.com</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                                </label>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { label: "High Crowd Warnings", desc: "Alert when crowd level shifts to HIGH" },
                                    { label: "Peak-Hour Forecast", desc: "Sent 2 hrs before an expected peak begins" },
                                    { label: "Daily Summary", desc: "Morning email with today's expected traffic timeline" },
                                    { label: "Weather Shift Insights", desc: "Alert if unexpected weather will affect traffic" }
                                ].map((setting, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{setting.label}</div>
                                            <div className="text-xs text-slate-500">{setting.desc}</div>
                                        </div>
                                        <input type="checkbox" defaultChecked className="w-4 h-4 text-brand-500 accent-brand-500 cursor-pointer" />
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="opacity-60 bg-slate-50">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">WhatsApp / SMS Alerts <Badge className="bg-slate-200 text-slate-600 ml-2">Coming Soon</Badge></h3>
                                    <p className="text-sm text-slate-500 mt-1">Receive immediate push text messages. Requires Premium plan.</p>
                                </div>
                                <input type="checkbox" disabled className="w-4 h-4 cursor-not-allowed" />
                            </div>
                        </Card>

                        <Card className="bg-slate-800 text-white border-none">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Email Preview</div>
                            <div className="bg-white text-slate-800 rounded-lg p-5">
                                <div className="border-b border-slate-100 pb-3 mb-3">
                                    <div className="text-xs text-slate-500">From: VendorVision AI &lt;alerts@vendorvision.ai&gt;</div>
                                    <div className="font-bold mt-1 text-sm">Subject: 🔴 High Crowd Expected Today (7 PM Peak)</div>
                                </div>
                                <div className="text-sm space-y-3">
                                    <p>Hello Murugan Dosa Point,</p>
                                    <p>Our AI model predicts a <b>significant surge in customers today between 7 PM and 9 PM</b> due to clear weather.</p>
                                    <div className="bg-red-50 text-red-800 p-3 rounded-lg font-semibold">
                                        Recommendation: Prepare 30% extra batter/stock before 6:30 PM to optimize sales.
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-brand-900 text-white min-h-screen shadow-xl hidden md:flex flex-col sticky top-0 h-screen">
                <div className="p-6">
                    <div className="text-brand-100/60 text-[10px] font-bold tracking-widest uppercase mb-2 mt-2">Vendor Platform</div>
                    <h1 className="text-2xl font-serif font-bold">VendorVision <span className="text-accent">AI</span></h1>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {[
                        { id: 'home', icon: Store, label: 'Dashboard' },
                        { id: 'forecast', icon: TrendingUp, label: 'Demand Forecast' },
                        { id: 'settings', icon: Bell, label: 'Notification Settings' }
                    ].map(item => (
                        <button
                            key={item.id} onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${activeTab === item.id ? 'bg-brand-500 text-white shadow-lg' : 'text-brand-100/70 hover:bg-white/10 hover:text-white'}`}
                        >
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4">
                    <div className="bg-brand-800 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent text-brand-900 flex items-center justify-center font-bold text-lg">
                            {(user?.name || vendorStall?.name || 'V').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="text-sm font-bold truncate max-w-[120px]">{user?.name || vendorStall?.name || 'Vendor Profile'}</div>
                            <button onClick={onLogout} className="text-xs text-brand-100/60 hover:text-white text-left inline border-b border-brand-100/30 pb-0.5 mt-0.5">Logout</button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full relative">
                {/* Mobile Header (Hidden on Desktop) */}
                <header className="md:hidden flex justify-between items-center mb-6 bg-brand-900 px-5 pt-6 pb-4 rounded-b-3xl text-white shadow-md -mx-4 -mt-4">
                    <div>
                        <div className="text-brand-100/70 text-[10px] font-bold tracking-widest uppercase mb-1">Vendor Platform</div>
                        <h1 className="font-serif font-bold text-xl">VendorVision <span className="text-accent">AI</span></h1>
                    </div>

                    <div className="relative group">
                        <button className="p-2 bg-brand-600 rounded-full focus:outline-none"><AlignLeft size={20} /></button>
                        <div className="absolute right-0 mt-2 w-48 bg-white text-slate-800 rounded-xl shadow-xl flex flex-col overflow-hidden opacity-0 invisible group-hover:opacity-100 group-focus-within:opacity-100 group-hover:visible group-focus-within:visible transition-all z-50 origin-top-right">
                            {[
                                { id: 'home', icon: Store, label: 'Dashboard' },
                                { id: 'forecast', icon: TrendingUp, label: 'Demand Forecast' },
                                { id: 'settings', icon: Bell, label: 'Settings' }
                            ].map(item => (
                                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-3 px-4 py-3 text-sm font-bold text-left transition-colors ${activeTab === item.id ? 'bg-brand-50 text-brand-600' : 'hover:bg-slate-50'}`}>
                                    <item.icon size={16} /> {item.label}
                                </button>
                            ))}
                            <div className="h-px bg-slate-100"></div>
                            <button onClick={onLogout} className="px-4 py-3 text-sm font-bold text-red-600 text-left hover:bg-red-50">Logout</button>
                        </div>
                    </div>
                </header>

                <div className="max-w-6xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}
