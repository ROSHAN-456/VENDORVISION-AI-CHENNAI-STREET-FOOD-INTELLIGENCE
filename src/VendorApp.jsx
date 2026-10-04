import React, { useState, useEffect } from 'react';
import { Store, TrendingUp, CloudRain, Bell, History, Target, Zap, Clock, Users, Mail, Settings, AlignLeft, User, X } from 'lucide-react';
import { Card, CrowdBadge, WaitBadge, Button, Badge, MOCK_STALLS } from './SharedComponents';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

class VendorErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-200 animate-fadeUp mt-8 max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold text-red-700 mb-2">Something went wrong</h2>
                    <p className="text-red-600 mb-4">{this.state.error?.message || "Unknown rendering error"}</p>
                    <button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold">Reload Dashboard</button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function VendorApp({ onLogout, user }) {
    const [activeTab, setActiveTab] = useState('home');
    const [vendorStall, setVendorStall] = useState(null);
    const [weatherData, setWeatherData] = useState({ weather: "Clear" });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dashboard state
    const [dashData, setDashData] = useState({ checkins: null, remainderForecast: [] });
    
    // Detailed forecast state
    const [forecastData, setForecastData] = useState({ hourly: [], bestTimes: null, weatherScenarios: [], summary: null });
    const [forecastLoading, setForecastLoading] = useState(false);
    const [forecastError, setForecastError] = useState(null);

    // Weekly impact state
    const [weeklyImpactOpen, setWeeklyImpactOpen] = useState(false);
    const [weeklyImpactData, setWeeklyImpactData] = useState({ data: [], loading: false, error: null });

    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

    const fetchForecast = async (stall, weather) => {
        setForecastLoading(true);
        setForecastError(null);
        try {
            const now = new Date();
            const hourly = [];
            let totalFootfall = 0;
            let totalWait = 0;
            let highCount = 0;

            for (let i = 10; i <= 22; i++) {
                const fHour = i;
                let fDay = now.getDay();
                
                const url = `${API_BASE}/predict?stall_id=${stall.id}&hour=${fHour}&day_of_week=${fDay}&weather=${weather.weather}`;
                const fRes = await fetch(url);
                if (!fRes.ok) throw new Error(`HTTP ${fRes.status} for ${fHour}:00`);
                const fData = await fRes.json();
                
                const h12 = fHour % 12 === 0 ? 12 : fHour % 12;
                const ampm = fHour >= 12 ? 'PM' : 'AM';
                const timeLabel = `${h12} ${ampm}`;
                
                const isActual = fData.source === 'crowd_votes';
                const isCurrent = fHour === now.getHours();
                
                let actualCrowd = null;
                let actualWait = null;
                if (isActual) {
                    actualCrowd = fData.crowd_level;
                    actualWait = fData.wait_minutes;
                }

                let suggestedAction = "Normal";
                if (fData.model_crowd_level === 'High') {
                    suggestedAction = "Prepare extra stock";
                    highCount++;
                } else if (fData.model_crowd_level === 'Low') {
                    suggestedAction = "Good time to restock/rest";
                }

                totalFootfall += fData.footfall;
                totalWait += (actualWait !== null ? actualWait : fData.wait_minutes);

                hourly.push({
                    hourRaw: fHour,
                    time: timeLabel,
                    footfall: fData.footfall,
                    model_crowd: fData.model_crowd_level,
                    model_wait: fData.wait_minutes,
                    actFootfall: isActual ? fData.footfall : null, 
                    isActual,
                    voteCount: fData.vote_count,
                    suggestedAction,
                    isCurrent,
                    displayCrowd: actualCrowd || fData.model_crowd_level,
                    displayWait: actualWait !== null ? actualWait : fData.wait_minutes,
                });
            }

            // Best times (sort by footfall)
            const sortedByFootfall = [...hourly].sort((a, b) => a.footfall - b.footfall);
            const quietest = sortedByFootfall.slice(0, 3);
            const busiest = sortedByFootfall.slice(-3).reverse();
            const peakHour = busiest[0];
            const quietestHourObj = quietest[0];

            const summary = {
                peakTime: peakHour?.time,
                peakFootfall: peakHour?.footfall,
                quietTime: quietestHourObj?.time,
                totalCustomers: Math.round(totalFootfall),
                avgWait: Math.round(totalWait / hourly.length),
                highHours: highCount
            };

            // Weather scenarios for the NEXT peak hour (or current if it's the peak, or just the peakHour)
            // The prompt says "next peak hour", we'll just use peakHour for simplicity or find the next high hour.
            const nextPeak = hourly.find(h => h.hourRaw >= now.getHours() && h.model_crowd === 'High') || peakHour;
            const scenarios = [];
            if (nextPeak) {
                const weathers = ['Clear', 'Cloudy', 'Hot', 'Rain'];
                for (const w of weathers) {
                    const url = `${API_BASE}/predict?stall_id=${stall.id}&hour=${nextPeak.hourRaw}&day_of_week=${now.getDay()}&weather=${w}`;
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        const pctChange = ((data.footfall / nextPeak.footfall) - 1) * 100;
                        scenarios.push({ weather: w, footfall: data.footfall, pctChange: Math.round(pctChange), hour: nextPeak.time, currentHourRaw: nextPeak.hourRaw });
                    }
                }
            }

            setForecastData({ hourly, bestTimes: { quietest, busiest }, weatherScenarios: scenarios, summary });
        } catch (err) {
            console.error(err);
            setForecastError(err.message || "Failed to load forecast data");
        } finally {
            setForecastLoading(false);
        }
    };

    const fetchWeeklyData = async (stall) => {
        setWeeklyImpactData({ data: [], loading: true, error: null });
        setWeeklyImpactOpen(true);
        try {
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const results = [];
            let maxDrop = 0;
            let worstDay = "";
            let bestDay = "";
            let minDrop = -1000;

            for (let d = 0; d < 7; d++) {
                // Mon to Sun? 1 to 7? JS getDay is 0 (Sun) to 6 (Sat)
                // Let's just do 0 to 6
                let dayTotalClear = 0;
                let dayTotalRain = 0;
                for (const hr of [13, 20]) {
                    const cRes = await fetch(`${API_BASE}/predict?stall_id=${stall.id}&hour=${hr}&day_of_week=${d}&weather=Clear`);
                    if (cRes.ok) dayTotalClear += (await cRes.json()).footfall;
                    const rRes = await fetch(`${API_BASE}/predict?stall_id=${stall.id}&hour=${hr}&day_of_week=${d}&weather=Rain`);
                    if (rRes.ok) dayTotalRain += (await rRes.json()).footfall;
                }
                const drop = ((dayTotalClear - dayTotalRain) / dayTotalClear) * 100;
                results.push({ day: days[d], clear: Math.round(dayTotalClear), rain: Math.round(dayTotalRain), dropPct: Math.round(drop) });
                
                if (drop > maxDrop) { maxDrop = drop; worstDay = days[d]; }
                if (drop < minDrop || minDrop === -1000) { minDrop = drop; bestDay = days[d]; }
            }
            
            // sort results from Mon to Sun
            const ordered = [results[1], results[2], results[3], results[4], results[5], results[6], results[0]];
            setWeeklyImpactData({ data: ordered, worstDay, bestDay, maxDrop: Math.round(maxDrop), loading: false, error: null });
        } catch (e) {
            setWeeklyImpactData(prev => ({ ...prev, loading: false, error: e.message }));
        }
    };

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setLoading(true);
                const sRes = await fetch(`${API_BASE}/stalls`);
                if (!sRes.ok) throw new Error("Failed to fetch stalls");
                const stalls = await sRes.json();
                const myStall = stalls[0];

                const wRes = await fetch(`${API_BASE}/weather?lat=${myStall.lat}&lon=${myStall.lon}`);
                const wData = wRes.ok ? await wRes.json() : { weather: "Clear" };
                setWeatherData(wData);

                const now = new Date();
                const pRes = await fetch(`${API_BASE}/predict?stall_id=${myStall.id}&hour=${now.getHours()}&day_of_week=${now.getDay()}&weather=${wData.weather}`);
                if (pRes.ok) {
                    const pData = await pRes.json();
                    myStall.liveCrowd = pData.crowd_level;
                    myStall.liveWait = pData.wait_minutes;
                }
                setVendorStall(myStall);

                // Fetch checkin summary
                let checkins = { total: 0, counts: { Low: 0, Medium: 0, High: 0 } };
                try {
                    const cRes = await fetch(`${API_BASE}/stalls/${myStall.id}/checkin-summary`);
                    if (cRes.ok) checkins = await cRes.json();
                } catch(e) {}

                // Remainder forecast
                const remainder = [];
                let totalRemainderFootfall = 0;
                for (let h = now.getHours(); h <= 23; h++) {
                    try {
                        const r = await fetch(`${API_BASE}/predict?stall_id=${myStall.id}&hour=${h}&day_of_week=${now.getDay()}&weather=${wData.weather}`);
                        if (r.ok) {
                            const d = await r.json();
                            remainder.push({ hour: h, footfall: d.footfall, crowd: d.model_crowd_level });
                            totalRemainderFootfall += d.footfall;
                        }
                    } catch(e) {}
                }
                
                setDashData({ checkins, remainderForecast: remainder, totalRemainderFootfall });
                setError(null);
                
                // Fire forecast fetch independently so UI can load tab
                if (activeTab === 'forecast' || true) {
                    fetchForecast(myStall, wData);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch real data.");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    // Effect for changing tab to forecast
    useEffect(() => {
        if (activeTab === 'forecast' && forecastData.hourly.length === 0 && vendorStall && !forecastLoading) {
            fetchForecast(vendorStall, weatherData);
        }
    }, [activeTab]);

    const renderForecastTab = () => {
        if (forecastLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-slate-500 font-bold">Loading comprehensive forecast...</div>
                </div>
            );
        }
        if (forecastError) {
            return (
                <div className="bg-red-50 border border-red-200 p-8 rounded-xl text-center">
                    <h3 className="text-red-700 font-bold text-xl mb-2">Failed to load forecast data</h3>
                    <p className="text-red-600 mb-6">{forecastError}</p>
                    <Button onClick={() => fetchForecast(vendorStall, weatherData)} className="bg-red-600 hover:bg-red-700 text-white">Retry</Button>
                </div>
            );
        }

        const { hourly, summary, bestTimes, weatherScenarios } = forecastData;
        if (!hourly || hourly.length === 0) return null;

        const rainScenario = weatherScenarios.find(s => s.weather === 'Rain');
        const clearScenario = weatherScenarios.find(s => s.weather === 'Clear');
        const rainImpact = (clearScenario && rainScenario) ? clearScenario.footfall - rainScenario.footfall : 0;
        const rainDropPct = rainScenario?.pctChange || 0;

        return (
            <div className="space-y-6 animate-fadeUp relative">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Demand Forecast</h2>
                        <p className="text-slate-500">Detailed hourly prediction from 10 AM to 10 PM.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="bg-brand-50 border-brand-100"><div className="text-xs font-bold text-brand-600 uppercase mb-1">Peak Hour</div><div className="text-xl font-bold">{summary?.peakTime}</div><div className="text-xs text-brand-500">{Math.round(summary?.peakFootfall || 0)} footfall</div></Card>
                    <Card><div className="text-xs font-bold text-slate-500 uppercase mb-1">Quietest Hour</div><div className="text-xl font-bold">{summary?.quietTime}</div></Card>
                    <Card><div className="text-xs font-bold text-slate-500 uppercase mb-1">Total Expected</div><div className="text-xl font-bold">{summary?.totalCustomers}</div></Card>
                    <Card><div className="text-xs font-bold text-slate-500 uppercase mb-1">Avg Wait</div><div className="text-xl font-bold">{summary?.avgWait} min</div></Card>
                    <Card><div className="text-xs font-bold text-slate-500 uppercase mb-1">High Crowd Hours</div><div className="text-xl font-bold text-red-600">{summary?.highHours}</div></Card>
                </div>

                <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800">Hourly Footfall Forecast</h3>
                        <Badge className="bg-slate-100 text-slate-600 border border-slate-200">Live AI Data</Badge>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={hourly}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line type="monotone" dataKey="footfall" name="Expected Footfall" stroke="#2E7A6A" strokeWidth={3} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="actFootfall" name="Live Check-ins (Actual)" stroke="#0f172a" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-xs text-slate-400 mt-4 text-center">Current hour is updated with real user check-in data if available.</div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="overflow-hidden">
                            <h3 className="font-bold text-slate-800 mb-4">Hourly Breakdown</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
                                        <tr>
                                            <th className="px-4 py-3">Hour</th>
                                            <th className="px-4 py-3">Footfall</th>
                                            <th className="px-4 py-3">Crowd</th>
                                            <th className="px-4 py-3">Wait</th>
                                            <th className="px-4 py-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {hourly.map((h, i) => (
                                            <tr key={i} className={h.isCurrent ? "bg-blue-50/50" : ""}>
                                                <td className="px-4 py-3 font-semibold flex items-center gap-2">
                                                    {h.time}
                                                    {h.isCurrent && <Badge className="bg-blue-100 text-blue-700 py-0 text-[10px]">NOW</Badge>}
                                                </td>
                                                <td className="px-4 py-3">{Math.round(h.footfall)}</td>
                                                <td className="px-4 py-3"><CrowdBadge level={h.displayCrowd} /></td>
                                                <td className="px-4 py-3"><WaitBadge minutes={h.displayWait} /></td>
                                                <td className="px-4 py-3 text-slate-600">{h.suggestedAction}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                    <div className="space-y-6">
                        <Card>
                            <h3 className="font-bold text-slate-800 mb-4">Best Times</h3>
                            <div className="mb-4">
                                <div className="text-xs font-bold text-green-700 uppercase mb-2">Quietest (Rest/Restock)</div>
                                <div className="flex flex-wrap gap-2">
                                    {bestTimes?.quietest.map(h => <Badge key={h.time} className="bg-green-50 text-green-700 border border-green-200">{h.time}</Badge>)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-red-700 uppercase mb-2">Busiest (Peak Staffing)</div>
                                <div className="flex flex-wrap gap-2">
                                    {bestTimes?.busiest.map(h => <Badge key={h.time} className="bg-red-50 text-red-700 border border-red-200">{h.time}</Badge>)}
                                </div>
                            </div>
                        </Card>
                        <Card>
                            <h3 className="font-bold text-slate-800 mb-4">Weather Scenarios</h3>
                            <p className="text-xs text-slate-500 mb-4">At {weatherScenarios[0]?.hour}:</p>
                            <div className="space-y-3">
                                {weatherScenarios.map(s => (
                                    <div key={s.weather} className="flex items-center justify-between text-sm">
                                        <div className="font-medium w-16">{s.weather}</div>
                                        <div className="flex-1 mx-3 bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-brand-500 h-full" style={{width: `${Math.min(100, (s.footfall/100)*100)}%`}}></div>
                                        </div>
                                        <div className="w-24 text-right flex flex-col">
                                            <span className="font-bold">{Math.round(s.footfall)}</span>
                                            {s.weather !== 'Clear' && <span className={`text-[10px] ${s.pctChange < 0 ? 'text-red-500' : 'text-green-500'}`}>{s.pctChange}% vs Clear</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card className="bg-slate-50">
                            <h3 className="font-bold text-slate-800 mb-2 text-sm">Live vs Model</h3>
                            <p className="text-xs text-slate-600 mb-2">For the current hour, if sufficient user reports arrive, they override the AI prediction.</p>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="font-bold">Current hour source:</span>
                                {hourly.find(h=>h.isCurrent)?.isActual ? <Badge className="bg-blue-100 text-blue-800">Live Reports ({hourly.find(h=>h.isCurrent)?.voteCount} votes)</Badge> : <Badge className="bg-brand-100 text-brand-800">AI Forecast</Badge>}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                let peakHour = null;
                let avgRemFootfall = 0;
                let recText = "Normal day expected";
                let isHigh = false;
                
                if (dashData.remainderForecast.length > 0) {
                    avgRemFootfall = dashData.totalRemainderFootfall / dashData.remainderForecast.length;
                    peakHour = [...dashData.remainderForecast].sort((a,b) => b.footfall - a.footfall)[0];
                    if (peakHour.crowd === 'High') {
                        isHigh = true;
                        const pct = Math.round(((peakHour.footfall / avgRemFootfall) - 1) * 100 / 5) * 5;
                        const h12 = peakHour.hour % 12 === 0 ? 12 : peakHour.hour % 12;
                        const ampm = peakHour.hour >= 12 ? 'PM' : 'AM';
                        recText = `Prepare ${pct}% additional stock for the ${h12} ${ampm} peak.`;
                    }
                }

                // weather insight computation (just grab from forecast weatherScenarios if available)
                const rainScenario = forecastData.weatherScenarios.find(s => s.weather === 'Rain');
                const nextPeakLabel = rainScenario?.hour || "the peak hour";
                const rainPct = rainScenario?.pctChange || 0;

                return (
                    <div className="space-y-6 animate-fadeUp relative">
                        {loading && <div className="absolute inset-0 z-10 bg-white/70 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>}
                        {error && <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm">{error}</div>}
                        
                        {/* Alert Banner */}
                        {isHigh ? (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4">
                                <div className="bg-red-100 p-2 rounded-lg text-red-600 mt-1"><Target size={20} /></div>
                                <div>
                                    <h3 className="font-bold text-red-800 text-lg mb-1">🔴 HIGH CROWD EXPECTED TODAY</h3>
                                    <p className="text-red-700 text-sm mb-3">A peak period is detected later today based on current conditions.</p>
                                    <div className="inline-flex bg-white px-3 py-1.5 rounded-lg border border-red-100 text-sm font-semibold text-red-900">
                                        AI Recommendation: {recText}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-4">
                                <div className="bg-green-100 p-2 rounded-lg text-green-600 mt-1"><Target size={20} /></div>
                                <div>
                                    <h3 className="font-bold text-green-800 text-lg mb-1">🟢 NORMAL DAY EXPECTED</h3>
                                    <p className="text-green-700 text-sm">No major crowd surges detected for the rest of today.</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Quick Stats */}
                            {[
                                { icon: Users, label: "Current Status", val: vendorStall?.liveCrowd || "Medium", sub: "Live estimate" },
                                { icon: Clock, label: "Est. Wait Time", val: `${vendorStall?.liveWait || 15} min`, sub: "Currently updating" },
                                { icon: Zap, label: "Today's Reports", val: dashData.checkins?.total || 0, sub: "Customer check-ins" },
                                { icon: CloudRain, label: "Weather", val: `${weatherData.weather}`, sub: "Today's weather" },
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
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><AlignLeft size={18} className="text-brand-500" /> Check-in Data</h3>
                                <div className="text-4xl font-bold text-slate-800 mb-2">{dashData.checkins?.total || 0} <span className="text-sm font-medium text-slate-500">total reports today</span></div>
                                
                                {dashData.checkins?.total > 0 ? (
                                    <>
                                        <div className="flex bg-slate-100 h-3 rounded-full overflow-hidden mb-3">
                                            <div className="bg-green-500" style={{width: `${(dashData.checkins.counts.Low / dashData.checkins.total) * 100}%`}}></div>
                                            <div className="bg-amber-500" style={{width: `${(dashData.checkins.counts.Medium / dashData.checkins.total) * 100}%`}}></div>
                                            <div className="bg-red-500" style={{width: `${(dashData.checkins.counts.High / dashData.checkins.total) * 100}%`}}></div>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                                            <div className="text-green-700">Low ({dashData.checkins.counts.Low})</div>
                                            <div className="text-amber-700">Medium ({dashData.checkins.counts.Medium})</div>
                                            <div className="text-red-700">High ({dashData.checkins.counts.High})</div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-sm text-slate-400 mt-4">No reports yet today.</div>
                                )}
                            </Card>

                            <Card className="bg-gradient-to-br from-brand-900 to-brand-800 text-white border-0 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold flex items-center gap-2 mb-3"><CloudRain size={18} className="text-accent" /> AI Weather Insight</h3>
                                    <p className="text-sm text-brand-100 mb-4">
                                        If it rains at {nextPeakLabel}, expect about {Math.abs(rainPct)}% {rainPct < 0 ? 'fewer' : 'more'} customers based on model predictions.
                                    </p>
                                </div>
                                <Button variant="secondary" onClick={() => fetchWeeklyData(vendorStall)} className="w-full text-brand-900 font-bold border-0 hover:bg-white bg-brand-50 mt-4">View Weekly Impact</Button>
                            </Card>
                        </div>
                    </div>
                );

            case 'forecast':
                return renderForecastTab();

            case 'settings':
                return (
                    <div className="max-w-2xl mx-auto animate-fadeUp space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Alerts & Notifications</h2>
                            <p className="text-slate-500">Configure how and when VendorVision notifies you.</p>
                        </div>

                        <Card className="border-l-4 border-l-brand-500">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Mail className="text-brand-500" /> Automated Email Alerts</h3>
                                    <p className="text-sm text-slate-500">Sent to {user?.email || 'vendor@example.com'}</p>
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
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex relative">
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
                <div className="max-w-6xl mx-auto">
                    <VendorErrorBoundary>{renderContent()}</VendorErrorBoundary>
                </div>
            </main>

            {/* Weekly Impact Modal */}
            {weeklyImpactOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CloudRain className="text-brand-500" /> Weekly Rain Impact</h2>
                            <button onClick={() => setWeeklyImpactOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            {weeklyImpactData.loading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                    <div className="text-sm text-slate-500">Analyzing 7-day model predictions...</div>
                                </div>
                            ) : weeklyImpactData.error ? (
                                <div className="text-red-500 text-center py-8">{weeklyImpactData.error}</div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="bg-brand-50 p-4 rounded-xl flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-bold text-brand-900">Most Rain-Sensitive Day: <span className="text-xl ml-2">{weeklyImpactData.worstDay} ({weeklyImpactData.maxDrop}% drop)</span></div>
                                            <div className="text-sm text-brand-700 mt-1">Least affected day: {weeklyImpactData.bestDay}</div>
                                        </div>
                                    </div>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={weeklyImpactData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                                                <Legend />
                                                <Bar dataKey="clear" name="Clear Footfall" fill="#2E7A6A" radius={[4,4,0,0]} />
                                                <Bar dataKey="rain" name="Rain Footfall" fill="#94a3b8" radius={[4,4,0,0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <table className="w-full text-sm text-left border border-slate-100 rounded-xl overflow-hidden">
                                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                            <tr>
                                                <th className="px-4 py-3">Day</th>
                                                <th className="px-4 py-3">Clear Weather</th>
                                                <th className="px-4 py-3">Rain Weather</th>
                                                <th className="px-4 py-3">% Drop</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {weeklyImpactData.data.map(d => (
                                                <tr key={d.day}>
                                                    <td className="px-4 py-3 font-bold">{d.day}</td>
                                                    <td className="px-4 py-3">{d.clear}</td>
                                                    <td className="px-4 py-3">{d.rain}</td>
                                                    <td className="px-4 py-3 font-semibold text-red-500">{d.dropPct > 0 ? `-${d.dropPct}%` : `+${Math.abs(d.dropPct)}%`}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
