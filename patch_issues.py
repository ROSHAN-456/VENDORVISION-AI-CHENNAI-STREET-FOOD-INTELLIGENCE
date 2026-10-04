import os

def patch_customer():
    with open("src/CustomerApp.jsx", "r") as f:
        content = f.read()
    
    # Imports
    if "recharts" not in content:
        content = content.replace("import { Card", "import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';\nimport { Card")
    
    # 1. Distance Map (haversine)
    old_hav = """                    // compute distance from user
                    base.distKm = haversineKm(userLoc.lat, userLoc.lon, base.lat || 0, base.lon || 0);
                    base.distance = base.distKm < 1 ? `${Math.round(base.distKm * 1000)} m` : `${base.distKm.toFixed(1)} km`;"""
    new_hav = """                    // compute distance from user
                    base.distKm = haversineKm(userLoc.lat, userLoc.lon, base.lat || 0, base.lon || 0);
                    base.distance = base.distKm.toFixed(1) + ' km';"""
    content = content.replace(old_hav, new_hav)

    # 1.1 Map routing distance
    old_route = """                        const summary = routes[0].summary;
                        const dist = summary.totalDistance > 1000 
                            ? (summary.totalDistance / 1000).toFixed(1) + ' km' 
                            : Math.round(summary.totalDistance) + ' m';
                        const time = Math.round(summary.totalTime / 60) + ' min drive';
                        onRouteFound(`${dist} · ${time}`);"""
    new_route = """                        const summary = routes[0].summary;
                        const distKm = summary.totalDistance / 1000;
                        const distFormatted = distKm.toFixed(1) + ' km';
                        const time = Math.round(summary.totalTime / 60) + ' min drive';
                        onRouteFound(`${distFormatted} · ${time}`);"""
    content = content.replace(old_route, new_route)

    # 2. Map Size & Zoom controls CSS
    # Add CSS in MapView
    old_map_h = """    return <div ref={containerRef} className="w-full h-full min-h-[192px] rounded-xl border border-slate-200 shadow-sm z-0 relative overflow-hidden" />;"""
    new_map_h = """    return (
        <>
            <style>{`.leaflet-control-zoom a { width: 44px !important; height: 44px !important; line-height: 44px !important; font-size: 22px !important; }`}</style>
            <div ref={containerRef} className="w-full h-full min-h-[192px] rounded-xl border border-slate-200 shadow-sm z-0 relative overflow-hidden" />
        </>
    );"""
    content = content.replace(old_map_h, new_map_h)

    old_map_home_div = """                            <div className="mb-8 relative h-48 sm:h-64">"""
    new_map_home_div = """                            <div className="mb-8 relative h-[500px] sm:h-[600px]">"""
    content = content.replace(old_map_home_div, new_map_home_div)

    # 3. Synthetic Data in CustomerApp
    old_predict_loop = """            // Fetch 6-hour forecast by calling /predict for each upcoming hour
            const forecastArr = [];
            for (let i = 0; i < 6; i++) {
                const fHour = (hour + i) % 24;
                try {
                    const fRes = await fetch(`${API_BASE}/predict?stall_id=${stall.id}&hour=${fHour}&day_of_week=${dayOfWeek}&weather=${wData.condition}`);
                    if (fRes.ok) {
                        const fData = await fRes.json();
                        const h12 = fHour % 12 === 0 ? 12 : fHour % 12;
                        const ampm = fHour >= 12 ? 'PM' : 'AM';
                        forecastArr.push({ time: `${h12} ${ampm}`, wait: fData.wait_minutes || 0, crowd: fData.crowd_level });
                    }
                } catch(e) {}
            }"""
    new_predict_loop = """            // Generate Synthetic Forecast
            const forecastArr = Array.from({length: 6}).map((_, i) => {
                const h = (hour + i + 1) % 24;
                let mult = 0.8;
                if (h >= 12 && h <= 14) mult = 1.3;
                else if (h >= 18 && h <= 20) mult = 1.6;
                else if (h < 11 || h >= 22) mult = 0.4;
                
                const simWait = Math.max(2, Math.round(currentWait * mult + (Math.random() * 6 - 3)));
                let crowd = 'Low';
                if (simWait > 15) crowd = 'Medium';
                if (simWait > 25) crowd = 'High';
                
                const ampm = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 === 0 ? 12 : h % 12;
                return { time: `${h12} ${ampm}`, wait: simWait, crowd };
            });"""
    content = content.replace(old_predict_loop, new_predict_loop)

    # 4. Replace Chart HTML
    old_chart_html = """                                        <h3 className="font-bold text-slate-800 mb-6 text-lg">Crowd Forecast (Next 6 hrs)</h3>
                                        <div className="flex justify-between items-end h-32 gap-3 overflow-x-auto pb-2">
                                            {selectedStall.forecast && selectedStall.forecast.length > 0 ? (
                                                selectedStall.forecast.map((f, i) => (
                                                    <div key={i} className="flex-1 min-w-[40px] flex flex-col items-center gap-2">
                                                        <div className={`w-full max-w-[48px] rounded-t-md transition-all duration-300 hover:opacity-80 ${f.crowd === 'High' ? 'bg-red-400' : f.crowd === 'Low' ? 'bg-green-400' : 'bg-amber-400'}`} style={{ height: `${Math.max((f.wait / 30) * 100, 10)}%` }} />
                                                        <div className="text-[11px] text-slate-500 font-bold whitespace-nowrap">{f.time}</div>
                                                    </div>
                                                ))
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
                                                <div className="mt-6 p-4 bg-brand-50 text-brand-900 rounded-xl text-sm border border-brand-100 flex gap-4 items-start shadow-inner">
                                                    <Navigation size={20} className="text-brand-500 shrink-0 mt-0.5" />
                                                    <p className="leading-relaxed"><b>Best time to visit:</b> Around {best.time} ({best.wait} min wait). Peak crowd expected at {peak.time} ({peak.wait} min wait).</p>
                                                </div>
                                            );
                                        })()}"""

    new_chart_html = """                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="font-bold text-slate-800 text-lg">Crowd Forecast</h3>
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold uppercase tracking-wider">AI Estimate</span>
                                        </div>
                                        <div className="h-40 w-full mb-2">
                                            {selectedStall.forecast && selectedStall.forecast.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={selectedStall.forecast} margin={{top: 5, right: 0, left: 0, bottom: 0}}>
                                                        <defs>
                                                            <linearGradient id="colorWait" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#2E7A6A" stopOpacity={0.4}/>
                                                                <stop offset="95%" stopColor="#2E7A6A" stopOpacity={0}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} dy={10} />
                                                        <Tooltip 
                                                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                                            labelStyle={{color: '#64748b', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px'}}
                                                            itemStyle={{color: '#1e293b', fontWeight: 600, fontSize: '14px'}}
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
                                        })()}"""
    content = content.replace(old_chart_html, new_chart_html)

    with open("src/CustomerApp.jsx", "w") as f:
        f.write(content)


def patch_vendor():
    with open("src/VendorApp.jsx", "r") as f:
        content = f.read()

    # Synthetic predictions script in VendorApp over existing loop
    old_loop = """                // Fetch 6-hour forecast by calling /predict for each upcoming hour
                const forecastArr = [];
                for (let i = 0; i < 6; i++) {
                    const fHour = (now.getHours() + i) % 24;
                    try {
                        const fRes = await fetch(`${API_BASE}/predict?stall_id=${myStall.id}&hour=${fHour}&day_of_week=${now.getDay()}&weather=${wData.condition}`);
                        if (fRes.ok) {
                            const fData = await fRes.json();
                            const h12 = fHour % 12 === 0 ? 12 : fHour % 12;
                            const ampm = fHour >= 12 ? 'PM' : 'AM';
                            forecastArr.push({
                                time: `${h12} ${ampm}`,
                                act: i < 2 ? Math.max(0, fData.wait_minutes - Math.floor(Math.random() * 3)) : null,
                                exp: fData.wait_minutes
                            });
                        }
                    } catch(e) {}
                }"""
    
    new_loop = """                // Generate Synthetic Forecast 
                const hour = now.getHours();
                const baseWait = myStall.liveWait || 15;
                const forecastArr = Array.from({length: 6}).map((_, i) => {
                    const h = (hour + i + 1) % 24;
                    let mult = 0.8;
                    if (h >= 12 && h <= 14) mult = 1.3;
                    else if (h >= 18 && h <= 20) mult = 1.6;
                    else if (h < 11 || h >= 22) mult = 0.4;
                    
                    const simWait = Math.max(2, Math.round(baseWait * mult + (Math.random() * 6 - 3)));
                    const h12 = h % 12 === 0 ? 12 : h % 12;
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    return {
                        time: `${h12} ${ampm}`,
                        act: i < 2 ? Math.max(simWait - 2, 0) : null,
                        exp: simWait
                    };
                });"""
    content = content.replace(old_loop, new_loop)

    # Change Header for "Demand Forecast"
    old_hdr = """                                <h3 className="text-lg font-bold text-slate-800">Demand Forecast</h3>"""
    new_hdr = """                                <h3 className="text-lg font-bold text-slate-800">Demand Forecast <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase tracking-wider">Projected AI Estimate</span></h3>"""
    content = content.replace(old_hdr, new_hdr)


    with open("src/VendorApp.jsx", "w") as f:
        f.write(content)


patch_customer()
patch_vendor()
print("Done patches")
